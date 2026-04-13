from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import CBOSException, cbos_exception_handler
from app.core.middleware import CorrelationIDMiddleware
from app.events.bus import close as close_redis
from app.modules.workflows.consumer import start_consumer, stop_consumer
from app.modules.notifications.email_notifier import run_email_notifier
from app.modules.accounting.invoice_consumer import start_invoice_consumer, stop_invoice_consumer
from app.modules.accounting.overdue_scanner import run_overdue_scanner
from app.modules.workflows.router import router as workflows_router
from app.modules.crm.router import router as crm_router
from app.modules.identity.router import router as identity_router
from app.modules.inventory.router import router as inventory_router
from app.modules.portal.router import public_router as portal_public_router
from app.modules.portal.router import router as portal_router
from app.modules.sales.router import router as sales_router
from app.modules.discovery.router import router as discovery_router
from app.modules.notifications.router import router as notifications_router
from app.modules.accounting.router import router as accounting_router
from app.modules.analytics.router import router as analytics_router
from app.modules.contracts.router import router as contracts_router
from app.modules.projects.router import router as projects_router
from app.modules.hr.router import employees_router, departments_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import asyncio
    start_consumer()
    start_invoice_consumer()
    email_task = asyncio.create_task(run_email_notifier())
    overdue_task = asyncio.create_task(run_overdue_scanner())
    yield
    # Shutdown
    overdue_task.cancel()
    email_task.cancel()
    await stop_invoice_consumer()
    await stop_consumer()
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIDMiddleware)
app.add_exception_handler(CBOSException, cbos_exception_handler)

# ── Routers ────────────────────────────────────────────────
app.include_router(identity_router, prefix=settings.api_prefix, tags=["Identity & Auth"])
app.include_router(crm_router, prefix=settings.api_prefix)
app.include_router(sales_router, prefix=settings.api_prefix)
app.include_router(inventory_router, prefix=settings.api_prefix)
app.include_router(portal_router, prefix=settings.api_prefix)
app.include_router(portal_public_router, prefix=settings.api_prefix)  # no-auth public routes
app.include_router(discovery_router, prefix=settings.api_prefix)
app.include_router(workflows_router, prefix=settings.api_prefix)
app.include_router(notifications_router, prefix=settings.api_prefix)
app.include_router(accounting_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)
app.include_router(contracts_router, prefix=settings.api_prefix)
app.include_router(projects_router, prefix=settings.api_prefix)
app.include_router(employees_router, prefix=settings.api_prefix)
app.include_router(departments_router, prefix=settings.api_prefix)


# ── Health check ───────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/", tags=["System"])
async def root():
    return {"message": f"Welcome to {settings.app_name}", "docs": "/docs"}
