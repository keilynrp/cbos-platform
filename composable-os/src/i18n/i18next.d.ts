import "i18next";

import analytics from "../locales/es/analytics.json";
import auth from "../locales/es/auth.json";
import common from "../locales/es/common.json";
import companyProfile from "../locales/es/companyProfile.json";
import customerPortal from "../locales/es/customerPortal.json";
import dashboard from "../locales/es/dashboard.json";
import discovery from "../locales/es/discovery.json";
import errors from "../locales/es/errors.json";
import settings from "../locales/es/settings.json";
import workflows from "../locales/es/workflows.json";

/**
 * Tipa `t()` contra el catalogo de desarrollo (`es`): una clave estatica que no
 * existe ahi falla en `npm run typecheck`, que es la primera linea de defensa
 * contra el "clave que nadie definio" (ADR 0015, Verificacion).
 *
 * Los codigos de error y los valores de enums llegan del servidor en runtime:
 * `translateApiError` y `useEnumLabel` los resuelven con `i18n.exists` antes de
 * pedirlos.
 *
 * Al crear un dominio nuevo (`locales/es/<dominio>.json`) hay que anadirlo aqui.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      analytics: typeof analytics;
      companyProfile: typeof companyProfile;
      customerPortal: typeof customerPortal;
      dashboard: typeof dashboard;
      discovery: typeof discovery;
      auth: typeof auth;
      errors: typeof errors;
      settings: typeof settings;
      workflows: typeof workflows;
    };
  }
}
