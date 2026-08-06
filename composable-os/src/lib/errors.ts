import { ApiError } from "@/lib/api";

/**
 * Traduccion de codigos de error del backend a texto para el usuario.
 *
 * El backend manda un `code` estable y un `message` en ingles pensado para
 * logs; el texto que lee el usuario se decide aca. Ver ADR 0010 y el registro
 * en docs/ERROR_CODE_REGISTRY_V1.md.
 *
 * Cada entrada recibe el `detail` que acompano al codigo, con los valores ya
 * separados: asi la frase se arma aqui en lugar de venir interpolada desde el
 * servidor.
 */

type Detail = Record<string, unknown>;

const str = (d: Detail, k: string, fallback = "") =>
  d?.[k] === undefined || d?.[k] === null ? fallback : String(d[k]);

const list = (d: Detail, k: string, empty = "ninguno") =>
  Array.isArray(d?.[k]) && (d[k] as unknown[]).length
    ? (d[k] as unknown[]).join(", ")
    : empty;

const MESSAGES: Record<string, (d: Detail) => string> = {
  PROJECT_NOT_FOUND: () => "Proyecto no encontrado.",
  PROJECT_INVALID_TRANSITION: (d) =>
    `No se puede pasar de '${str(d, "from")}' a '${str(d, "to")}'. ` +
    `Estados permitidos: ${list(d, "allowed", "ninguno (estado final)")}.`,
  PROJECT_DELETE_NOT_PLANNING: (d) =>
    `No se puede eliminar un proyecto en estado '${str(d, "status")}'. ` +
    "Solo se pueden eliminar los proyectos en planificacion.",

  PROJECT_TASK_NOT_FOUND: () => "Tarea no encontrada.",
  PROJECT_TASK_ADD_BLOCKED: (d) =>
    `No se pueden anadir tareas a un proyecto en estado '${str(d, "status")}'.`,
  PROJECT_TASK_MODIFY_BLOCKED: (d) =>
    `No se pueden modificar las tareas de un proyecto en estado '${str(d, "status")}'.`,
  PROJECT_TASK_DELETE_BLOCKED: (d) =>
    `No se pueden eliminar tareas de un proyecto en estado '${str(d, "status")}'.`,
  PROJECT_TASK_INVALID_TRANSITION: (d) =>
    `La tarea no puede pasar de '${str(d, "from")}' a '${str(d, "to")}'. ` +
    `Estados permitidos: ${list(d, "allowed", "ninguno (estado final)")}.`,

  SALES_QUOTE_NOT_FOUND: () => "Cotizacion no encontrada.",
  SALES_QUOTE_LINE_NOT_FOUND: () => "Linea de la cotizacion no encontrada.",
  SALES_QUOTE_EDIT_NOT_DRAFT: (d) =>
    `Solo se pueden editar las cotizaciones en borrador; esta esta en '${str(d, "status")}'.`,
  SALES_QUOTE_LINES_NOT_DRAFT: (d) =>
    `Solo se pueden modificar las lineas de una cotizacion en borrador; ` +
    `esta esta en '${str(d, "status")}'.`,
  SALES_QUOTE_LINES_REQUIRED: () =>
    "Una cotizacion debe tener al menos una linea.",
  SALES_QUOTE_LINE_IDS_DUPLICATED: (d) =>
    `Hay lineas repetidas en el envio: ${list(d, "ids")}.`,
  SALES_QUOTE_SEND_INVALID_STATUS: (d) =>
    `No se puede enviar una cotizacion en estado '${str(d, "status")}'.`,
  SALES_QUOTE_ACCEPT_INVALID_STATUS: (d) =>
    `No se puede aceptar una cotizacion en estado '${str(d, "status")}'.`,
  SALES_QUOTE_REJECT_INVALID_STATUS: (d) =>
    `No se puede rechazar una cotizacion en estado '${str(d, "status")}'.`,

  SALES_ORDER_NOT_FOUND: () => "Orden de venta no encontrada.",
  SALES_ORDER_INVALID_TRANSITION: (d) =>
    `La orden no puede pasar de '${str(d, "from")}' a '${str(d, "to")}'. ` +
    `Estados permitidos: ${list(d, "allowed", "ninguno (estado final)")}.`,

  CRM_LEAD_NOT_FOUND: () => "Lead no encontrado.",
  CRM_LEAD_ALREADY_CONVERTED: () => "Este lead ya fue convertido.",
  CRM_OPPORTUNITY_NOT_FOUND: () => "Oportunidad no encontrada.",
  CRM_ACTIVITY_NOT_FOUND: () => "Actividad no encontrada.",
  CRM_OPPORTUNITY_INVALID_STAGE: (d) =>
    `Etapa invalida: '${str(d, "stage")}'. ` +
    `Etapas validas: ${list(d, "allowed")}.`,
  CRM_OPPORTUNITY_INVALID_TRANSITION: (d) =>
    `La oportunidad no puede pasar de '${str(d, "from")}' a '${str(d, "to")}'. ` +
    `Etapas permitidas: ${list(d, "allowed", "ninguna (etapa final)")}.`,

  // Captacion publica: la levanta el sitio externo, no composable-os. Se
  // traduce igual porque el registro exige que todo codigo tenga texto, y
  // porque estos errores tambien salen en el panel de diagnostico del sitio.
  CRM_PUBLIC_SITE_KEY_INVALID: () => "Clave del sitio ausente o invalida.",
  CRM_PUBLIC_SITE_INACTIVE: () => "El sitio publico esta inactivo.",
  CRM_PUBLIC_SITE_ORIGIN_NOT_ALLOWED: (d) =>
    `Origen no permitido para este sitio${d?.origin ? `: ${str(d, "origin")}` : ""}.`,
  CRM_PUBLIC_INTAKE_IDEMPOTENCY_CONFLICT: () =>
    "La clave de idempotencia ya se uso con un contenido distinto.",
  CRM_PUBLIC_INTAKE_RATE_LIMITED: (d) =>
    `Demasiadas solicitudes. Reintenta en ${str(d, "retry_after_seconds", "60")} segundos.`,

  PORTAL_SESSION_NOT_FOUND: () => "Sesion del portal no encontrada.",
  PORTAL_LINK_EXPIRED: () =>
    "Este enlace ha caducado. Pide uno nuevo a tu contacto comercial.",
  PORTAL_QUOTE_NOT_FOUND: () => "Cotizacion no encontrada.",
  PORTAL_ORDER_NOT_FOUND: () =>
    "Todavia no hay una orden. Es posible que la cotizacion aun no se haya aceptado.",
  PORTAL_QUOTE_NOT_SHAREABLE: (d) =>
    `No se puede compartir una cotizacion en estado '${str(d, "status")}'.`,
  PORTAL_SESSION_NO_CLIENT_EMAIL: () =>
    "La sesion no tiene correo de contacto, no se puede enviar el enlace.",
  PORTAL_QUOTE_ACCEPT_INVALID_STATUS: (d) =>
    `No se puede aceptar una cotizacion en estado '${str(d, "status")}'.`,
  PORTAL_QUOTE_REJECT_INVALID_STATUS: (d) =>
    `No se puede rechazar una cotizacion en estado '${str(d, "status")}'.`,

  ACCOUNTING_INVOICE_NOT_FOUND: () => "Factura no encontrada.",
  ACCOUNTING_INVOICE_UPDATE_BLOCKED: (d) =>
    `No se puede modificar una factura en estado '${str(d, "status")}'.`,
  ACCOUNTING_INVOICE_DELETE_BLOCKED: (d) =>
    `No se puede eliminar una factura en estado '${str(d, "status")}'. ` +
    "Solo se pueden eliminar las de borrador, anuladas o canceladas.",
  ACCOUNTING_PAYMENT_INVOICE_BLOCKED: (d) =>
    `No se pueden registrar pagos en una factura en estado '${str(d, "status")}'.`,
  ACCOUNTING_PAYMENT_EXCEEDS_DUE: (d) =>
    `El pago de ${str(d, "amount")} supera el saldo pendiente de ${str(d, "amount_due")}.`,

  // Estos tres venian con el texto en espanol cocido en el backend. Ahora el
  // mensaje del servidor es ingles para logs y la frase se arma aqui.
  ACCOUNTING_LOGO_INVALID_FORMAT: () =>
    "El logo debe ser un data URI base64 de tipo image/png o image/jpeg.",
  ACCOUNTING_LOGO_INVALID_BASE64: () => "El logo no es base64 valido.",
  ACCOUNTING_LOGO_TOO_LARGE: (d) =>
    `El logo pesa ${str(d, "size_kb")} KB y el maximo son ${str(d, "max_kb")} KB. ` +
    "Reduce la imagen antes de subirla.",

  CONTRACT_NOT_FOUND: () => "Contrato no encontrado.",
  CONTRACT_CLAUSE_NOT_FOUND: () => "Clausula no encontrada.",
  CONTRACT_INVALID_TRANSITION: (d) =>
    `El contrato no puede pasar de '${str(d, "from")}' a '${str(d, "to")}'. ` +
    `Estados permitidos: ${list(d, "allowed", "ninguno (estado final)")}.`,
  CONTRACT_DELETE_NOT_DRAFT: (d) =>
    `No se puede eliminar un contrato en estado '${str(d, "status")}'. ` +
    "Solo se pueden eliminar los borradores.",
  CONTRACT_CLAUSES_LOCKED: (d) =>
    `No se pueden modificar las clausulas de un contrato en estado '${str(d, "status")}'.`,

  IDENTITY_WORKSPACE_SLUG_TAKEN: (d) =>
    `El identificador '${str(d, "slug")}' ya esta en uso.`,
  IDENTITY_EMAIL_TAKEN: () => "Ese correo ya esta registrado.",
  IDENTITY_INVALID_CREDENTIALS: () => "Correo o contrasena incorrectos.",
  IDENTITY_ACCOUNT_DISABLED: () =>
    "Esta cuenta esta desactivada. Contacta con un administrador.",
  IDENTITY_REFRESH_TOKEN_INVALID: () =>
    "Tu sesion ha caducado. Vuelve a iniciar sesion.",
  IDENTITY_PUBLIC_SITE_NOT_FOUND: () => "Sitio publico no encontrado.",
  IDENTITY_PUBLIC_SITE_SLUG_TAKEN: (d) =>
    `Ya existe un sitio publico con el identificador '${str(d, "slug")}'.`,

  // Los levanta core/deps.py, no un modulo: son los errores de auth que
  // devuelve cualquier ruta protegida.
  AUTH_TOKEN_INVALID: () => "Tu sesion ha caducado. Vuelve a iniciar sesion.",
  AUTH_ADMIN_REQUIRED: () =>
    "Necesitas permisos de administrador para hacer esto.",

  INVENTORY_PRODUCT_NOT_FOUND: () => "Producto no encontrado.",
  INVENTORY_SKU_TAKEN: (d) => `El SKU '${str(d, "sku")}' ya existe.`,
  INVENTORY_PRODUCT_IS_SERVICE: () =>
    "Los servicios no llevan control de inventario.",
  INVENTORY_INVALID_MOVEMENT_TYPE: (d) =>
    `Tipo de movimiento invalido: '${str(d, "movement_type")}'. ` +
    `Validos: ${list(d, "allowed")}.`,
  INVENTORY_INSUFFICIENT_STOCK: (d) =>
    `Stock insuficiente: se piden ${str(d, "requested")} y hay ` +
    `${str(d, "available")} ${str(d, "unit")} disponibles.`,

  HR_EMPLOYEE_NOT_FOUND: () => "Empleado no encontrado.",
  HR_DEPARTMENT_NOT_FOUND: () => "Departamento no encontrado.",
  HR_EMPLOYEE_INVALID_TRANSITION: (d) =>
    `El empleado no puede pasar de '${str(d, "from")}' a '${str(d, "to")}'. ` +
    `Estados permitidos: ${list(d, "allowed", "ninguno (estado final)")}.`,
  HR_EMPLOYEE_DELETE_TERMINATED: () =>
    "No se puede eliminar el registro de un empleado dado de baja. " +
    "Se conservan para la traza de auditoria.",

  DISCOVERY_SESSION_NOT_FOUND: () => "Sesion de descubrimiento no encontrada.",
  DISCOVERY_SESSION_ALREADY_COMPLETED: () =>
    "Esta sesion ya esta cerrada, no admite mas mensajes.",
  DISCOVERY_BLUEPRINT_MISSING: () =>
    "La sesion todavia no tiene blueprint. Generalo antes de aplicarlo.",
};

/**
 * Texto para el usuario a partir de un error de mutacion.
 *
 * Sin codigo, o con un codigo que todavia no esta mapeado, devuelve el mensaje
 * del backend. Esa reserva es deliberada: un modulo sin migrar sigue mostrando
 * su prosa en ingles, que es peor que el espanol pero mucho mejor que un
 * identificador crudo.
 */
export function translateApiError(error: unknown, fallback = "Ocurrio un error"): string {
  if (error instanceof ApiError && error.code) {
    const render = MESSAGES[error.code];
    if (render) return render(error.detail ?? {});
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
