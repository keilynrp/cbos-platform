from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Wrapper genérico de respuesta paginada.

    Uso en un router:
        @router.get("/items", response_model=PaginatedResponse[ItemRead])
        async def list_items(page: int = 1, page_size: int = 50, ...):
            items, total = await service.list_items(db, ..., page, page_size)
            return paginate(items, total, page, page_size)
    """

    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


def paginate(items: list, total: int, page: int, page_size: int) -> dict:
    """Helper para construir una PaginatedResponse desde los parámetros base."""
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
    }


def page_to_offset(page: int, page_size: int) -> int:
    """Convierte número de página (1-based) a offset SQL."""
    return max(0, (page - 1) * page_size)
