"""
CBOS AI Discovery Assistant
Usa Claude API (claude-opus-4-6) para conducir la conversación de discovery.
Fallback rule-based cuando ANTHROPIC_API_KEY no está configurada.
"""

import logging
from typing import Any

from app.core.config import settings
from app.modules.discovery.capability_registry import (
    CAPABILITIES,
    PAIN_POINT_AREAS,
    SOLUTION_PACKAGES,
    match_capabilities,
    recommend_package,
)

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres el asistente de Discovery de CBOS (Composable Business Operating System), una plataforma empresarial modular.

Tu misión es diagnosticar los problemas operacionales de una empresa y recomendar las capacidades CBOS que mejor se adaptan.

## Tu personalidad
- Eres empático, directo y profesional
- Haces preguntas específicas, no genéricas
- Usas el idioma del cliente (español latinoamericano)
- Eres conciso — máximo 3-4 oraciones por respuesta

## Proceso de discovery (3 fases)
1. **Entender el negocio**: industria, tamaño, modelo de negocio
2. **Diagnosticar dolor**: áreas con mayor fricción operacional
3. **Proponer solución**: capacidades CBOS que resuelven el dolor

## Áreas de dolor que puedes diagnosticar
""" + "\n".join(f"- **{area}**: {desc}" for area, desc in PAIN_POINT_AREAS.items()) + """

## Capacidades CBOS disponibles
""" + "\n".join(
    f"- **{cap['name']}** ({cap['module']}): {cap['description']}"
    for cap in CAPABILITIES
) + """

## Reglas importantes
- NO inventes capacidades que no están en la lista
- Cuando detectes suficiente información (3+ intercambios), ofrece generar el blueprint
- El blueprint resume: dolor detectado, capacidades recomendadas, paquete sugerido
- Mantén el contexto de la conversación completa
- Si el usuario dice "generar blueprint" o "genera el plan", responde con un JSON válido en este formato exacto:

