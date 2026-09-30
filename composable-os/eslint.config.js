import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `dist` es salida de build. `src/pages/_archived` son 25 paginas retiradas
  // que nada importa y Vite no empaqueta: su codigo no se ejecuta, asi que
  // lintearlo solo produce ruido. Misma exclusion que en tsconfig.app.json.
  { ignores: ["dist", "src/pages/_archived"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Moneda, numeros y fechas se formatean solo a traves de `src/i18n/format.ts`
      // (`useFormat` en componentes). Antes habia ~28 llamadas sueltas que
      // decidian el locale cada una por su cuenta —`"es-MX"` cableado, `"en-US"`
      // o el del navegador— y la misma cifra salia distinta segun la pagina.
      // Ver docs/I18N_CONVENTIONS.md.
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]",
          message:
            "No uses toLocale*String: formatea con useFormat() de '@/i18n/useFormat' (o las funciones de '@/i18n/format').",
        },
        {
          selector: "NewExpression[callee.object.name='Intl'][callee.property.name=/^(NumberFormat|DateTimeFormat)$/]",
          message:
            "No construyas Intl.NumberFormat/DateTimeFormat: formatea con useFormat() de '@/i18n/useFormat' (o las funciones de '@/i18n/format').",
        },
      ],
    },
  },
  // Donde si se construyen los formateadores, y las pruebas que los comparan con
  // las expresiones antiguas.
  {
    files: ["src/i18n/format.ts", "**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  },
);
