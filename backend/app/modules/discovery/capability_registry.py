"""
CBOS Capability Registry
Mapeo estático de capacidades → pain points, módulos y paquetes.
Usado por el motor de matching rule-based (MVP1) y como contexto para el AI assistant (MVP2).
"""

from typing import TypedDict


class Capability(TypedDict):
    id: str
    name: str
    description: str
    pain_points: list[str]   # keywords que activan esta capacidad
    module: str              # módulo CBOS que la entrega
    phase: str               # fase de construcción
    packages: list[str]      # paquetes de solución que la incluyen


# ── Taxonomía de pain points ──────────────────────────────────────────────────
PAIN_POINT_AREAS = {
    "acquire":   "Adquisición de clientes y leads",
    "convert":   "Conversión de prospectos a ventas",
    "deliver":   "Entrega de productos y servicios",
    "operate":   "Operaciones internas y flujos de trabajo",
    "retain":    "Retención y fidelización de clientes",
    "analyze":   "Análisis de datos y reportes",
    "automate":  "Automatización de tareas repetitivas",
}

# ── Paquetes de solución ──────────────────────────────────────────────────────
SOLUTION_PACKAGES = {
    "starter": {
        "name": "Starter",
        "description": "CRM básico + cotizaciones. Ideal para equipos pequeños.",
        "price_usd_monthly": 49,
        "modules": ["crm", "sales"],
    },
    "growth": {
        "name": "Growth",
        "description": "Starter + inventario + portal cliente + workflows básicos.",
        "price_usd_monthly": 149,
        "modules": ["crm", "sales", "inventory", "portal"],
    },
    "operations_plus": {
        "name": "Operations+",
        "description": "Suite completa con AI, discovery y automatización avanzada.",
        "price_usd_monthly": 349,
        "modules": ["crm", "sales", "inventory", "portal", "discovery", "workflows"],
    },
}

