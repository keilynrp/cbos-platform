"""
Test fixtures for CBOS integration tests.

Strategy: real PostgreSQL (cbos_test DB), row cleanup before each test.

Why not per-test transaction rollback:
  asyncpg doesn't support concurrent operations on the same connection.
  HTTP requests via AsyncClient go through a different async context than the
  fixture db session, causing "another operation is in progress" with shared
  connections. Using independent sessions + row cleanup is simpler and reliable.

Run inside Docker:
    docker compose exec backend pytest tests/ -v --tb=short
"""

import asyncio
import inspect
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.database import Base
from app.core.deps import get_current_user, get_current_workspace_id
from app.core.security import create_access_token
from app.main import app
from app.modules.identity.models import Organization, Person, PublicSite, User, Workspace

# Test DB — defaults to same postgres host, separate database
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://cbos:cbos_dev_pass@postgres:5432/cbos_test",
)

# Import all models so Base.metadata is fully populated
from app.modules.crm.models import Activity, Lead, Opportunity, PublicLeadSubmission  # noqa: F401
from app.modules.sales.models import Quote, QuoteLine, SalesOrder, SalesOrderLine, QuoteEvent  # noqa: F401
from app.modules.inventory.models import InventoryItem, Product, ProductCategory, StockMovement  # noqa: F401
from app.modules.portal.models import PortalSession  # noqa: F401
from app.modules.discovery.models import DiscoveryMessage, DiscoverySession  # noqa: F401
from app.modules.workflows.models import Workflow, WorkflowRun  # noqa: F401
from app.modules.accounting.models import Invoice, InvoiceLine, Payment  # noqa: F401
from app.modules.contracts.models import Contract, ContractClause  # noqa: F401
from app.modules.projects.models import Project, ProjectTask  # noqa: F401
from app.modules.hr.models import Department, Employee  # noqa: F401


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    for item in items:
        marker = item.get_closest_marker("asyncio")
        is_async_test = inspect.iscoroutinefunction(getattr(item, "obj", None))

        if marker and not is_async_test:
            item.own_markers = [m for m in item.own_markers if m.name != "asyncio"]
            continue
        if marker is None and not is_async_test:
            continue
        if marker and ("loop_scope" in marker.kwargs or "scope" in marker.kwargs):
            continue

        item.add_marker(pytest.mark.asyncio(loop_scope="session"), append=False)


# ── Session-scoped event loop — shared by all async fixtures and tests ────────

# ── Ensure test database exists ───────────────────────────────────────────────

# ── Session-scoped engine — create schema once per session ────────────────────

async def _reset_schema(url: str, terminate_connections: bool = True) -> None:
    """Reset the public schema via a raw asyncpg connection.

    Using a direct asyncpg connection (not SQLAlchemy) avoids the
    stale prepared-statement / composite-type cache that causes
    ``duplicate key value violates unique constraint pg_type_typname_nsp_index``
    when ``DROP SCHEMA CASCADE`` + ``create_all`` share the same asyncpg
    connection or when asyncpg retains old OIDs for recycled type names.
    """
    import asyncpg
    from urllib.parse import urlparse

    parsed = urlparse(url.replace("postgresql+asyncpg://", "postgresql://"))
    if terminate_connections:
        admin_conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database="postgres",
        )
        try:
            await admin_conn.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = $1 AND pid <> pg_backend_pid()
                """,
                parsed.path.lstrip("/"),
            )
        finally:
            await admin_conn.close()

    conn = await asyncpg.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        database=parsed.path.lstrip("/"),
    )
    try:
        await conn.execute("DROP SCHEMA IF EXISTS public CASCADE")
        await conn.execute("CREATE SCHEMA IF NOT EXISTS public")
    finally:
        await conn.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    # NullPool: no connection pooling — each connection is created fresh in the
    # current pytest-asyncio session loop. Keeping setup and teardown inside the
    # same loop avoids asyncpg cleanup on a closed loop during fixture teardown.
    await _reset_schema(TEST_DATABASE_URL)
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()
    await _reset_schema(TEST_DATABASE_URL, terminate_connections=False)


@pytest.fixture(scope="session")
def session_factory(test_engine):
    return async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


# ── Truncate all tables before each test ─────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def truncate_tables(test_engine):
    """Wipes all rows before each test so tests are fully isolated."""
    async with test_engine.begin() as conn:
        expected_tables = [t.name for t in Base.metadata.sorted_tables]
        existing_tables = {
            row[0]
            for row in (
                await conn.execute(
                    text(
                        "SELECT tablename FROM pg_tables "
                        "WHERE schemaname = 'public'"
                    )
                )
            )
        }

        # Dockerized test startup can occasionally leave cbos_test with a
        # partially-created schema; repair it before cleaning.
        if existing_tables != set(expected_tables):
            await conn.run_sync(Base.metadata.create_all)
            existing_tables = {
                row[0]
                for row in (
                    await conn.execute(
                        text(
                            "SELECT tablename FROM pg_tables "
                            "WHERE schemaname = 'public'"
                        )
                    )
                )
            }

        cleanup_tables = [name for name in reversed(expected_tables) if name in existing_tables]
        for table_name in cleanup_tables:
            await conn.execute(text(f'DELETE FROM "{table_name}"'))


# ── Per-test db session (for direct service/model access in tests) ────────────

@pytest_asyncio.fixture
async def db(session_factory, truncate_tables) -> AsyncSession:
    async with session_factory() as session:
        try:
            yield session
        finally:
            try:
                await session.rollback()
            except Exception:
                pass


# ── Workspace + User fixtures (commit so HTTP requests can see the data) ──────

@pytest_asyncio.fixture
async def workspace(session_factory, truncate_tables) -> Workspace:
    async with session_factory() as session:
        ws = Workspace(
            name="Test Corp",
            slug="test-corp",
            active_modules=["crm", "sales", "inventory"],
        )
        session.add(ws)
        await session.commit()
        await session.refresh(ws)
        return ws


@pytest_asyncio.fixture
async def test_user(session_factory, workspace: Workspace) -> User:
    from app.core.security import hash_password

    async with session_factory() as session:
        person = Person(
            workspace_id=workspace.id,
            full_name="Test Owner",
            email="owner@test.corp",
            role_labels=["owner"],
        )
        session.add(person)
        await session.flush()

        user = User(
            workspace_id=workspace.id,
            person_id=person.id,
            email="owner@test.corp",
            hashed_password=hash_password("testpassword123"),
            role="admin",
            is_owner=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
def auth_headers(test_user: User) -> dict:
    token = create_access_token({
        "sub": test_user.id,
        "workspace_id": test_user.workspace_id,
        "role": test_user.role,
    })
    return {"Authorization": f"Bearer {token}"}


# ── HTTP client — each request gets its own session from the test DB ──────────

@pytest_asyncio.fixture
async def client(session_factory, test_user: User) -> AsyncClient:
    """AsyncClient pointing to the test DB; auth is pre-set to test_user."""

    async def _override_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    from app.core.database import get_db
    app.dependency_overrides[get_db] = _override_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
    await asyncio.sleep(0)
