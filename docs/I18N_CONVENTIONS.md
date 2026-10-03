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

Un fichero por dominio, no uno por idioma: unos mil textos en un JSON no se
revisan en un diff. Hoy: `common`, `auth`, `errors`, `workflows`, `dashboard`,
`discovery`, `settings`. Cada pagina migrada aporta el suyo (`crm`, `sales`, ...).
Lo que usan varias paginas va a `common`: el texto de cerrar, y los **enums
compartidos** (`crmStage`, `inventoryStatus`, `activityType`), para que `CRM`,
`Index` e `InventoryOrders` no los traduzcan cada una a su manera.

Un dominio nuevo hay que registrarlo tambien en `src/i18n/i18next.d.ts`, o sus
claves no se validan en compilacion.

## Claves: siempre cualificadas, con `useT()`

```tsx
const t = useT();                                   // de "@/i18n/useT"
t("auth:login.title")                               // si
t("workflows:card.runs", { count: n })              // con opciones, tambien
```

Usa `useT()`, **no** `useTranslation().t`. Con `strict: false` el tipo de
`useTranslation().t` no admite una llamada con opciones (interpolacion, `count`)
aunque la clave exista; `i18n.t` si, y `useT()` lo devuelve ya ligado y
suscrito al idioma (el componente se re-renderiza al cambiarlo).

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

## Valores que llegan como identificador (estados, tipos, etapas)

El backend manda `completed`, `low_stock`, `call`... y hasta ahora se pintaban
crudos, en ingles. `useEnumLabel()` los traduce y, si el catalogo no tiene la
entrada, muestra el valor tal cual: un estado nuevo en el backend no debe dejar un
hueco ni una clave a la vista.

```tsx
const label = useEnumLabel();
label("workflows:runStatus", run.status)        // "completada"
label("common:inventoryStatus", item.status)    // "stock bajo"
```

El primer argumento es la ruta cualificada del grupo en el catalogo. Las claves de
un grupo de enums no se validan en compilacion (el valor llega en runtime), asi que
las cubre el test de la pagina: un valor sin entrada cae al valor crudo, y eso es
lo que se comprueba.

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

**No pasa por i18next.** Usa `Intl`, detras de `src/i18n/format.ts`: funciones
puras que reciben el locale, y el hook `useFormat()` que las liga al idioma activo
y re-renderiza el componente al cambiarlo.

```tsx
const { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } = useFormat();

formatCurrency(invoice.total, invoice.currency)         // USD 1,234.50
formatCurrency(n, "USD", { maximumFractionDigits: 0 })  // sin decimales
formatDate(contract.end_date)                           // 30 sep 2026   (estilo "medium")
formatDate(emp.terminated_at, "short")                  // 30/9/2026
formatDateTime(event.created_at)                        // 30 sep 2026, 03:07 p.m.
formatPercent(quote.tax_rate)                           // 16%           (recibe la fraccion)
formatCompactCurrency(12500)                            // USD 12.5 k    (KPI y ejes de graficos)
formatMonthShort("2026-04")                             // abr           (desde YYYY-MM)
formatMonthYear("2026-04")                              // abr 26        (ejes con varios anios)
formatUnit(5, "day")                                    // 5d            (unidad corta, no un sufijo cableado)
formatRelativeTime(activity.created_at)                 // hace 5 min, ayer, ahora
formatMilliseconds(step.duration_ms)                    // 12ms
```

**Una regla de eslint lo hace cumplir** (`no-restricted-syntax`): fuera de
`src/i18n/format.ts` y de los tests, `toLocaleDateString` / `toLocaleTimeString` /
`toLocaleString` y `new Intl.NumberFormat` / `new Intl.DateTimeFormat` son un
error. `Intl.DisplayNames` y similares no estan restringidos.

Lo que los helpers deciden por ti:

- **El tag completo, no el idioma base.** `es-MX` formatea como `es-MX`; el formato
  varia por region aunque el catalogo no (ADR 0016, punto 4).
- **Un idioma sin region formatea con la region por defecto del producto**
  (`es` -> `es-MX`, `en` -> `en-US`). No es un detalle: `es` a secas formatea a la
  espanola (`1234,50 US$`), y el producto siempre ha formateado como `es-MX`
  (`USD 1,234.50`). Sin esa tabla, que el locale por defecto sea `es` habria
  cambiado todos los numeros de la aplicacion. Quien quiera el formato espanol fija
  `es-ES` y se respeta.
