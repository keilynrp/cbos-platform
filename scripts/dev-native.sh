#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# CBOS — Desarrollo nativo (modelo "deps en Docker, app nativa")
#
# Solo postgres y redis corren en contenedores. Backend y frontend corren
# como procesos nativos en WSL. Es el mismo modelo que usa el CI
# (.github/workflows/ci.yml), y elimina los bind mounts NTFS→WSL que son
# el cuello de botella real en esta máquina.
#
#   ./scripts/dev-native.sh deps       Levanta postgres + redis
#   ./scripts/dev-native.sh backend    Migra y arranca uvicorn  :8100
#   ./scripts/dev-native.sh frontend   Arranca Vite             :8101
#   ./scripts/dev-native.sh all        deps + backend + frontend
#   ./scripts/dev-native.sh stop       Detiene los contenedores
#
# Recomendado: 'deps' una vez, luego 'backend' y 'frontend' en terminales
# separadas — con 2 núcleos físicos, ver los logs sin entremezclar ayuda.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Colores (se desactivan si no hay TTY) ─────────────────────────────────
if [ -t 1 ]; then
  C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_DIM=$'\033[2m'; C_OFF=$'\033[0m'
else
  C_OK=''; C_WARN=''; C_ERR=''; C_DIM=''; C_OFF=''
fi
info() { printf '%s▶%s %s\n' "$C_OK" "$C_OFF" "$*"; }
warn() { printf '%s!%s %s\n' "$C_WARN" "$C_OFF" "$*" >&2; }
die()  { printf '%s✗%s %s\n' "$C_ERR" "$C_OFF" "$*" >&2; exit 1; }

# ── Cargar puertos y credenciales desde el .env raíz ──────────────────────
[ -f .env ] || die "No existe .env en la raíz. Copia .env.example a .env."
# El .env fue creado en Windows y tiene CRLF. Sourcearlo tal cual falla en
# Linux ($'\r': command not found), asi que quitamos los CR al vuelo sin
# modificar el archivo del usuario.
set -a; . <(tr -d '\r' < ./.env); set +a

BACKEND_PORT="${BACKEND_PORT:-8100}"
FRONTEND_PORT="${FRONTEND_PORT:-8101}"
POSTGRES_USER="${POSTGRES_USER:-cbos}"
POSTGRES_DB="${POSTGRES_DB:-cbos_dev}"

