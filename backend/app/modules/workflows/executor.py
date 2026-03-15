"""
Workflow Executor
Evalúa condiciones y ejecuta acciones de un workflow.
"""

import asyncio
import logging
import time
from typing import Any

from app.core.config import settings
from app.core.email import send_email
from app.events.types import Event

logger = logging.getLogger(__name__)


# ── Condition evaluator ───────────────────────────────────────────────────────

def _get_nested(obj: Any, path: str) -> Any:
    """Navega un dict por dot-notation. Retorna None si la clave no existe."""
    parts = path.split(".")
    current = obj
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
    return current


def evaluate_conditions(conditions: list[dict], context: dict) -> bool:
    """
    Evalúa todas las condiciones (AND lógico).
    context: dict con keys event_type, source_module, workspace_id, payload, actor_id, entity_id
    """
    if not conditions:
        return True  # sin condiciones = siempre aplica

    for cond in conditions:
        field = cond.get("field", "")
        op = cond.get("op", "eq")
        expected = cond.get("value")

        actual = _get_nested(context, field)

        try:
            result = _apply_op(op, actual, expected)
        except Exception:
            result = False

        if not result:
            return False

    return True


def _apply_op(op: str, actual: Any, expected: Any) -> bool:
    if op == "eq":
        return actual == expected
    elif op == "neq":
        return actual != expected
    elif op == "gt":
        return actual is not None and actual > expected
    elif op == "lt":
        return actual is not None and actual < expected
    elif op == "gte":
        return actual is not None and actual >= expected
    elif op == "lte":
        return actual is not None and actual <= expected
    elif op == "contains":
        return expected in str(actual or "")
    elif op == "not_contains":
        return expected not in str(actual or "")
    elif op == "in":
        return actual in (expected if isinstance(expected, list) else [])
    elif op == "not_in":
        return actual not in (expected if isinstance(expected, list) else [])
    elif op == "exists":
        return actual is not None
    elif op == "not_exists":
        return actual is None
    return False


# ── Action executor ───────────────────────────────────────────────────────────

async def execute_action(
    action: dict,
    context: dict,
    workspace_id: str,
) -> dict:
    """
    Ejecuta una acción individual.
    Retorna un dict con status, detail, duration_ms.
    """
    action_type = action.get("type", "")
    config = action.get("config", {})
    t0 = time.monotonic()

    try:
        if action_type == "send_email":
            result = await _action_send_email(config, context)
        elif action_type == "emit_event":
            result = await _action_emit_event(config, context, workspace_id)
        elif action_type == "webhook":
            result = await _action_webhook(config, context)
        elif action_type == "log":
            result = _action_log(config, context)
        elif action_type in ("update_status", "create_activity"):
            # Placeholder — Phase 6 MVP: se implementa via events
            result = {"note": f"Action '{action_type}' recorded. Full impl in Phase 7."}
        else:
            result = {"error": f"Unknown action type: {action_type}"}

        duration_ms = int((time.monotonic() - t0) * 1000)
        return {
            "action_type": action_type,
            "status": "completed",
            "detail": result,
            "duration_ms": duration_ms,
        }
    except Exception as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        logger.error("Action %s failed: %s", action_type, exc)
        return {
            "action_type": action_type,
            "status": "failed",
            "detail": {"error": str(exc)},
            "duration_ms": duration_ms,
        }


async def _action_send_email(config: dict, context: dict) -> dict:
    """
    config: {to, subject, body_template}
    body_template soporta {placeholders} con valores del contexto.
    """
    to = config.get("to")
    subject_tpl = config.get("subject", "Notificación CBOS")
    body_tpl = config.get("body_template", "Se ha producido un evento en tu cuenta CBOS.")

    if not to:
        raise ValueError("send_email action requires 'to' in config")

    # Interpolate context into templates
    flat_ctx = _flatten_context(context)
    subject = subject_tpl.format_map(_SafeFormatter(flat_ctx))
    body = body_tpl.format_map(_SafeFormatter(flat_ctx))

    sent = await send_email(to, subject, f"<p>{body}</p>", body)
    return {"to": to, "sent": sent}


async def _action_emit_event(config: dict, context: dict, workspace_id: str) -> dict:
    """
    config: {event_type, payload_extra}
    Emite un nuevo evento derivado en el bus.
    """
    from app.events.bus import publish as publish_event

    event_type = config.get("event_type", "WorkflowActionTriggered")
    extra = config.get("payload_extra", {})

    event = Event(
        event_type=event_type,
        source_module="workflows",
        workspace_id=workspace_id,
        payload={**context.get("payload", {}), **extra, "triggered_by_workflow": True},
    )
    await publish_event(event)
    return {"event_type": event_type}


async def _action_webhook(config: dict, context: dict) -> dict:
    """
    config: {url, method, headers, body_template}
    Llama a una URL externa con el contexto del evento.
    """
    import httpx

    url = config.get("url")
    if not url:
        raise ValueError("webhook action requires 'url' in config")

    method = config.get("method", "POST").upper()
    headers = config.get("headers", {})
    body = config.get("body_template", {})

    # Si body es un dict, interpola valores del contexto
    if isinstance(body, dict):
        body = {k: str(v).format_map(_SafeFormatter(_flatten_context(context)))
                for k, v in body.items()}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.request(
            method, url, json=body, headers=headers
        )
        return {"status_code": response.status_code, "ok": response.is_success}


def _action_log(config: dict, context: dict) -> dict:
    """Acción de debug: escribe en el logger."""
    message = config.get("message", "Workflow log")
    flat_ctx = _flatten_context(context)
    formatted = message.format_map(_SafeFormatter(flat_ctx))
    logger.info("WORKFLOW LOG: %s", formatted)
    return {"logged": formatted}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _flatten_context(context: dict) -> dict:
    """Aplana el contexto para interpolación de templates."""
    flat = {k: v for k, v in context.items() if not isinstance(v, dict)}
    payload = context.get("payload", {})
    for k, v in payload.items():
        flat[f"payload.{k}"] = v
        flat[k] = v  # shorthand
    return flat


class _SafeFormatter(dict):
    """dict que retorna '{key}' si la clave no existe (evita KeyError en format_map)."""
    def __missing__(self, key: str) -> str:
        return f"{{{key}}}"


# ── Full workflow execution ───────────────────────────────────────────────────

async def run_workflow(
    workflow_id: str,
    actions: list[dict],
    context: dict,
    workspace_id: str,
) -> tuple[str, list[dict], str | None]:
    """
    Ejecuta todas las acciones de un workflow en secuencia.
    Retorna (status, steps_result, error_or_None).
    """
    steps_result = []
    overall_status = "completed"
    error_msg = None

    for action in actions:
        step = await execute_action(action, context, workspace_id)
        steps_result.append(step)
        if step["status"] == "failed":
            overall_status = "failed"
            error_msg = str(step["detail"].get("error", "Unknown error"))
            break  # stop on first failure (fail-fast)

    return overall_status, steps_result, error_msg
