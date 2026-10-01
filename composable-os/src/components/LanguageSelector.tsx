import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_LOCALES } from "@/i18n";
import { catalogueFor } from "@/i18n/locale";
import { useT } from "@/i18n/useT";
import { useAuth } from "@/lib/auth";
import { translateApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

/** El idioma escrito en si mismo ("Espanol", "English"), sin pasar por un catalogo. */
function languageName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    return code;
  }
}

interface Props {
  /** Idiomas ofrecidos. Por defecto, los que tienen catalogo enviado. */
  locales?: readonly string[];
  className?: string;
}

/**
 * Selector de idioma de la interfaz.
 *
 * Con un solo catalogo enviado no se dibuja: un desplegable de una opcion es
 * ruido. Aparece solo cuando hay algo que elegir, sin tocar nada mas.
 *
 * Con sesion iniciada el cambio se guarda en el servidor (`users.locale`); sin
 * ella se recuerda en este navegador.
 */
export function LanguageSelector({ locales = SUPPORTED_LOCALES, className }: Props) {
  const t = useT();
  const { i18n } = useTranslation();
  const { changeLocale } = useAuth();
  const { toast } = useToast();

  if (locales.length < 2) return null;

  // La lista ofrece idiomas base: `es-MX` se muestra como "Espanol".
  const current = catalogueFor(i18n.language, locales);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label htmlFor="language-select" className="text-xs text-muted-foreground">
        {t("common:language.label")}
      </Label>
      <select
        id="language-select"
        value={current}
        onChange={(event) => {
          changeLocale(event.target.value).catch((err: unknown) =>
            toast({ description: translateApiError(err), variant: "destructive" }),
          );
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {languageName(code)}
          </option>
        ))}
      </select>
    </div>
  );
}
