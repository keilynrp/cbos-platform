#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting CBOS API server..."
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