# ── Catálogo de capacidades ───────────────────────────────────────────────────
CAPABILITIES: list[Capability] = [
    # ── Acquire ──────────────────────────────────────────────
    {
        "id": "cap_lead_capture",
        "name": "Captura de Leads",
        "description": "Registra y clasifica prospectos desde múltiples fuentes.",
        "pain_points": [
            "leads", "prospectos", "capturas", "formularios", "contactos",
            "registro", "pipeline de ventas", "embudo", "funnel",
        ],
        "module": "crm",
        "phase": "phase_1",
        "packages": ["starter", "growth", "operations_plus"],
    },
    {
        "id": "cap_pipeline_management",
        "name": "Gestión de Pipeline",
        "description": "Visualiza y gestiona el ciclo de ventas con etapas configurables.",
        "pain_points": [
            "pipeline", "etapas", "oportunidades", "seguimiento", "comercial",
            "ventas", "cierre", "forecast", "pronóstico",
        ],
        "module": "crm",
        "phase": "phase_1",
        "packages": ["starter", "growth", "operations_plus"],
    },
    # ── Convert ──────────────────────────────────────────────
    {
        "id": "cap_quote_builder",
        "name": "Constructor de Cotizaciones",
        "description": "Crea cotizaciones profesionales con líneas de items, descuentos e impuestos.",
        "pain_points": [
            "cotizaciones", "presupuestos", "propuestas", "ofertas", "pricing",
            "precios", "descuentos", "impuestos", "iva", "facturación",
        ],
        "module": "sales",
        "phase": "phase_2",
        "packages": ["starter", "growth", "operations_plus"],
    },
    {
        "id": "cap_pdf_generation",
        "name": "Generación de Documentos PDF",
        "description": "Genera PDFs de cotizaciones y órdenes con tu branding.",
        "pain_points": [
            "pdf", "documentos", "formato", "branding", "profesional",
            "presentación", "envío", "correo",
        ],
        "module": "sales",
        "phase": "phase_2",
        "packages": ["starter", "growth", "operations_plus"],
    },
    {
        "id": "cap_sales_orders",
        "name": "Órdenes de Venta",
        "description": "Convierte cotizaciones aceptadas en órdenes de venta con trazabilidad.",
        "pain_points": [
            "órdenes", "pedidos", "compras", "confirmación", "aceptación",
            "trazabilidad", "historial",
        ],
        "module": "sales",
        "phase": "phase_2",
        "packages": ["starter", "growth", "operations_plus"],
    },
    # ── Deliver ──────────────────────────────────────────────
    {
        "id": "cap_inventory_catalog",
        "name": "Catálogo de Productos",
        "description": "Gestiona tu catálogo con SKUs, categorías y precios.",
        "pain_points": [
            "productos", "catálogo", "sku", "referencias", "items",
            "servicios", "categorías", "precios lista",
        ],
        "module": "inventory",
        "phase": "phase_3",
        "packages": ["growth", "operations_plus"],
    },
    {
        "id": "cap_stock_control",
        "name": "Control de Stock",
        "description": "Rastrea niveles de inventario, movimientos y alertas de stock mínimo.",
        "pain_points": [
            "inventario", "stock", "existencias", "bodega", "almacén",
            "agotado", "stock mínimo", "reorden", "movimientos",
        ],
        "module": "inventory",
        "phase": "phase_3",
        "packages": ["growth", "operations_plus"],
    },
    {
        "id": "cap_auto_reserve",
        "name": "Reserva Automática de Inventario",
        "description": "Al aceptar una cotización, reserva el inventario necesario automáticamente.",
        "pain_points": [
            "reserva", "bloqueo inventario", "disponibilidad", "sobreventas",
            "fulfillment", "despacho", "preparación",
        ],
        "module": "inventory",
        "phase": "phase_3",
        "packages": ["growth", "operations_plus"],
    },
    # ── Retain ───────────────────────────────────────────────
    {
        "id": "cap_customer_portal",
        "name": "Portal del Cliente",
        "description": "Comparte cotizaciones con clientes vía link seguro. El cliente puede aceptar o rechazar.",
        "pain_points": [
            "portal", "cliente", "autoservicio", "aprobación", "firma",
            "aceptación online", "link", "acceso", "experiencia cliente",
        ],
        "module": "portal",
        "phase": "phase_4",
        "packages": ["growth", "operations_plus"],
    },
    {
        "id": "cap_email_automation",
        "name": "Automatización de Emails",
        "description": "Envía cotizaciones y notificaciones por email de forma automática.",
        "pain_points": [
            "email", "correo", "notificaciones", "recordatorios", "seguimiento automático",
            "comunicación", "smtp",
        ],
        "module": "portal",
        "phase": "phase_4",
        "packages": ["growth", "operations_plus"],
    },
    # ── Operate ──────────────────────────────────────────────
    {
        "id": "cap_multi_workspace",
        "name": "Multi-Workspace",
        "description": "Gestiona múltiples empresas o marcas desde una sola plataforma.",
        "pain_points": [
            "multiempresa", "sucursales", "franquicias", "marcas", "separación",
            "workspace", "tenant", "clientes internos",
        ],
        "module": "identity",
        "phase": "phase_0",
        "packages": ["growth", "operations_plus"],
    },
    {
        "id": "cap_role_permissions",
        "name": "Roles y Permisos",
        "description": "Controla quién puede ver y hacer qué en la plataforma.",
        "pain_points": [
            "roles", "permisos", "acceso", "usuarios", "equipo", "seguridad",
            "admin", "comercial", "bodega",
        ],
        "module": "identity",
        "phase": "phase_0",
        "packages": ["starter", "growth", "operations_plus"],
    },
    # ── Analyze ──────────────────────────────────────────────
    {
        "id": "cap_event_audit",
        "name": "Auditoría de Eventos",
        "description": "Registro inmutable de todas las acciones del sistema vía event bus.",
        "pain_points": [
            "auditoría", "trazabilidad", "historial", "log", "registro",
            "cumplimiento", "compliance", "quién hizo qué",
        ],
        "module": "events",
        "phase": "phase_0",
        "packages": ["growth", "operations_plus"],
    },
    # ── Automate ─────────────────────────────────────────────
    {
        "id": "cap_workflow_engine",
        "name": "Motor de Workflows",
        "description": "Automatiza procesos con reglas de negocio configurables.",
        "pain_points": [
            "automatización", "workflows", "procesos", "reglas", "disparadores",
            "triggers", "aprobaciones", "notificaciones automáticas",
        ],
        "module": "workflows",
        "phase": "phase_6",
        "packages": ["operations_plus"],
    },
    {
        "id": "cap_ai_discovery",
        "name": "Discovery con AI",
        "description": "El asistente de AI diagnostica tu negocio y propone la solución CBOS ideal.",
        "pain_points": [
            "diagnóstico", "consultoría", "qué necesito", "por dónde empezar",
            "solución", "recomendación", "blueprint", "implementación",
        ],
        "module": "discovery",
        "phase": "phase_5",
        "packages": ["operations_plus"],
    },
]

# ── Índices para lookup rápido ─────────────────────────────────────────────────
CAPABILITY_BY_ID: dict[str, Capability] = {c["id"]: c for c in CAPABILITIES}
CAPABILITY_BY_MODULE: dict[str, list[Capability]] = {}
for cap in CAPABILITIES:
    CAPABILITY_BY_MODULE.setdefault(cap["module"], []).append(cap)


def match_capabilities(pain_points_text: str) -> list[Capability]:
    """
    Rule-based matcher: busca keywords de pain_points en el texto libre.
    Retorna capabilities ordenadas por número de matches (descendente).
    """
    text_lower = pain_points_text.lower()
    scores: dict[str, int] = {}

    for cap in CAPABILITIES:
        score = sum(1 for kw in cap["pain_points"] if kw in text_lower)
        if score > 0:
            scores[cap["id"]] = score

    matched = [CAPABILITY_BY_ID[cid] for cid in sorted(scores, key=lambda x: scores[x], reverse=True)]
    return matched


def recommend_package(matched_capability_ids: list[str]) -> str:
    """
    Recomienda el paquete mínimo que cubre todas las capabilities detectadas.
    """
    needed_packages: set[str] = set()
    for cid in matched_capability_ids:
        cap = CAPABILITY_BY_ID.get(cid)
        if cap:
            needed_packages.update(cap["packages"])

    # Jerarquía de paquetes: starter ⊂ growth ⊂ operations_plus
    if "operations_plus" in needed_packages:
        return "operations_plus"
    if "growth" in needed_packages:
        return "growth"
    return "starter"
