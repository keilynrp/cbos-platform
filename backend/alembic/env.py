import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Importar config de la app
from app.core.config import settings
from app.core.database import Base

# Importar todos los modelos para que Alembic los detecte.
# Esta lista debe mantenerse sincronizada con la de tests/conftest.py: un modelo
# ausente no entra en Base.metadata y autogenerate lo reporta como tabla borrada.
from app.modules.identity.models import Workspace, User, Person, Organization, PublicSite  # noqa: F401
from app.modules.crm.models import Lead, Opportunity, Activity, PublicLeadSubmission  # noqa: F401
from app.modules.sales.models import Quote, QuoteLine, SalesOrder, SalesOrderLine, QuoteEvent  # noqa: F401
from app.modules.inventory.models import ProductCategory, Product, InventoryItem, StockMovement  # noqa: F401
from app.modules.portal.models import PortalSession  # noqa: F401
from app.modules.discovery.models import DiscoverySession, DiscoveryMessage  # noqa: F401
from app.modules.workflows.models import Workflow, WorkflowRun  # noqa: F401
from app.modules.accounting.models import CompanyProfile, Invoice, InvoiceLine, Payment  # noqa: F401
from app.modules.contracts.models import Contract, ContractClause  # noqa: F401
from app.modules.projects.models import Project, ProjectTask  # noqa: F401
from app.modules.hr.models import Department, Employee  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Sobreescribir la URL con la de settings
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
