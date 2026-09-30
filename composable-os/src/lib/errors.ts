import i18n from "@/i18n";
import { ApiError } from "@/lib/api";

/**
 * Traduccion de codigos de error del backend a texto para el usuario.
 *
 * El backend manda un `code` estable y un `message` en ingles pensado para
 * logs; el texto que lee el usuario sale del catalogo `errors` del idioma
 * activo (`src/locales/<idioma>/errors.json`). Ver ADR 0010, ADR 0015 y el
 * registro en docs/ERROR_CODE_REGISTRY_V1.md.
 *
 * Cada plantilla recibe el `detail` que acompano al codigo, con los valores ya
 * separados: la frase se arma aqui y no viene interpolada desde el servidor.
 * Los valores llegan a i18next por `replace`, no como opciones sueltas: un
 * `detail` con una clave `count` o `context` no debe activar la pluralizacion ni
 * la seleccion de variante por accidente.
 *
 * Una lista se une con ", ". Si alguna esta vacia se pide la variante `_empty`
 * de la clave, cuando existe (las transiciones: "ninguno (estado final)"), y si
 * no existe cae a la plantilla base. La redaccion de ese caso es del catalogo,
 * no de este codigo, para que se pueda traducir.
 */

type Detail = Record<string, unknown>;

type Params = { replace: Record<string, string>; context?: "empty" };

function toParams(detail: Detail | undefined): Params {
  const replace: Record<string, string> = {};
  let hasEmptyList = false;

  for (const [key, value] of Object.entries(detail ?? {})) {
    if (Array.isArray(value)) {
      if (value.length === 0) hasEmptyList = true;
      replace[key] = value.join(", ");
    } else if (value !== undefined && value !== null) {
      replace[key] = String(value);
    }
  }

  return { replace, context: hasEmptyList ? "empty" : undefined };
}

/**
 * Texto para el usuario a partir de un error de mutacion.
 *
 * Sin codigo, o con un codigo que todavia no esta en el catalogo, devuelve el
 * mensaje del backend. Esa reserva es deliberada: un codigo sin traducir sigue
 * mostrando su prosa en ingles, que es peor que la traduccion pero mucho mejor
 * que un identificador crudo.
 */
export function translateApiError(error: unknown, fallback?: string): string {
  // `t` tipado solo admite las claves estaticas del catalogo; los codigos
  // llegan del servidor en runtime, asi que aqui se usa la firma abierta.
  const translate = i18n.t as unknown as (key: string, options: object) => string;

  if (error instanceof ApiError && error.code && i18n.exists(error.code, { ns: "errors" })) {
    return translate(error.code, { ns: "errors", ...toParams(error.detail) });
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback ?? i18n.t("common:error.generic");
}
