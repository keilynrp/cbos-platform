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
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
