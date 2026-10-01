import { useT } from "@/i18n/useT";

/**
 * Texto para lectores de pantalla del boton de cerrar de `Dialog` y `Sheet`.
 *
 * Es un componente y no un `t()` en linea porque los componentes de shadcn
 * devuelven JSX directamente desde una funcion flecha, sin cuerpo donde llamar
 * a un hook.
 */
export function CloseLabel() {
  const t = useT();
  return <span className="sr-only">{t("common:close")}</span>;
}