```json
{
  "blueprint_ready": true,
  "pain_points": ["punto1", "punto2"],
  "capabilities": ["cap_id1", "cap_id2"],
  "package": "starter|growth|operations_plus",
  "summary": "Texto explicativo para el cliente"
}
```
"""

# ── AI Assistant ──────────────────────────────────────────────────────────────

async def get_ai_response(
    conversation_history: list[dict[str, str]],
    business_context: dict[str, Any],
) -> tuple[str, dict | None]:
    """
    Llama a Claude API con el historial de conversación.
    Retorna (texto_respuesta, blueprint_dict_or_None).

    Si no hay API key, usa el fallback rule-based.
    """
    if not settings.anthropic_api_key:
        return _rule_based_response(conversation_history, business_context), None

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        # Construir contexto adicional si existe
        context_note = ""
        if business_context.get("business_description"):
            context_note += f"\n[Contexto de sesión] Negocio: {business_context['business_description']}"
        if business_context.get("industry"):
            context_note += f" | Industria: {business_context['industry']}"
        if business_context.get("company_size"):
            context_note += f" | Tamaño: {business_context['company_size']}"

        system = SYSTEM_PROMPT
        if context_note:
            system += context_note

        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            thinking={"type": "adaptive"},
            system=system,
            messages=conversation_history,
        )

        # Extraer texto de la respuesta
        text_content = ""
        for block in response.content:
            if block.type == "text":
                text_content = block.text
                break

        # Detectar si la respuesta contiene un blueprint JSON
        blueprint = _extract_blueprint(text_content)

        return text_content, blueprint

    except Exception as exc:
        logger.error("Claude API error: %s — usando fallback rule-based", exc)
        return _rule_based_response(conversation_history, business_context), None


def _extract_blueprint(text: str) -> dict | None:
    """Extrae el JSON de blueprint si está presente en el texto."""
    import json
    import re

    # Buscar bloque JSON en el texto
    match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not match:
        # Intentar JSON sin fence
        match = re.search(r'\{"blueprint_ready".*?\}', text, re.DOTALL)

    if match:
        try:
            data = json.loads(match.group(1) if "```" in text else match.group(0))
            if data.get("blueprint_ready"):
                return data
        except json.JSONDecodeError:
            pass
    return None


def _rule_based_response(
    conversation_history: list[dict[str, str]],
    business_context: dict[str, Any],
) -> str:
    """
    Respuesta rule-based cuando no hay API key.
    Analiza el historial y genera respuestas guiadas.
    """
    user_messages = [m["content"] for m in conversation_history if m["role"] == "user"]
    all_text = " ".join(user_messages)

    n = len(user_messages)

    if n == 1:
        # Primera respuesta: preguntar industria y tamaño
        return (
            "¡Hola! Soy el asistente de Discovery de CBOS. "
            "Para recomendarte la solución ideal, cuéntame: "
            "¿En qué industria opera tu empresa y cuántas personas trabajan en ella?"
        )

    if n == 2:
        # Segunda: preguntar el mayor dolor
        return (
            "Perfecto. ¿Cuál es el mayor problema operacional que enfrentas hoy? "
            "Por ejemplo: seguimiento de ventas, generación de cotizaciones, "
            "control de inventario, experiencia del cliente, u otro."
        )

    if n == 3:
        # Tercera: profundizar en el dolor
        matched = match_capabilities(all_text)
        if matched:
            cap_names = ", ".join(c["name"] for c in matched[:3])
            return (
                f"Entiendo. Basado en lo que describes, áreas como {cap_names} "
                f"podrían ayudarte mucho. "
                f"¿Hay otros procesos donde pierdes tiempo o dinero actualmente?"
            )
        return (
            "Entiendo la situación. ¿Podrías contarme más sobre cómo gestionas "
            "actualmente tus ventas, cotizaciones o inventario?"
        )

    # n >= 4: ofrecer blueprint
    matched = match_capabilities(all_text)
    if matched:
        package = recommend_package([c["id"] for c in matched[:5]])
        pkg_info = SOLUTION_PACKAGES[package]
        return (
            f"Con base en nuestra conversación, tengo suficiente información para "
            f"recomendarte el paquete **{pkg_info['name']}** de CBOS. "
            f"¿Quieres que genere el blueprint completo con las capacidades específicas "
            f"para tu negocio? Solo escribe 'generar blueprint'."
        )

    return (
        "Gracias por toda esa información. ¿Hay algo más que quieras compartir "
        "sobre tus procesos antes de que genere tu blueprint personalizado?"
    )


async def generate_blueprint_with_ai(
    conversation_history: list[dict[str, str]],
    business_context: dict[str, Any],
) -> dict:
    """
    Genera el blueprint final usando AI o rule-based.
    Siempre retorna un dict estructurado.
    """
    all_text = " ".join(
        m["content"] for m in conversation_history if m["role"] == "user"
    )
    if business_context.get("business_description"):
        all_text += " " + business_context["business_description"]

    matched = match_capabilities(all_text)
    cap_ids = [c["id"] for c in matched[:6]]
    package = recommend_package(cap_ids)
    pkg_info = SOLUTION_PACKAGES[package]

    # Si hay API key, pedirle a Claude que genere el blueprint enriquecido
    if settings.anthropic_api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

            prompt = (
                f"Basado en la conversación de discovery, genera un blueprint estructurado "
                f"para este cliente. Capabilities identificadas: {[c['name'] for c in matched[:6]]}. "
                f"Paquete recomendado: {package}. "
                f"Genera una descripción ejecutiva de 3-4 oraciones explicando al cliente "
                f"cómo CBOS resolverá sus problemas específicos."
            )

            msgs = conversation_history + [{"role": "user", "content": prompt}]
            response = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=512,
                system=SYSTEM_PROMPT,
                messages=msgs,
            )
            summary = next(
                (b.text for b in response.content if b.type == "text"),
                pkg_info["description"],
            )
        except Exception as exc:
            logger.warning("Blueprint AI generation failed: %s", exc)
            summary = pkg_info["description"]
    else:
        summary = pkg_info["description"]

    return {
        "package": package,
        "package_name": pkg_info["name"],
        "package_description": pkg_info["description"],
        "price_usd_monthly": pkg_info["price_usd_monthly"],
        "modules": pkg_info["modules"],
        "capabilities": [
            {
                "id": c["id"],
                "name": c["name"],
                "description": c["description"],
                "module": c["module"],
            }
            for c in matched[:6]
        ],
        "executive_summary": summary,
        "next_steps": [
            "Activar workspace CBOS con el paquete seleccionado",
            "Configurar usuarios y roles del equipo",
            "Importar datos existentes (contactos, productos)",
            "Capacitación inicial de 2 horas con el equipo",
            "Primera venta procesada en CBOS en día 7",
        ],
    }
