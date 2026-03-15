#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# backup-db.sh — Backup de PostgreSQL desde el contenedor
# Uso:  ./scripts/backup-db.sh [directorio_destino]
# Ejemplo cron: 0 2 * * * /opt/cbos/scripts/backup-db.sh /backups/cbos
# ═══════════════════════════════════════════════════════════
set -euo pipefail

BACKUP_DIR="${1:-/tmp/cbos-backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/cbos_${TIMESTAMP}.sql.gz"

# Cargar variables de entorno si existe .env.prod
ENV_FILE="$(dirname "$0")/../.env.prod"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

: "${POSTGRES_DB:?POSTGRES_DB no definido}"
: "${POSTGRES_USER:?POSTGRES_USER no definido}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup de ${POSTGRES_DB}..."

docker compose -f "$(dirname "$0")/../docker-compose.prod.yml" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup completado: ${BACKUP_FILE} (${SIZE})"

# Rotar backups: mantener sólo los últimos 7
find "$BACKUP_DIR" -name "cbos_*.sql.gz" -mtime +7 -delete
echo "[$(date)] Backups antiguos eliminados (retención: 7 días)"
