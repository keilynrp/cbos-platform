import logging
from datetime import datetime, timezone

from app.core.exceptions import CBOSException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.bus import publish as publish_event
from app.events.types import (
    BLUEPRINT_GENERATED,
    CAPABILITY_MATCHED,
    DISCOVERY_SESSION_COMPLETED,
    DISCOVERY_SESSION_STARTED,
    PAIN_POINT_DETECTED,
    SOLUTION_COMPOSED,
    Event,
)
from app.modules.discovery.ai_assistant import (
    generate_blueprint_with_ai,
    get_ai_response,
)
from app.modules.discovery.capability_registry import (
    match_capabilities,
    recommend_package,
)
from app.modules.discovery.models import DiscoveryMessage, DiscoverySession
from app.modules.discovery.schemas import (
    ApplyResult,
    BlueprintResponse,
    ChatResponse,
    DiscoverySessionCreate,
    DiscoverySessionRead,
    MessageCreate,
    MessageRead,
)

logger = logging.getLogger(__name__)


# ── Session management ────────────────────────────────────────────────────────

async def create_session(
    db: AsyncSession,
    workspace_id: str,
    actor_id: str | None,
    data: DiscoverySessionCreate,
) -> DiscoverySessionRead:
    session = DiscoverySession(
        workspace_id=workspace_id,
        actor_id=actor_id,
        status="active",
        business_description=data.business_description,
        industry=data.industry,
        company_size=data.company_size,
    )
    db.add(session)

    await publish_event(Event(
        event_type=DISCOVERY_SESSION_STARTED,
        source_module="discovery",
        workspace_id=workspace_id,
        actor_id=actor_id,
        payload={
            "industry": data.industry,
            "company_size": data.company_size,
        },
    ))

    await db.commit()
    await db.refresh(session)
    return DiscoverySessionRead.model_validate(session)


