#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting CBOS API server..."

# Si alguien define un `command`, ese gana: es la semantica normal de Docker
# para ENTRYPOINT mas CMD, y sin esta rama el script lo descartaba en silencio.
# Ninguno de los compose del repositorio lo usa hoy —el arranque vive entero
# aqui abajo, que es lo que evita que un `command` desactualizado vuelva a
# romper la recarga sin que nadie lo note— asi que en la practica el flujo
# siempre continua debajo. Queda como escape hatch para arrancar la imagen con
# otro comando sin reconstruirla.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ "${ENVIRONMENT}" = "production" ]; then
  exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --proxy-headers \
    --forwarded-allow-ips "*" \
    --log-level warning
else
  # --reload solo tiene sentido con el codigo bind-mounted (docker-compose.yml
  # monta ./backend en /app). RELOAD=0 lo desactiva sin tocar la imagen.
  if [ "${RELOAD:-1}" = "0" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000
  fi
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/app
fi
