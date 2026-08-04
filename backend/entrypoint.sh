#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting CBOS API server..."

# Si el compose define un `command`, ese gana. docker-compose.yml pasa
# `uvicorn ... --reload` para desarrollo y sin esta rama el ENTRYPOINT lo
# descartaba en silencio: el codigo montado en /app se veia actualizado pero
# uvicorn nunca lo reimportaba, asi que la app servia codigo viejo hasta
# reiniciar el contenedor. Los tests no lo notaban porque pytest arranca
# procesos nuevos. docker-compose.prod.yml no define `command`, de modo que
# produccion sigue cayendo en la rama de abajo.
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
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