# ── Aviso: el repo vive en el filesystem de Windows ───────────────────────
# Cruzar /mnt/* va por 9p y cuesta ~10× más que ext4 nativo. Es un aviso,
# no un error: el script funciona igual, solo que más lento.
case "$REPO_ROOT" in
  /mnt/*)
    warn "El repo está en el filesystem de Windows ($REPO_ROOT)."
    warn "Para I/O nativo, clónalo dentro de WSL (ej. ~/cbos-platform)."
    ;;
esac

# ── Guarda: backend/frontend requieren Linux ──────────────────────────────
# En Git Bash / MSYS el venv vive en .venv/Scripts, no en .venv/bin, y el
# runtime seria Python/Node de Windows — justo lo que este flujo evita.
# 'deps' si funciona en cualquier shell: solo invoca docker compose.
require_linux() {
  case "$(uname -s)" in
    Linux) return 0 ;;
    *)
      # Git Bash ve D: como /d/...; dentro de WSL la misma ruta es /mnt/d/...
      local wsl_path
      wsl_path="$(printf '%s' "$REPO_ROOT" | sed -E 's#^/([a-zA-Z])/#/mnt/\1/#')"
      printf '%s✗%s "%s" requiere ejecutarse dentro de WSL, no en %s.\n' \
        "$C_ERR" "$C_OFF" "$1" "$(uname -s)" >&2
      printf '\n  wsl -d Ubuntu\n  cd %s\n  ./scripts/dev-native.sh %s\n\n' \
        "$wsl_path" "$1" >&2
      printf 'El modo "deps" si funciona desde este shell.\n' >&2
      exit 1
      ;;
  esac
}

# ── deps ──────────────────────────────────────────────────────────────────
cmd_deps() {
  command -v docker >/dev/null 2>&1 || die "docker no está en el PATH."
  info "Levantando postgres + redis (sin backend/frontend/nginx)…"
  docker compose up -d postgres redis

  info "Esperando a que postgres acepte conexiones…"
  local i
  for i in $(seq 1 60); do
    if docker compose exec -T postgres \
         pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      info "postgres listo en localhost:${POSTGRES_PORT:-5433}"
      info "redis    listo en localhost:${REDIS_PORT:-6380}"
      return 0
    fi
    sleep 1
  done
  die "postgres no respondió tras 60s. Revisa: docker compose logs postgres"
}

# ── backend ───────────────────────────────────────────────────────────────
cmd_backend() {
  require_linux backend
  cd "$REPO_ROOT/backend"
  [ -f .env ] || die "Falta backend/.env (config del runtime nativo)."

  # El Dockerfile y el CI usan Python 3.12. En Ubuntu 24.04 'python3' puede
  # apuntar a 3.13, asi que preferimos el 3.12 explicito para igualar prod.
  local py
  if command -v python3.12 >/dev/null 2>&1; then
    py=python3.12
  else
    py=python3
    warn "python3.12 no encontrado — usando $($py --version 2>&1)."
    warn "El Dockerfile y el CI usan 3.12; puede haber diferencias."
  fi

  # Comprobamos el interprete, no el directorio: un venv a medias (p.ej. si
  # falta el paquete ${py}-venv) deja el directorio creado pero inservible,
  # y el siguiente arranque fallaria de forma confusa al hacer activate.
  if [ ! -x .venv/bin/python ]; then
    if [ -d .venv ]; then
      warn "venv incompleto o corrupto — recreando desde cero."
      rm -rf .venv
    fi
    info "Creando virtualenv en backend/.venv con $py…"
    if ! "$py" -m venv .venv; then
      rm -rf .venv
      die "No se pudo crear el venv. Falta ensurepip: sudo apt install ${py}-venv"
    fi
  fi
  # shellcheck disable=SC1091
  . .venv/bin/activate

  # Reinstala solo si requirements.txt cambió desde la última vez.
  local stamp=".venv/.requirements.sha"
  local current
  current="$(sha256sum requirements.txt | cut -d' ' -f1)"
  if [ ! -f "$stamp" ] || [ "$(cat "$stamp")" != "$current" ]; then
    info "Instalando dependencias Python…"
    pip install --quiet --upgrade pip
    pip install --quiet -r requirements.txt
    printf '%s' "$current" > "$stamp"
  else
    printf '%s  deps Python al día — omitiendo pip install%s\n' "$C_DIM" "$C_OFF"
  fi

  info "Aplicando migraciones (alembic upgrade head)…"
  alembic upgrade head

  info "uvicorn en http://localhost:${BACKEND_PORT}  (docs: /docs)"
  exec uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
}

# ── frontend ──────────────────────────────────────────────────────────────
cmd_frontend() {
  require_linux frontend
  cd "$REPO_ROOT/composable-os"

  # nvm solo se carga en shells de login (via .bashrc). Lo cargamos siempre que
  # exista, no solo cuando falta npm: Ubuntu trae un Node 18 del sistema que
  # gana en el PATH y es demasiado antiguo, asi que nvm tiene que imponerse.
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
  fi
  command -v npm >/dev/null 2>&1 || die "npm no está en el PATH (instala Node 20 en WSL)."

  # Vite 7 exige Node >= 20.19; con 18 falla de forma poco clara.
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$major" -lt 20 ]; then
    die "Node $(node --version) es demasiado antiguo. Vite 7 requiere >= 20.19 (nvm install 20)."
  fi

  # npm ci solo cuando package-lock.json es más nuevo que node_modules —
  # a diferencia del contenedor, que reinstalaba en cada arranque.
  if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
    info "Instalando dependencias Node (npm ci)…"
    npm ci
    touch node_modules
  else
    printf '%s  deps Node al día — omitiendo npm ci%s\n' "$C_DIM" "$C_OFF"
  fi

  # El código lee VITE_API_URL y hace fetch directo al backend.
  # CORS lo permite vía ALLOWED_ORIGINS en backend/.env. Sin nginx de por medio.
  export VITE_API_URL="http://localhost:${BACKEND_PORT}/api/v1"

  info "Vite en http://localhost:${FRONTEND_PORT}  (API → :${BACKEND_PORT})"
  exec npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
}

# ── all ───────────────────────────────────────────────────────────────────
cmd_all() {
  cmd_deps
  local pids=()
  # Al salir (Ctrl-C incluido), baja ambos procesos hijos.
  trap 'trap - INT TERM EXIT; kill "${pids[@]}" 2>/dev/null || true' INT TERM EXIT

  ( cmd_backend ) &  pids+=($!)
  ( cmd_frontend ) & pids+=($!)

  warn "backend y frontend comparten esta terminal — los logs se entremezclan."
  wait
}

cmd_stop() {
  info "Deteniendo contenedores…"
  docker compose stop postgres redis
}

case "${1:-}" in
  deps)     cmd_deps ;;
  backend)  cmd_backend ;;
  frontend) cmd_frontend ;;
  all)      cmd_all ;;
  stop)     cmd_stop ;;
  *)
    sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