async def get_session(
    db: AsyncSession, workspace_id: str, session_id: str
) -> DiscoverySession:
    result = await db.execute(
        select(DiscoverySession).where(
            DiscoverySession.id == session_id,
            DiscoverySession.workspace_id == workspace_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise CBOSException(
            status_code=404,
            code="DISCOVERY_SESSION_NOT_FOUND",
            message="Discovery session not found.",
            detail={"id": session_id},
        )
    return session


async def list_sessions(
    db: AsyncSession, workspace_id: str
) -> list[DiscoverySessionRead]:
    result = await db.execute(
        select(DiscoverySession)
        .where(DiscoverySession.workspace_id == workspace_id)
        .order_by(DiscoverySession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [DiscoverySessionRead.model_validate(s) for s in sessions]


# ── Chat ──────────────────────────────────────────────────────────────────────

async def send_message(
    db: AsyncSession,
    workspace_id: str,
    session_id: str,
    actor_id: str | None,
    data: MessageCreate,
) -> ChatResponse:
    session = await get_session(db, workspace_id, session_id)

    if session.status == "completed":
        # ALREADY_COMPLETED y no SESSION_COMPLETED: ese nombre ya lo ocupa una
        # constante de evento en app/events/types.py, y dos cosas distintas con
        # el mismo identificador se acaban confundiendo al leer los logs.
        raise CBOSException(
            status_code=409,
            code="DISCOVERY_SESSION_ALREADY_COMPLETED",
            message="Session is already completed.",
            detail={"status": session.status},
        )

    # Save user message
    user_msg = DiscoveryMessage(
        session_id=session_id,
        role="user",
        content=data.content,
    )
    db.add(user_msg)
    await db.flush()

    # Build conversation history for AI
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
        if m.role in ("user", "assistant")
    ]
    history.append({"role": "user", "content": data.content})

    business_context = {
        "business_description": session.business_description,
        "industry": session.industry,
        "company_size": session.company_size,
    }

    # Get AI response
    ai_text, blueprint_data = await get_ai_response(history, business_context)

    # Save assistant message
    assistant_msg = DiscoveryMessage(
        session_id=session_id,
        role="assistant",
        content=ai_text,
    )
    db.add(assistant_msg)

    # If blueprint detected in AI response, update session
    if blueprint_data:
        cap_ids = blueprint_data.get("capabilities", [])
        matched = match_capabilities(data.content + " " + session.business_description or "")
        if not cap_ids:
            cap_ids = [c["id"] for c in matched[:6]]

        session.detected_pain_points = blueprint_data.get("pain_points", [])
        session.matched_capabilities = cap_ids
        session.recommended_package = blueprint_data.get("package", "starter")
        session.blueprint = blueprint_data
        session.status = "completed"

    # Update business context from messages if available
    _update_context_from_message(session, data.content)

    await db.commit()
    await db.refresh(session)
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return ChatResponse(
        message=MessageRead.model_validate(assistant_msg),
        session=DiscoverySessionRead.model_validate(session),
    )


def _update_context_from_message(session: DiscoverySession, text: str) -> None:
    """Actualiza el contexto de la sesión con información detectada en el mensaje."""
    text_lower = text.lower()

    # Detectar industria si no está establecida
    if not session.industry:
        industries = {
            "retail": ["retail", "tienda", "comercio", "venta al detalle"],
            "manufacturing": ["manufactura", "fabricación", "planta", "producción"],
            "services": ["servicios", "consultora", "agencia", "asesoría"],
            "technology": ["tecnología", "software", "tech", "desarrollo"],
            "healthcare": ["salud", "médico", "clínica", "hospital", "farmacia"],
            "education": ["educación", "escuela", "universidad", "capacitación"],
            "food": ["alimentos", "restaurante", "gastronomía", "food"],
            "construction": ["construcción", "inmobiliaria", "obras", "contratos"],
        }
        for industry, keywords in industries.items():
            if any(kw in text_lower for kw in keywords):
                session.industry = industry
                break

    # Detectar tamaño si no está establecido
    if not session.company_size:
        if any(kw in text_lower for kw in ["1 persona", "solo yo", "solopreneur", "freelance"]):
            session.company_size = "nano"
        elif any(kw in text_lower for kw in ["pequeña", "menos de 20", "10 personas", "startup"]):
            session.company_size = "small"
        elif any(kw in text_lower for kw in ["mediana", "50 personas", "100 empleados"]):
            session.company_size = "medium"
        elif any(kw in text_lower for kw in ["grande", "corporativo", "enterprise", "+100"]):
            session.company_size = "large"

    # Actualizar descripción de negocio si está vacía
    if not session.business_description and len(text) > 20:
        session.business_description = text[:500]


# ── Blueprint ─────────────────────────────────────────────────────────────────

async def generate_blueprint(
    db: AsyncSession, workspace_id: str, session_id: str
) -> BlueprintResponse:
    session = await get_session(db, workspace_id, session_id)

    # Collect all conversation text
    all_user_text = " ".join(
        m.content for m in session.messages if m.role == "user"
    )
    if session.business_description:
        all_user_text = session.business_description + " " + all_user_text

    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages
        if m.role in ("user", "assistant")
    ]
    business_context = {
        "business_description": session.business_description,
        "industry": session.industry,
        "company_size": session.company_size,
    }

    blueprint = await generate_blueprint_with_ai(history, business_context)
    cap_ids = [c["id"] for c in blueprint["capabilities"]]
    package = blueprint["package"]

    # Update session
    session.blueprint = blueprint
    session.recommended_package = package
    session.matched_capabilities = cap_ids
    session.detected_pain_points = [
        c["name"] for c in blueprint["capabilities"]
    ]
    session.status = "completed"

    # Emit events
    await publish_event(Event(
        event_type=PAIN_POINT_DETECTED,
        source_module="discovery",
        workspace_id=workspace_id,
        entity_id=session_id,
        payload={"pain_points": session.detected_pain_points},
    ))
    await publish_event(Event(
        event_type=CAPABILITY_MATCHED,
        source_module="discovery",
        workspace_id=workspace_id,
        entity_id=session_id,
        payload={"capabilities": cap_ids, "count": len(cap_ids)},
    ))
    await publish_event(Event(
        event_type=SOLUTION_COMPOSED,
        source_module="discovery",
        workspace_id=workspace_id,
        entity_id=session_id,
        payload={"package": package},
    ))
    await publish_event(Event(
        event_type=BLUEPRINT_GENERATED,
        source_module="discovery",
        workspace_id=workspace_id,
        entity_id=session_id,
        payload={"package": package, "capability_count": len(cap_ids)},
    ))
    await publish_event(Event(
        event_type=DISCOVERY_SESSION_COMPLETED,
        source_module="discovery",
        workspace_id=workspace_id,
        entity_id=session_id,
        payload={"package": package},
    ))

    await db.commit()

    matched_caps = blueprint["capabilities"]
    return BlueprintResponse(
        session_id=session_id,
        blueprint=blueprint,
        recommended_package=package,
        matched_capabilities=matched_caps,
    )


# ── Apply blueprint ───────────────────────────────────────────────────────────

async def apply_blueprint(
    db: AsyncSession, workspace_id: str, session_id: str
) -> ApplyResult:
    """
    Marca los módulos del blueprint como activados para el workspace.
    En producción esto dispararía la provisioning de módulos.
    """
    session = await get_session(db, workspace_id, session_id)

    if not session.blueprint:
        raise CBOSException(
            status_code=409,
            code="DISCOVERY_BLUEPRINT_MISSING",
            message="Session does not have a blueprint yet. Generate it first.",
        )

    package = session.recommended_package or "starter"
    modules = session.blueprint.get("modules", [])

    logger.info(
        "Applying blueprint for workspace %s: package=%s modules=%s",
        workspace_id, package, modules,
    )

    # TODO (Phase 6): dispara workflow de provisioning real
    # Por ahora marcamos el workspace como activado vía evento

    from app.events.types import WORKSPACE_ACTIVATED
    await publish_event(Event(
        event_type=WORKSPACE_ACTIVATED,
        source_module="discovery",
        workspace_id=workspace_id,
        entity_id=session_id,
        payload={
            "package": package,
            "modules": modules,
            "blueprint_session_id": session_id,
        },
    ))

    return ApplyResult(
        success=True,
        message=f"Blueprint aplicado. Paquete {package} activado con {len(modules)} módulos.",
        workspace_id=workspace_id,
        activated_modules=modules,
    )
