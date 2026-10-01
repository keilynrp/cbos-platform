import "i18next";

import auth from "../locales/es/auth.json";
import common from "../locales/es/common.json";
import errors from "../locales/es/errors.json";

/**
 * Tipa `t()` contra el catalogo de desarrollo (`es`): una clave estatica que no
 * existe ahi falla en `npm run typecheck`, que es la primera linea de defensa
 * contra el "clave que nadie definio" (ADR 0015, Verificacion).
 *
 * Los codigos de error son la excepcion: llegan del servidor en runtime y
 * `translateApiError` los resuelve con `i18n.exists` antes de pedirlos.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      errors: typeof errors;
    };
  }
}
