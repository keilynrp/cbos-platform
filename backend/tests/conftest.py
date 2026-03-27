"""
Test fixtures for CBOS integration tests.

Strategy: real PostgreSQL (cbos_test DB), each test wrapped in a transaction
that is rolled back — no mocks, no data leakage between tests.

Run inside Docker:
    docker compose exec backend pytest tests/ -v --tb=short
"""

import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.core.deps import get_current_user, get_current_workspace_id
from app.core.security import create_access_token
from app.main import app
from app.modules.identity.models import Organization, Person, User, Workspace

# Test DB — defaults to same postgres host, separate database
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://cbos:cbos_dev_pass@postgres:5432/cbos_test",
)

# Import all models so Base.metadata is populated
from app.modules.crm.models import Activity, Lead, Opportunity  # noqa: F401
from app.modules.sales.models import Quote, QuoteLine, SalesOrder, SalesOrderLine  # noqa: F401
from app.modules.inventory.models import InventoryItem, Product, ProductCategory, StockMovement  # noqa: F401
from app.modules.portal.models import PortalSession  # noqa: F401
from app.modules.discovery.models import DiscoveryMessage, DiscoverySession  # noqa: F401
from app.modules.workflows.models import Workflow, WorkflowRun  # noqa: F401
from app.modules.accounting.models import Invoice, InvoiceLine, Payment  # noqa: F401


# ── Ensure test database exists ───────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session", autouse=True)
async def ensure_test_db():
    """Creates the cbos_test database if it doesn't exist."""
    import asyncpg
    from urllib.parse import urlparse

    parsed = urlparse(TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
    host = parsed.hostname
    port = parsed.port or 5432
    user = parsed.username
    password = parsed.password
    dbname = parsed.path.lstrip("/")

    try:
        conn = await asyncpg.connect(
            host=host, port=port, user=user, password=password, database="postgres"
        )
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", dbname
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{dbname}"')
        await conn.close()
    except Exception as e:
        # If we can't connect to postgres admin DB, skip — test DB may already exist
        print(f"Warning: could not ensure test DB: {e}")


# ── Session-scoped engine & schema ────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def test_engine(ensure_test_db):
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ── Per-test transaction rollback ─────────────────────────────────────────────

@pytest_asyncio.fixture
async def db(test_engine):
    """AsyncSession wrapped in a transaction that is rolled back after each test."""
    async with test_engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        yield session
        await session.close()
        await conn.rollback()


# ── Workspace + User fixtures ─────────────────────────────────────────────────

@pytest_asyncio.fixture
async def workspace(db: AsyncSession) -> Workspace:
    ws = Workspace(
        name="Test Corp",
        slug="test-corp",
        active_modules=["crm", "sales", "inventory"],
    )
    db.add(ws)
    await db.flush()
    return ws


@pytest_asyncio.fixture
async def test_user(db: AsyncSession, workspace: Workspace) -> User:
    from app.core.security import hash_password

    person = Person(
        workspace_id=workspace.id,
        full_name="Test Owner",
        email="owner@test.corp",
        role_labels=["owner"],
    )
    db.add(person)
    await db.flush()

    user = User(
        workspace_id=workspace.id,
        person_id=person.id,
        email="owner@test.corp",
        hashed_password=hash_password("testpassword123"),
        role="admin",
        is_owner=True,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict:
    token = create_access_token({
        "sub": test_user.id,
        "workspace_id": test_user.workspace_id,
        "role": test_user.role,
    })
    return {"Authorization": f"Bearer {token}"}


# ── HTTP client with DI overrides ─────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(db: AsyncSession, test_user: User) -> AsyncClient:
    """AsyncClient with DB and auth dependencies overridden to use test session."""

    async def _override_db():
        yield db

    async def _override_user():
        return test_user

    async def _override_workspace():
        return test_user.workspace_id

    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_workspace_id] = _override_workspace

    # Override get_db only for modules that use it directly
    from app.core.database import get_db
    app.dependency_overrides[get_db] = _override_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
