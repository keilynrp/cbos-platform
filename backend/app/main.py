from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.events.bus import close as close_redis
from app.modules.crm.router import router as crm_router
from app.modules.identity.router import router as identity_router
from app.modules.inventory.router import router as inventory_router
from app.modules.sales.router import router as sales_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
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

# ── Routers ────────────────────────────────────────────────
app.include_router(identity_router, prefix=settings.api_prefix, tags=["Identity & Auth"])
app.include_router(crm_router, prefix=settings.api_prefix)
app.include_router(sales_router, prefix=settings.api_prefix)
app.include_router(inventory_router, prefix=settings.api_prefix)


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
