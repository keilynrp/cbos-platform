from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def validate_workspace_ownership(
    db: AsyncSession,
    model_class,
    entity_id: str,
    workspace_id: str,
    field_name: str,
) -> None:
    """
    Verifica que una entidad referenciada pertenezca al mismo workspace.
    Lanza HTTPException 422 si no pertenece o no existe.

    Uso:
        await validate_workspace_ownership(db, Organization, data.organization_id,
                                           workspace_id, "organization_id")
    """
    result = await db.execute(
        select(model_class).where(
            model_class.id == entity_id,
            model_class.workspace_id == workspace_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=422,
            detail=f"'{field_name}' with id '{entity_id}' does not exist in this workspace.",
        )
