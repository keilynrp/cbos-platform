import ts from "typescript";

/**
 * Escaner estatico de cadenas visibles cableadas en un componente.
 *
 * Es la otra mitad de la prueba de "pagina migrada entera" (ver
 * docs/I18N_CONVENTIONS.md). El test con catalogo pseudo-localizado solo ve lo
 * que se pinta en el estado que se renderiza; este mira el codigo, asi que cubre
 * tambien los toasts de error, los dialogos cerrados y las ramas que un render no
 * alcanza.
 *
 * Es heuristico y conservador: busca texto en JSX, atributos que el usuario lee,
 * literales devueltos por una expresion JSX, argumentos de `toast`/`setError`/
 * `translateApiError` y etiquetas de tablas de datos. Lo que no es de ningun
 * idioma (una unidad como "ms", un nombre propio) se marca con un comentario
 * `i18n-ok` en la misma linea.
 */

export interface HardcodedString {
  line: number;
  kind: string;
  text: string;
}

/** Atributos cuyo valor lee el usuario. */
const USER_ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "description"]);

/** Claves de objeto que suelen guardar texto visible en tablas de datos. */
const TEXT_KEYS = new Set([
  "label", "title", "description", "placeholder", "desc", "text", "message", "subtitle", "header", "hint", "tagline",
]);

const CALL_LITERALS = /^(toast|toast\.(error|success|info|warning)|setError|alert)$/;

const hasLetters = (text: string) => /\p{L}/u.test(text.replace(/\$\{[^}]*\}/g, ""));

export function findHardcodedStrings(source: string, fileName = "file.tsx"): HardcodedString[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
  const lines = source.split("\n");
  const found: HardcodedString[] = [];

  const lineOf = (position: number) => sf.getLineAndCharacterOfPosition(position).line + 1;
  const add = (kind: string, position: number, raw: string) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text || !hasLetters(text)) return;
    const line = lineOf(position);
    if (lines[line - 1]?.includes("i18n-ok")) return;
    found.push({ line, kind, text });
  };

  const isStringLike = (node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression =>
    ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node);

  const textOf = (node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression) =>
    ts.isTemplateExpression(node) ? node.getText(sf).slice(1, -1) : node.text;

  /** Un literal que es argumento directo de una llamada a toast/setError/alert. */
  const callLiteralKind = (node: ts.Node): string | null => {
    const parent = node.parent;

    if (ts.isCallExpression(parent)) {
      const callee = parent.expression.getText(sf);
      if (CALL_LITERALS.test(callee) && parent.arguments[0] === node) return "call";
      // translateApiError(err, "texto de reserva")
      if (callee === "translateApiError" && parent.arguments[1] === node) return "call";
    }

    // toast({ title: "...", description: "..." })
    if (ts.isPropertyAssignment(parent) && ts.isObjectLiteralExpression(parent.parent)) {
      const call = parent.parent.parent;
      const key = parent.name.getText(sf);
      if (
        ts.isCallExpression(call) &&
        CALL_LITERALS.test(call.expression.getText(sf)) &&
        (key === "title" || key === "description")
      ) {
        return "call";
      }
    }
    return null;
  };

  /**
   * Sube desde un literal por operadores de ramificacion (`?:`, `&&`, `||`, `??`,
   * parentesis) hasta el contenedor JSX, si lo hay. Cualquier otro camino
   * (argumento de una funcion, propiedad, etc.) no es "texto pintado tal cual".
   */
  const jsxContainerOf = (node: ts.Node): ts.JsxExpression | null => {
    let current: ts.Node = node;
    while (current.parent) {
      const parent = current.parent;
      if (ts.isJsxExpression(parent)) return parent;
      const passes =
        ts.isParenthesizedExpression(parent) ||
        ts.isConditionalExpression(parent) ||
        (ts.isBinaryExpression(parent) &&
          [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(
            parent.operatorToken.kind,
          ));
      if (!passes) return null;
      // En `a ? x : y` la condicion `a` no se pinta; solo las ramas.
      if (ts.isConditionalExpression(parent) && parent.condition === current) return null;
      current = parent;
    }
    return null;
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf);
      const offset = text.search(/\S/);
      if (offset >= 0) add("jsx-text", node.getStart(sf, false) + offset, text);
    } else if (isStringLike(node)) {
      const text = textOf(node);
      const call = callLiteralKind(node);

      if (call) {
        add(call, node.getStart(sf), text);
      } else if (ts.isJsxAttribute(node.parent) && USER_ATTRS.has(node.parent.name.getText(sf))) {
        add(`attr:${node.parent.name.getText(sf)}`, node.getStart(sf), text);
      } else {
        const container = jsxContainerOf(node);
        if (container) {
          const owner = container.parent;
          if (ts.isJsxAttribute(owner)) {
            const name = owner.name.getText(sf);
            if (USER_ATTRS.has(name)) add(`attr:${name}`, node.getStart(sf), text);
          } else {
            add("jsx-expr", node.getStart(sf), text);
          }
        } else if (
          ts.isPropertyAssignment(node.parent) &&
          node.parent.initializer === node &&
          TEXT_KEYS.has(node.parent.name.getText(sf))
        ) {
          add(`prop:${node.parent.name.getText(sf)}`, node.getStart(sf), text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found.sort((a, b) => a.line - b.line);
}
