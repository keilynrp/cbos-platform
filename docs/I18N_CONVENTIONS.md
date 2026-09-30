# Convenciones de i18n del frontend

Como escribir y revisar cadenas traducibles. La decision de fondo esta en
[ADR 0014](adr/0014-internationalization-strategy.md) (estrategia),
[ADR 0015](adr/0015-promote-react-i18next-for-frontend-i18n.md) (libreria) y
[ADR 0016](adr/0016-locale-ownership-and-resolution.md) (de quien es el idioma).
Esto es la parte operativa, y existe porque el ADR 0015 lo dice: la API de
`react-i18next` es mucho mayor que lo que este producto usa, asi que las
convenciones se fijan por revision, no por la libreria.

`Login.tsx` es la pagina de referencia: una pagina migrada entera, con su test.

---

## Donde vive cada cosa

| Que | Donde |
|---|---|
| Catalogos | `composable-os/src/locales/<idioma>/<dominio>.json` |
| Instancia y ajustes de i18next | `src/i18n/index.ts` (`buildI18nOptions`) |
| Descubrimiento de catalogos | `src/i18n/resources.ts` (por carpeta) |
| Normalizar y detectar locale | `src/i18n/locale.ts` (funciones puras) |
| Errores del backend | `src/lib/errors.ts` + `locales/<idioma>/errors.json` |
| Selector de idioma | `src/components/LanguageSelector.tsx` |

**Enviar un idioma es que aparezca su carpeta en `locales/`.** No hay lista que
mantener: `SUPPORTED_LOCALES` y `supportedLngs` salen de las carpetas.

## Dominios (namespaces)

Un fichero por dominio, no uno por idioma: 514 cadenas en un JSON no se revisan
en un diff. Hoy: `common`, `auth`, `errors`. Cada pagina migrada aporta el suyo
(`crm`, `sales`, ...). Lo que usan varias paginas va a `common`.

## Claves: siempre cualificadas

```tsx
const { t } = useTranslation();
t("auth:login.title")            // si
```

**No** `useTranslation("auth")` + `t("login.title")`. El proyecto compila con
`strict: false`, y con `strictNullChecks` apagado el tipo de i18next colapsa el
namespace del hook a `common`: las claves relativas dejan de aceptarse. Con la
clave completa el compilador valida que exista en el catalogo `es`, y una errata
rompe `npm run typecheck`. Ademas se puede rastrear con `grep`, que es lo que
necesitara el check de cadenas huerfanas.

Nombres en `camelCase`, agrupados por pantalla o componente: `login.title`,
`login.showPassword`. Un nombre describe el papel del texto, no su contenido
("submit", no "entrar").

## Interpolacion, nunca concatenacion

```json
"paid": "Pagada el {{date}}"
```
```tsx
t("invoicing:paid", { date })      // si
"Pagada el " + date                // no: el orden de palabras no es traducible
```

`escapeValue` esta desactivado a proposito: React ya escapa al pintar, y con el
escape de i18next un `'` llegaria como `&#39;`.

## Plurales

Con `count` y sufijos `_one` / `_other` (reglas CLDR de cada idioma):

```json
"paid_one": "{{count}} factura pagada",
"paid_other": "{{count}} facturas pagadas"
```
```tsx
t("invoicing:paid", { count: n })
```

Nunca `n === 1 ? "" : "s"`: son los cuatro bugs de plural que motivaron el ADR
0015. Un idioma con mas formas plurales anade las suyas en su catalogo sin tocar
codigo.

## Errores del backend

El backend manda un `code` estable; el texto sale del catalogo `errors` del idioma
activo. Cada codigo registrado en `ERROR_CODE_REGISTRY_V1.md` tiene una clave con
su nombre, y `translateApiError` la resuelve con el `detail` como valores.

- Las claves de `detail` que la plantilla usa se escriben `{{clave}}`.
- Una lista se une con `", "`. Si esta vacia se pide la variante `<CODIGO>_empty`
  cuando existe (las transiciones de estado: "ninguno (estado final)"), y si no,
  cae a la plantilla base. Esa redaccion es del catalogo, para poder traducirla.
- El `detail` entra por `replace`, no como opciones sueltas: una clave `count` o
  `context` en el `detail` no activa plurales ni variantes.
- **El `detail` documentado es un contrato** (registro, regla 3). Si el backend
  omite una clave, la plantilla la pinta vacia; no hay texto de reserva por clave.
- Un codigo que el catalogo no tiene cae al `message` en ingles del backend, y
  sin `message`, al texto generico (`common:error.generic`). Nunca al
  identificador crudo.

`scripts/ci/check_error_registry.py` falla si un codigo registrado no esta en
`errors.json`, o si una variante `_empty` no tiene su plantilla base.

## Formateo de fechas, moneda y numeros

**No pasa por i18next.** Usa `Intl` y `date-fns` (ya en el stack) detras de
helpers que leen el locale activo (tarea 4 del plan). El locale que se les pasa
es el tag completo (`es-MX`), no el idioma base: el formato varia por region
aunque el catalogo no (ADR 0016, punto 4).

## Como se decide el idioma

- **Con sesion:** manda el servidor. `GET /auth/me` devuelve `effective_locale`,
  ya resuelto (`users.locale` -> `workspaces.default_locale` -> `"es"`). El
  cliente lo aplica; **no reimplementa esa cadena.**
- **Sin usuario** (login, registro): lo que el usuario eligio antes en este
  navegador (`localStorage`, `cbos.locale`), luego `navigator.languages`, luego
  `es`. `detectLocale` en `src/i18n/locale.ts`.
- Cambiar de idioma con sesion hace `PATCH /auth/me`; sin ella, solo lo recuerda.
- `LanguageSelector` no se dibuja mientras haya un solo idioma enviado.

## Que exige una pagina migrada

Una pantalla a medio traducir se lee como rota y es peor que ninguna. La unidad de
entrega es la pagina completa, y su test la comprueba:

1. **Sin cadenas cableadas.** Se renderiza con un catalogo `en` pseudo-localizado
   (`createPseudoInstance("en")` en `src/test/i18n.tsx`), donde cada cadena es
   `EN(<original>)`. Todo texto visible debe llevar ese prefijo; lo que no, es una
   cadena que se escapo. `Login.test.tsx` es el modelo.
2. **Comportamiento en espanol intacto.** Los mismos tests contra el catalogo real.
3. **`npm run typecheck`, `npm run lint` y `npm test`** en verde.

Se ignoran las cadenas sin ninguna letra (`••••••••`) y el nombre del producto.

## Anadir un idioma

1. Crear `locales/<idioma>/` con un fichero por dominio, las mismas claves que `es`.
2. Nada mas: aparece en `SUPPORTED_LOCALES` y en el selector.
3. Falta por automatizar (plan de i18n, seccion Verificacion): la paridad entre
   catalogos y el chequeo de claves usadas y no definidas, o al reves. Hasta
   entonces, una clave que falte en el idioma nuevo cae al texto en espanol.
