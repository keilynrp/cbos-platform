# CBOS Platform — Guía de Despliegue en Dokploy

## Requisitos previos

- VPS con Ubuntu 22.04+ (mínimo 2 GB RAM, 20 GB disco)
- Dokploy instalado (`curl -sSL https://dokploy.com/install.sh | sh`)
- Dominio apuntando al servidor (DNS A record)
- Repositorio en GitHub/GitLab

---

## 1. Preparar el repositorio

```bash
# Clonar (si aún no está en git)
git init
git remote add origin https://github.com/tu-usuario/cbos-platform.git
git add .
git commit -m "feat: initial production setup"
git push -u origin main
```

---

## 2. Configurar el proyecto en Dokploy

1. Abrir el panel de Dokploy (`http://<IP-servidor>:3000`)
2. **Create Project** → nombre: `cbos-platform`
3. **Add Service** → **Docker Compose**
4. En **Source**:
   - Proveedor: GitHub / GitLab
   - Repositorio: `tu-usuario/cbos-platform`
   - Branch: `main`
   - Compose file: `docker-compose.prod.yml`

---

## 3. Variables de entorno

En Dokploy, ir a **Environment** del servicio y añadir (copiar de `.env.prod.example`):

| Variable | Valor |
|---|---|
| `POSTGRES_DB` | `cbos_prod` |
| `POSTGRES_USER` | `cbos` |
| `POSTGRES_PASSWORD` | *(contraseña segura)* |
| `REDIS_PASSWORD` | *(contraseña segura)* |
| `SECRET_KEY` | *(32+ chars aleatorios)* |
| `FRONTEND_DOMAIN` | `app.miempresa.com` |
| `API_DOMAIN` | `app.miempresa.com` |
| `FROM_EMAIL` | `no-reply@miempresa.com` |
| `SMTP_HOST` | *(tu proveedor SMTP)* |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | *(usuario SMTP)* |
| `SMTP_PASSWORD` | *(contraseña SMTP)* |
| `ANTHROPIC_API_KEY` | `sk-ant-...` *(opcional)* |

> Generar SECRET_KEY: `openssl rand -hex 32`

---

## 4. Configurar dominios en Dokploy

Dokploy incluye Traefik como reverse proxy. Configurar en **Domains**:

| Servicio | Dominio | Puerto |
|---|---|---|
| `frontend` | `app.miempresa.com` | `80` |
| `backend` | `app.miempresa.com` | `8000` |

Para separar API en subdominio:

| Servicio | Dominio | Puerto |
|---|---|---|
| `frontend` | `app.miempresa.com` | `80` |
| `backend` | `api.miempresa.com` | `8000` |

Dokploy gestionará el certificado SSL/TLS automáticamente via Let's Encrypt.

---

## 5. Primer despliegue

1. En Dokploy, clic en **Deploy**
2. Verificar los logs de cada contenedor
3. Ejecutar migraciones de base de datos:

```bash
# En el servidor, desde el directorio del proyecto
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

O desde Dokploy: **Console** del servicio `backend` → ejecutar el comando.

4. Crear el primer usuario administrador:

```bash
docker compose -f docker-compose.prod.yml exec backend python -c "
import asyncio
from app.db.session import AsyncSessionLocal
from app.modules.identity.service import create_user
from app.modules.identity.schemas import UserCreate

async def main():
    async with AsyncSessionLocal() as db:
        user = await create_user(db, UserCreate(
            email='admin@miempresa.com',
            password='cambiar_esto',
            full_name='Administrador'
        ))
        print(f'Usuario creado: {user.email}')

asyncio.run(main())
"
```

---

## 6. Actualizaciones (CI/CD)

Con GitHub Actions configurado, cada push a `main`:
1. CI corre tests y build
2. Si pasa, Dokploy detecta el nuevo commit (webhook) y redespliega automáticamente

Para configurar el webhook en Dokploy:
- **Settings** → **Webhooks** → copiar la URL
- En GitHub: **Settings** → **Webhooks** → añadir la URL de Dokploy

---

## 7. Backups automáticos

Configurar cron en el servidor:

```bash
# Editar crontab
crontab -e

# Backup diario a las 2am, retención 7 días
0 2 * * * /opt/cbos/scripts/backup-db.sh /backups/cbos >> /var/log/cbos-backup.log 2>&1
```

Para restaurar:

```bash
./scripts/restore-db.sh /backups/cbos/cbos_20260315_020000.sql.gz
```

---

## 8. Monitoreo

```bash
# Estado de los contenedores
docker compose -f docker-compose.prod.yml ps

# Logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend

# Health check
curl https://app.miempresa.com/health
# Esperado: {"status":"ok","version":"...","environment":"production"}
```

---

## 9. Rollback

Si un despliegue falla, en Dokploy:
1. **Deployments** → seleccionar el despliegue anterior → **Redeploy**

O manualmente:

```bash
git revert HEAD
git push origin main
```

---

## 10. Estructura de puertos internos

| Servicio | Puerto interno | Expuesto al exterior |
|---|---|---|
| PostgreSQL | 5432 | ❌ solo red interna |
| Redis | 6379 | ❌ solo red interna |
| Backend (uvicorn) | 8000 | ✅ vía Traefik |
| Frontend (nginx) | 80 | ✅ vía Traefik |

---

## Troubleshooting

**Backend no conecta a PostgreSQL:**
```bash
docker compose -f docker-compose.prod.yml exec backend python -c \
  "import asyncio; from app.db.session import AsyncSessionLocal; \
   asyncio.run(AsyncSessionLocal().__aenter__())" && echo "OK"
```

**Redis no responde:**
```bash
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli -a "$REDIS_PASSWORD" ping
# Esperado: PONG
```

**Migraciones pendientes:**
```bash
docker compose -f docker-compose.prod.yml exec backend alembic current
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```
