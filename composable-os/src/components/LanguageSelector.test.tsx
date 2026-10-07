import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageSelector } from "@/components/LanguageSelector";
import i18n from "@/i18n";
import { ApiError } from "@/lib/api";

const changeLocale = vi.fn();
const toast = vi.fn();

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ changeLocale }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

beforeEach(() => {
  changeLocale.mockReset().mockResolvedValue(undefined);
  toast.mockReset();
});

afterEach(async () => {
  await i18n.changeLanguage("es");
});

describe("LanguageSelector", () => {
  it("draws nothing while there is only one language to choose", () => {
    // Un desplegable de una opcion es ruido: el selector aparece cuando hay
    // algo que elegir, sin tocar nada mas.
    const { container } = render(<LanguageSelector locales={["es"]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("offers each language written in itself", () => {
    render(<LanguageSelector locales={["es", "en"]} />);

    expect(screen.getByLabelText("Idioma")).toHaveValue("es");
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  it("shows the base language when the active locale carries a region", async () => {
    await i18n.changeLanguage("es-MX");
    render(<LanguageSelector locales={["es", "en"]} />);

    expect(screen.getByLabelText("Idioma")).toHaveValue("es");
  });

  it("asks to change the locale when another language is picked", async () => {
    render(<LanguageSelector locales={["es", "en"]} />);

    fireEvent.change(screen.getByLabelText("Idioma"), { target: { value: "en" } });

    await waitFor(() => expect(changeLocale).toHaveBeenCalledWith("en"));
  });

  it("reports a failed save with the translated backend error", async () => {
    changeLocale.mockRejectedValue(
      new ApiError("Locale is not supported.", "IDENTITY_LOCALE_UNSUPPORTED", { supported: ["es"] }, 422),
    );
    render(<LanguageSelector locales={["es", "en"]} />);

    fireEvent.change(screen.getByLabelText("Idioma"), { target: { value: "en" } });

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        description: "Ese idioma no esta disponible. Idiomas disponibles: es.",
        variant: "destructive",
      }),
    );
  });
});
