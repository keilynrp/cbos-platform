#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-local-ssl.sh
# Genera certificados TLS de confianza local para desarrollo con mkcert.
# Solo necesitas ejecutarlo una vez (o cuando reinstales el sistema).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$REPO_ROOT/certs"

echo "═══════════════════════════════════════════"
echo "  CBOS — Setup SSL local con mkcert"
echo "═══════════════════════════════════════════"

# ── 1. Verificar mkcert ──────────────────────────────────────────────────────
if ! command -v mkcert &>/dev/null; then
  echo ""
  echo "❌ mkcert no está instalado. Instálalo primero:"
  echo ""
  echo "  macOS:    brew install mkcert"
  echo "  Ubuntu:   sudo apt install mkcert"
  echo "  Windows:  winget install FiloSottile.mkcert"
  echo "            (o: choco install mkcert)"
  echo ""
  echo "  Luego vuelve a ejecutar este script."
  exit 1
fi

echo "✓ mkcert encontrado: $(mkcert --version)"

# ── 2. Instalar CA raíz local ────────────────────────────────────────────────
echo ""
echo "→ Instalando CA raíz de mkcert en el sistema..."
mkcert -install
echo "✓ CA raíz instalada (navegadores ya confían en ella)"

# ── 3. Generar certificados ──────────────────────────────────────────────────
mkdir -p "$CERT_DIR"

echo ""
echo "→ Generando certificados para localhost / 127.0.0.1..."
mkcert \
  -cert-file "$CERT_DIR/localhost.pem" \
  -key-file  "$CERT_DIR/localhost-key.pem" \
  localhost 127.0.0.1 ::1

echo ""
echo "✓ Certificados generados en certs/"
echo "    certs/localhost.pem"
echo "    certs/localhost-key.pem"

# ── 4. Instrucciones finales ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  Listo. Levanta el entorno con:"
echo ""
echo "    docker compose up -d"
echo ""
echo "  Accede a:"
echo "    https://localhost       → Frontend"
echo "    https://localhost/api   → Backend API"
echo ""
echo "  Los puertos HTTP siguen disponibles:"
echo "    http://localhost:8101   → Frontend"
echo "    http://localhost:8100   → Backend"
echo "═══════════════════════════════════════════"