- **Un valor ausente o invalido** (`null`, `""`, `"not-a-date"`, `NaN`) se pinta
  como `—`, no como `Invalid Date` ni `NaN`; las paginas no necesitan su propio
  `if (x == null)`.
- **Un codigo de moneda que `Intl` no conoce** no lanza: se muestra la cifra con el
  codigo tal cual. Un `RangeError` por un dato del servidor dejaria la pagina en
  blanco.
- **Las fechas de solo dia** (`2026-09-30`, p. ej. `valid_until`) son fechas de
  calendario y se interpretan a medianoche *local*. `new Date("2026-09-30")` es
  medianoche UTC, que en Mexico es el 29 por la tarde.
- **`todayInputValue()`** para el valor por defecto de un `<input type="date">`:
  `new Date().toISOString().slice(0, 10)` da el dia en UTC y pasadas las 18:00 en
  Mexico ya es "manana".

Fuera de React no hay hook: usa las funciones puras con `i18n.language`.

Las unidades (`ms`, `k`, `M`), los nombres de mes y el tiempo relativo ("hace 5
min") son formato de `Intl`, no cadenas del catalogo: no los escribas a mano.

Todavia sin migrar: los importes compactos de `Analytics`, que siguen siendo
`$` + `toFixed` + `k`/`M` a mano.

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
entrega es la pagina completa, y dos comprobaciones complementarias la vigilan:

1. **El escaner estatico** (`src/test/hardcoded.ts`) lee el *codigo* y busca texto
   visible cableado: texto en JSX, atributos que el usuario lee (`placeholder`,
   `title`, `aria-label`...), literales devueltos por una expresion JSX, argumentos
   de `toast` / `setError` / `translateApiError` y etiquetas de tablas de datos.
   Cubre lo que un render no alcanza: toasts de error, dialogos cerrados, ramas.
   **Al migrar una pagina se anade a `MIGRATED` en `src/test/migrated-pages.test.ts`**
   y desde ese momento no puede volver a tener texto cableado. Lo que no es de
   ningun idioma (una unidad, un nombre propio) se marca con un comentario
   `i18n-ok` en la misma linea, con el motivo.
2. **El render con catalogo pseudo-localizado** ve lo que el escaner no: lo que se
   *pinta*. `createPseudoInstance("en")` (`src/test/i18n.tsx`) da un idioma donde
   cada cadena es `EN(<original>)`; todo texto visible debe llevar ese prefijo. Se
   renderiza cada estado donde hay texto (la pagina, cada dialogo, cada pestana) y
   se pasa por `notFromCatalogue`, que descarta lo que no viene del catalogo:
   datos del backend sembrados en el test, fechas y numeros ya formateados
   (`FORMATTED_CURRENCY`, `FORMATTED_RELATIVE`) e iniciales de avatar.

Ademas: **el comportamiento en espanol intacto** (los mismos tests contra el
catalogo real, incluidos los valores que el catalogo no conoce) y `npm run
typecheck`, `npm run lint` y `npm test` en verde.

`Login.test.tsx` es el modelo de una pagina sencilla; `Workflows.test.tsx`,
`Index.test.tsx`, `Discovery.test.tsx` y `Settings.test.tsx` lo son de paginas con
datos, dialogos y pestanas (servicios mockeados, `renderPageWithI18n`).

Dos cosas de jsdom que los tests de pagina dan por hechas y estan en
`src/test/setup.ts`: `ResizeObserver` y `scrollIntoView` (los usan los graficos de
recharts y los chats). El `testTimeout` es de 15 s: estas pruebas tardan 2-3 s en una
maquina holgada y bastante mas en el runner de CI.

Se ignoran las cadenas sin ninguna letra (`••••••••`).

Dos trampas de jsdom al probar un `Select` de Radix: no rellena `pointerType`, asi que
`fireEvent.pointerDown` no lo abre (abrelo con `fireEvent.keyDown(combobox, { key: "Enter" })`),
y falta la captura de puntero (`hasPointerCapture`, `setPointerCapture`,
`releasePointerCapture`: stubs en el `beforeAll` del test, como en `Invoicing.test.tsx`).

El control positivo del escaner (`hardcoded.test.ts`) lee `src/test/fixtures/unmigrated-page.tsx.txt`,
una copia congelada de `PortalBuilder` antes de migrarla: ya no queda ninguna pagina sin
migrar que sirva de control. Es `.txt` a proposito, para que ni el typecheck ni el linter ni
`MIGRATED` la traten como codigo de la app.

### Al encontrar texto en inglés en una pagina en español

No es parte "ya traducida": es un bug (el ADR 0015 ya lo cuenta asi). Se traduce al
catalogo `es` en la misma migracion. Las paginas heredadas mezclan idiomas y la
migracion es el momento de arreglarlo, no de conservarlo.

## Anadir un idioma

1. Crear `locales/<idioma>/` con un fichero por dominio, las mismas claves que `es`.
2. Nada mas: aparece en `SUPPORTED_LOCALES` y en el selector.
3. Falta por automatizar (plan de i18n, seccion Verificacion): la paridad entre
   catalogos y el chequeo de claves usadas y no definidas, o al reves. Hasta
   entonces, una clave que falte en el idioma nuevo cae al texto en espanol.

## Artefactos que renderiza el servidor

El backend responde codigos y datos y no tiene prosa (ADR 0014). Lo que el servidor
*dibuja* y entrega hecho —las etiquetas del PDF de factura y los nueve correos—
no pasa por ningun catalogo del frontend, y tiene los suyos:

| Que | Donde |
|---|---|
| Catalogos | `backend/app/core/i18n/locales/<idioma>/<dominio>.json` |
| Cargador y `translate()` | `backend/app/core/i18n/catalogue.py` |
| Idioma efectivo de un usuario | `app.core.deps.resolve_user_locale` (`get_current_locale` en una ruta) |

```python
from app.core.i18n.catalogue import exists, translate

translate("invoice_pdf:status.paid", locale)              # "Pagada"
translate("invoice_pdf:footer", locale, number="INV-7")   # marcadores {nombre}, no {{nombre}}
```

- **Mismas reglas que el frontend**: un fichero por dominio, enviar un idioma es que
  aparezca su carpeta, y un tag regional (`es-MX`) cae al catalogo base.
- **El idioma lo resuelve quien llama, una vez**, y se pasa como parametro
  (`generate_invoice_pdf(..., locale=locale)`). Nadie lee `user.locale` directamente. Hay dos
  resoluciones, segun quien lea el artefacto: `resolve_user_locale` para un usuario (el PDF, los
  correos internos: el idioma es el del destinatario) y `resolve_portal_locale` para quien recibe
  un enlace de portal (los dos correos al cliente: `portal_sessions.locale` -> workspace -> `es`).
- **Una clave que no existe es un error** (`KeyError`), no un texto de reserva: se
  imprimiria `invoice_pdf:typo` en un documento que se entrega a un cliente. Un valor
  que llega del backend y puede ser nuevo (un estado) se pide con `exists()` y cae al valor.
- **No hay plurales ni formato de fechas e importes por idioma todavia.** Cuando un texto
  tenga que contar cosas, o se envie el segundo idioma, se decide `babel` o una tabla propia.
- **Como se prueba**: el catalogo `es` se comprueba contra lo que el artefacto siempre
  dijo, y el parametro `locale` con un catalogo pseudo-localizado inyectado en
  `load_catalogues` (`tests/test_invoice_pdf_locale.py`): una etiqueta cableada sale sin
  el prefijo `EN(`. `tests/test_i18n_catalogue.py` fija la paridad entre idiomas.
  Para un artefacto de texto largo (los correos) el golden va aparte: la salida exacta *antes*
  de migrar, congelada en `tests/data/`, y el segundo idioma pone en MAYUSCULAS cada mensaje
  del catalogo; con datos de prueba tambien en mayusculas, toda palabra en minusculas que
  sobreviva es texto cableado (`tests/test_email_templates.py`).
- **HTML en el catalogo.** Un mensaje puede llevar etiquetas en linea (`<strong>{x}</strong>`)
  cuando la frase es una sola, y la estructura (tablas, estilos) se queda en el codigo. Lo
  que se interpola en un mensaje de HTML llega ya escapado: el catalogo no escapa nada.
