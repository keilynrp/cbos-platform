#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# restore-db.sh — Restaurar PostgreSQL desde un backup
# Uso:  ./scripts/restore-db.sh <archivo.sql.gz>
# ADVERTENCIA: esto REEMPLAZA la base de datos actual.
# ═══════════════════════════════════════════════════════════
set -euo pipefail

BACKUP_FILE="${1:?Uso: $0 <archivo.sql.gz>}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: no existe el archivo '${BACKUP_FILE}'"
  exit 1
fi

# Cargar variables de entorno si existe .env.prod
ENV_FILE="$(dirname "$0")/../.env.prod"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

: "${POSTGRES_DB:?POSTGRES_DB no definido}"
: "${POSTGRES_USER:?POSTGRES_USER no definido}"

echo "[$(date)] Restaurando ${POSTGRES_DB} desde ${BACKUP_FILE}..."
echo "ADVERTENCIA: esto eliminará los datos actuales."
read -r -p "¿Continuar? [s/N] " confirm
[[ "$confirm" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 0; }

COMPOSE="docker compose -f $(dirname "$0")/../docker-compose.prod.yml"

# Terminar conexiones activas y recrear la DB
$COMPOSE exec -T postgres psql -U "$POSTGRES_USER" postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" \
  -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"

# Restaurar
gunzip -c "$BACKUP_FILE" | $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "[$(date)] Restauración completada."
