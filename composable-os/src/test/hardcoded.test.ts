import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findHardcodedStrings } from "@/test/hardcoded";

const find = (source: string) => findHardcodedStrings(source).map((f) => `${f.kind}: ${f.text}`);

/**
 * El escaner es el control positivo de `migrated-pages.test.ts`: un check que
 * pasa porque no encuentra nada, sin poder encontrar nada, no comprueba nada.
 * Aqui se fija lo que SI debe detectar y lo que NO debe tocar.
 */
describe("findHardcodedStrings: lo que detecta", () => {
  it("text inside JSX", () => {
    expect(find(`const A = () => <p>Hola mundo</p>;`)).toEqual(["jsx-text: Hola mundo"]);
  });

  it("user-facing attributes", () => {
    const found = find(
      `const A = () => <input placeholder="Tu nombre" title="Ayuda" aria-label="Campo" alt="Logo" />;`,
    );
    expect(found).toEqual([
      "attr:placeholder: Tu nombre",
      "attr:title: Ayuda",
      "attr:aria-label: Campo",
      "attr:alt: Logo",
    ]);
  });

  it("literals returned by an expression in JSX", () => {
    expect(find(`const A = ({ok}) => <p>{ok ? "Listo" : "Pendiente"}</p>;`)).toEqual([
      "jsx-expr: Listo",
      "jsx-expr: Pendiente",
    ]);
  });

  it("a literal expression container", () => {
    expect(find(`const A = () => <p>{"Suelta"}</p>;`)).toEqual(["jsx-expr: Suelta"]);
  });

  it("toast and setError calls", () => {
    const found = find(`
      toast({ title: "Guardado", description: "Todo bien", variant: "destructive" });
      toast.error("Fallo");
      toast.success("Hecho");
      setError("Mala contrasena");
    `);
    expect(found).toEqual([
      "call: Guardado",
      "call: Todo bien",
      "call: Fallo",
      "call: Hecho",
      "call: Mala contrasena",
    ]);
  });

  it("the fallback argument of translateApiError", () => {
    expect(find(`setMsg(translateApiError(err, "No se pudo"));`)).toEqual(["call: No se pudo"]);
  });

  it("labels in a data table that the page renders", () => {
    const found = find(`const ROWS = [{ label: "Activos", desc: "Los que trabajan" }];`);
    expect(found).toEqual(["prop:label: Activos", "prop:desc: Los que trabajan"]);
  });

  it("the words of a template literal, not its placeholders", () => {
    expect(find("toast.success(`Se creo ${name}`);")).toEqual(["call: Se creo ${name}"]);
  });

  it("reports the line", () => {
    const [found] = findHardcodedStrings(`const a = 1;\nconst B = () => <p>Hola</p>;`);
    expect(found.line).toBe(2);
  });
});

describe("findHardcodedStrings: lo que no toca", () => {
  it("strings that are not visible text", () => {
    const source = `
      const A = () => (
        <div className="flex gap-2" id="main" data-testid="x" role="dialog">
          <Button variant="outline" type="submit" size="sm" />
          <Link to="/login" />
          <Input value="abc" name="email" htmlFor="email" />
        </div>
      );
    `;
    expect(find(source)).toEqual([]);
  });

  it("class names chosen by a ternary", () => {
    expect(find(`const A = ({on}) => <p className={on ? "text-red-500" : "text-green-500"}>{t("x:y")}</p>;`)).toEqual([]);
  });

  it("translated text", () => {
    expect(find(`const A = () => <p>{t("auth:login.title")}</p>;`)).toEqual([]);
  });

  it("whitespace and punctuation-only text", () => {
    expect(find(`const A = () => <p> · {" "} — / 12 %</p>;`)).toEqual([]);
  });

  it("imports, keys and ordinary identifiers", () => {
    expect(find(`import { a } from "@/lib/errors"; const k = "some_key"; type T = "draft" | "sent";`)).toEqual([]);
  });

  it("a line marked i18n-ok", () => {
    // Para lo que no es de ningun idioma: una unidad ("ms"), un nombre propio.
    const source = [
      "const A = () => (",
      "  <p>",
      "    Hola",
      "    <span>ms</span> {/* i18n-ok */}",
      "  </p>",
      ");",
      "const B = () => <b>PostgreSQL</b>; // i18n-ok",
    ].join("\n");
    expect(find(source)).toEqual(["jsx-text: Hola"]);
  });
});

/** Las paginas migradas de verdad no deben tener ninguna. Es el test que las vigila. */
describe("the scanner against a real migrated page", () => {
  it("finds nothing in Login.tsx", () => {
    const source = readFileSync(resolve(__dirname, "../pages/Login.tsx"), "utf8");

    // El nombre del producto no se traduce.
    expect(find(source).filter((f) => f !== "jsx-text: CBOS Platform")).toEqual([]);
  });

  it("does find the strings in a page that is not migrated yet", () => {
    // Control positivo sobre codigo real: si esto pasa a 0, el escaner esta roto.
    const source = readFileSync(resolve(__dirname, "../pages/Contracts.tsx"), "utf8");

    expect(find(source).length).toBeGreaterThan(20);
  });
});
