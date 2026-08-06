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

const list = (d: Detail, k: string) =>
  Array.isArray(d?.[k]) && (d[k] as unknown[]).length
    ? (d[k] as unknown[]).join(", ")
    : "ninguno (estado final)";

const MESSAGES: Record<string, (d: Detail) => string> = {
  PROJECT_NOT_FOUND: () => "Proyecto no encontrado.",
  PROJECT_INVALID_TRANSITION: (d) =>
    `No se puede pasar de '${str(d, "from")}' a '${str(d, "to")}'. ` +
    `Estados permitidos: ${list(d, "allowed")}.`,
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
    `Estados permitidos: ${list(d, "allowed")}.`,
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
