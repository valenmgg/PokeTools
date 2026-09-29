# PokéTools

Pokédex, movimientos, tipos, comparador, generador y analizador de equipos, herramientas y minijuegos Pokémon. HTML + CSS + JavaScript vanilla (sin frameworks), datos en vivo de la [PokéAPI](https://pokeapi.co). Pensada para desplegarse como sitio 100% estático en Vercel.

Esta es la **segunda etapa** del proyecto: la primera entregó la funcionalidad completa; esta se enfocó en **URLs reales, SEO técnico, diseño propio, responsive, accesibilidad y rendimiento**, sin tocar la lógica de datos que ya funcionaba (Pokédex, comparador, generador/analizador de equipos, los 8 juegos, etc. son los mismos algoritmos de antes).

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Cómo correrlo en local](#cómo-correrlo-en-local)
3. [Cómo probar las funciones](#cómo-probar-las-funciones)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Routing con URLs reales](#routing-con-urls-reales)
6. [`vercel.json` y despliegue](#vercerjson-y-despliegue)
7. [PokéAPI, caché y localStorage](#pokéapi-caché-y-localstorage)
8. [SEO técnico](#seo-técnico)
9. [`sitemap.xml`](#sitemapxml)
10. [`robots.txt`](#robotstxt)
11. [Google Search Console](#google-search-console)
12. [Accesibilidad](#accesibilidad)
13. [Modo oscuro](#modo-oscuro)
14. [Monetización futura](#monetización-futura)
15. [Seguridad](#seguridad)
16. [Limitaciones conocidas](#limitaciones-conocidas)
17. [Cómo agregar una herramienta o un juego](#cómo-agregar-una-herramienta-o-un-juego)
18. [Verificación realizada / no realizada](#verificación-realizada--no-realizada)

## Funcionalidades

- **Pokédex** (`/pokedex`): búsqueda por nombre/número, filtros por tipo y generación, orden (número, nombre, estadísticas), carga progresiva.
- **Ficha de Pokémon** (`/pokemon/:nombre`): imagen, tipos, estadísticas con barras, habilidades, movimientos (con buscador), debilidades/resistencias/inmunidades, cadena evolutiva enlazada, Pokémon anterior/siguiente. Metadatos SEO únicos por Pokémon.
- **Movimientos** (`/moves`, `/move/:nombre`): buscador por nombre y tipo, ficha con potencia/precisión/PP/categoría/efecto y Pokémon que lo aprenden.
- **¿Quién aprende este movimiento?** (`/moves/learners[/:nombre]`): filtra por juego/generación.
- **Tipos** (`/types`, `/types/:nombre`): los 18 tipos, tabla de efectividad interactiva, fortalezas/debilidades/resistencias/inmunidades por tipo.
- **Comparador** (`/comparison?a=&b=`): dos Pokémon lado a lado, sin declarar un "ganador".
- **Generador de equipos** (`/teams`): aleatorio o "equilibrado" (heurística explicada en la propia página), con filtros de generación, tipo, legendarios y Pokémon obligatorios.
- **Analizador de equipos** (`/teams/analyzer`): tipos, debilidades, resistencias, inmunidades, cobertura ofensiva aproximada y observaciones descriptivas (no califica "buen/mal equipo").
- **Herramientas** (`/tools`): Pokémon aleatorio, generador de nombres de equipo, buscador de evoluciones, buscador de habilidades, buscador de objetos.
- **PokéGames** (`/games`): los 8 juegos — ¿Quién es este Pokémon?, Pokémonle, Adivina el tipo, Adivina la evolución, Trivia, ¿Quién tiene más?, Adivina por estadísticas, Adivina el movimiento — cada uno con racha, mejor racha e instrucciones ("❓ Cómo jugar").
- **Desafío diario** (`/daily-challenge`): mismo Pokémon para todos durante el día, con racha de días consecutivos.
- **Favoritos** (`/favorites`) y **modo oscuro** (persistentes en `localStorage`, sin cuenta de usuario).

## Cómo correrlo en local

La app hace `fetch()` a la PokéAPI y usa el History API para las URLs reales, así que necesita servirse por HTTP (no sirve abrir `index.html` con doble clic).

**Opción recomendada — servidor incluido, sin dependencias:**
```bash
node dev-server.js
# abrí http://localhost:3000
```
Reproduce exactamente el comportamiento de `vercel.json` (cualquier ruta sin archivo devuelve `index.html`), así que `/pokemon/pikachu` funciona igual que en producción. Puerto distinto: `PORT=5500 node dev-server.js`.

**Alternativas:** extensión "Live Server" de VS Code, o `npx serve .` — funcionan para navegar, pero **no** simulan el fallback de rutas: si entrás directo a `/pokemon/pikachu` y recargás, van a dar 404 porque no existe ese archivo. Para probar URLs reales, usá `node dev-server.js`.

## Cómo probar las funciones

- **Pokédex**: buscá "pikachu", filtrá por tipo "Fuego" y generación I, ordená por estadísticas (con un filtro activo).
- **Ficha de Pokémon**: entrá a cualquier tarjeta. Navegá la cadena evolutiva (son enlaces reales) y probá "Pokémon anterior/siguiente".
- **Movimientos**: buscá "thunderbolt"; desde su ficha, "Filtrar por juego y ver con tipos" lleva a `/moves/learners/thunderbolt`.
- **¿Quién aprende este movimiento?**: probá sin filtro de juego (rápido) y con un juego puntual (más lento: revisa Pokémon uno por uno, con contador de progreso).
- **Tipos**: mirá la tabla de efectividad completa; entrá a `/types/fire`.
- **Comparador**: `/comparison?a=pikachu&b=raichu` (la URL queda guardada para compartir).
- **Equipos**: "Generar equipo equilibrado" y "Generar equipo aleatorio", con y sin filtros; luego `/teams/analyzer` con 6 nombres.
- **Juegos**: jugá alguno y mirá cómo persiste la racha al recargar. El desafío diario solo permite un intento por día.
- **URLs directas**: entrá directo (pegando la URL) a `/pokemon/charizard`, `/move/tackle`, `/types`, `/games/trivia` y presioná F5 — no debe dar 404 (ver [dev-server.js](#cómo-correrlo-en-local)).
- **Modo oscuro**: botón 🌙/☀️ del header; si nunca lo tocaste, sigue la preferencia del sistema operativo.

## Estructura del proyecto

```
index.html              Único HTML. Header, nav, <main id="view">, footer, orden de <script>.
style.css                Todos los estilos: variables de tema, layout, componentes, responsive.
vercel.json               Rewrites (URLs limpias) + cache-control para /js y /icons.
robots.txt / sitemap.xml  SEO técnico (ver más abajo).
manifest.webmanifest      Metadatos de instalación (PWA liviana).
favicon.svg, icons/       Favicon e íconos propios (SVG + PNG generados), sin copyright de terceros.
og-default.png            Imagen Open Graph genérica (fallback cuando la página no tiene imagen propia).
dev-server.js              Servidor local sin dependencias que imita el comportamiento de vercel.json.
scripts/generate-sitemap.js  Regenera sitemap.xml consultando los nombres reales de PokéAPI.

js/config.js       Configuración central: dominio del sitio (siteUrl) y bandera de anuncios (adsEnabled).
js/utils.js        Helpers: formato de texto, nombres de tipo en español, colores, generador con semilla, validación de slugs.
js/storage.js      Toda la lectura/escritura de localStorage (tema, favoritos, puntajes, desafío diario, caché).
js/seo.js          Actualiza <title>, meta description, canonical, Open Graph, Twitter Card y JSON-LD en cada navegación.
js/api.js          Única capa que habla con la PokéAPI: caché, deduplicación de pedidos en curso, timeout y reintento.
js/components.js   Piezas de interfaz reutilizadas: tarjeta de Pokémon, carga perezosa (IntersectionObserver), pestañas, modal.
js/router.js       Router con URLs reales (History API), interceptor de enlaces internos, redirección de URLs viejas con #.
js/pokedex.js      Listado de la Pokédex, ficha de Pokémon, cadena evolutiva, favoritos, búsqueda global.
js/moves.js        Buscador de movimientos, ficha de movimiento, "¿quién aprende este movimiento?".
js/types.js        Grilla de tipos, ficha de tipo, tabla de efectividad (matriz reutilizada por equipos y fichas).
js/comparison.js   Comparador de dos Pokémon.
js/teams.js        Generador de equipos (aleatorio/equilibrado) y analizador de equipos.
js/tools.js        Pokémon aleatorio, generador de nombres, buscador de evoluciones/habilidades/objetos.
js/games.js        Los 8 minijuegos + desafío diario.
js/app.js          Página de inicio + tabla de rutas (con title/description de cada sección) + arranque.
```

## Routing con URLs reales

Antes: `#/pokemon/pikachu` (hash routing). Ahora: **`/pokemon/pikachu`**, con el History API del navegador (`pushState`/`popstate`), sin recargar la página.

- **`js/router.js`** registra rutas tipo `/pokemon/:name` y decide qué función de render llamar según `location.pathname`.
- Todo `<a href="/algo">` dentro de la app se intercepta (`click` a nivel `document`) y navega sin recargar; los enlaces externos, con `target`, con `download`, o a archivos (`/sitemap.xml`, etc.) se dejan pasar normalmente.
- **Compatibilidad con URLs viejas**: si alguien entra con `#/pokemon/pikachu` (marcador guardado, enlace viejo), el router lo convierte a `/pokemon/pikachu` con `history.replaceState` apenas carga.
- **F5 en una URL profunda**: como es un sitio estático, el servidor necesita devolver `index.html` para cualquier ruta que no sea un archivo real. Eso lo hace `vercel.json` en producción y `dev-server.js` en local (ver abajo).
- **Nombre vs. número**: `/pokemon/25` funciona, pero la página reescribe la URL a `/pokemon/pikachu` (con `history.replaceState`, sin recargar) para que exista una única URL canónica por Pokémon.

## `vercel.json` y despliegue

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [ ... ]
}
```

Esto le dice a Vercel: "para cualquier ruta que no coincida con un archivo real (`/pokemon/pikachu`, `/move/tackle`, etc.), serví `index.html`". Los archivos que sí existen (`/style.css`, `/js/app.js`, `/sitemap.xml`, `/robots.txt`, `/icons/...`) se sirven directamente — Vercel comprueba el sistema de archivos antes de aplicar el rewrite, así que esto no rompe ningún asset. Confirmado con el mismo comportamiento reproducido en `dev-server.js` y probado localmente.

**Pasos para desplegar:**
1. Subí la carpeta a un repositorio de GitHub (o usá la CLI `vercel` directo desde la carpeta).
2. En [vercel.com](https://vercel.com) → "Add New… → Project" → importá el repo.
3. Framework Preset: "Other". Build Command: vacío. Output Directory: vacío (raíz). Deploy.
4. **Configurá tu dominio real** en Vercel (Project → Settings → Domains).
5. Actualizá `js/config.js` (`siteUrl`) con ese dominio y corré `node scripts/generate-sitemap.js` (ver [sitemap.xml](#sitemapxml)) para que las URLs canonical, Open Graph y el sitemap usen el dominio definitivo. Sin este paso, canonical/OG usan el origen actual (funciona, pero conviene fijar el dominio final antes de indexar).

## PokéAPI, caché y localStorage

- **`js/api.js`** es la única capa que llama a `https://pokeapi.co/api/v2`. Cachea en memoria (dura la pestaña) y en `localStorage` (dura 14 días, solo respuestas livianas: las fichas de Pokémon completas no se persisten en disco para no llenar el almacenamiento, pero sí quedan en memoria durante la sesión).
- Pedidos idénticos en curso se deduplican (si dos partes de la UI piden el mismo Pokémon al mismo tiempo, se hace un solo `fetch`).
- Cada pedido tiene timeout (12s) y un reintento automático ante error de red.
- `Storage.init()` (en `js/storage.js`) limpia al arrancar cualquier entrada de caché "gigante" que pudiera haber quedado de una versión anterior, para no agotar el espacio de `localStorage`.
- **localStorage guarda solo**: tema, favoritos (IDs), puntajes de juegos, estado del desafío diario y la caché de PokéAPI. Nada identificable ni sensible.

## SEO técnico

Qué se implementó (sin prometer posicionamiento, que depende de factores fuera de este proyecto):

- **URLs reales y estables** por Pokémon (`/pokemon/:nombre`), movimiento (`/move/:nombre`) y tipo (`/types/:nombre`) — ver sección anterior.
- **`<title>` y meta description únicos por página**, generados dinámicamente a partir de los datos reales de cada Pokémon/movimiento/tipo (`js/seo.js`, llamado desde cada página vía `Seo.set(...)`). Un test automatizado (ver [Verificación](#verificación-realizada--no-realizada)) confirmó que 28 páginas de ejemplo generan 28 títulos y descripciones distintos.
- **Canonical** (`<link rel="canonical">) en cada página, calculado a partir de `js/config.js` (`siteUrl`) o, si no está definido, del origen actual.
- **Open Graph y Twitter Card** (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `twitter:card`, etc.), con imagen propia del Pokémon/movimiento cuando existe y `og-default.png` (imagen genérica original, sin copyright de terceros) como respaldo.
- **JSON-LD `BreadcrumbList`** en fichas de Pokémon, movimiento y tipo.
- **`robots` meta**: `index, follow` por defecto; `noindex, follow` automático en páginas sin contenido propio (búsqueda, favoritos, 404).
- **H1 único y real** en cada página (antes eran títulos de sección genéricos).
- **Contenido textual real** en la home y en las fichas (un párrafo descriptivo por Pokémon, generado a partir de sus datos, sin relleno de keywords).
- **`sitemap.xml`** y **`robots.txt`** (ver abajo).
- **Rendimiento**: menos peticiones innecesarias (carga perezosa de tarjetas con `IntersectionObserver`, caché, deduplicación), imágenes con `width`/`height` explícitos para evitar saltos de layout, fuentes con `preconnect`.

## `sitemap.xml`

El `sitemap.xml` incluido ya contiene: todas las páginas principales, los 18 tipos y **los 151 Pokémon de la primera generación** (para no prometer URLs de los más de 1000 restantes sin poder generarlas en este entorno sin acceso a internet).

Para generar el sitemap completo (los ~1025 Pokémon y ~900 movimientos actuales) o regenerarlo cuando agregues páginas:

```bash
# usa el dominio de js/config.js, o pasalo por variable de entorno:
SITE_URL=https://tudominio.com node scripts/generate-sitemap.js

# opciones:
node scripts/generate-sitemap.js --no-moves     # sin fichas de movimientos
node scripts/generate-sitemap.js --no-pokemon   # sin fichas de Pokémon
```

El script pide a PokéAPI la lista real de nombres (así ninguna URL del sitemap queda rota) y también actualiza la línea `Sitemap:` de `robots.txt`. **Necesita conexión a internet** (no se pudo ejecutar en este entorno de generación, que no tiene salida a `pokeapi.co`; el sitemap incluido se armó con la lista oficial de los 151 Pokémon de la generación I, que no cambia).

Si en el futuro agregás una página nueva (por ejemplo `/abilities/:name` con ficha propia), sumala a la lista `STATIC_PAGES` (o al bloque correspondiente) en `scripts/generate-sitemap.js` y volvé a correrlo.

## `robots.txt`

Permite rastrear todo el sitio (páginas, CSS, JS, imágenes) y referencia el sitemap:

```
User-agent: *
Allow: /
Sitemap: https://YOUR-DOMAIN.com/sitemap.xml
```

**Importante**: reemplazá `YOUR-DOMAIN.com` por tu dominio real (a mano, o corriendo `scripts/generate-sitemap.js` con `SITE_URL`, que actualiza esa línea automáticamente).

## Google Search Console

1. Desplegá el sitio y configurá tu dominio propio en Vercel.
2. Actualizá `js/config.js` (`siteUrl`) y regenerá `sitemap.xml`/`robots.txt` con ese dominio.
3. Entrá a [search.google.com/search-console](https://search.google.com/search-console) y agregá la propiedad (dominio o prefijo de URL).
4. Verificá la propiedad (Google ofrece varios métodos: registro DNS, archivo HTML, meta tag o Google Analytics; elegí el que te resulte más simple con Vercel).
5. En "Sitemaps", enviá `sitemap.xml`.
6. Opcional: usá "Inspección de URLs" para pedir la indexación de las páginas más importantes (home, `/pokedex`, algunas fichas de Pokémon populares).

Esto **no garantiza** que Google indexe o posicione las páginas — solo dejás todo listo técnicamente para que pueda hacerlo.

## Accesibilidad

- Etiquetas (`<label>`) o `aria-label` en todos los campos de formulario e íconos sin texto.
- `alt` descriptivo en imágenes de contenido; `alt=""` en las puramente decorativas.
- Foco visible (`:focus-visible`) y un enlace "Saltar al contenido".
- Roles y `aria-live` en estados de carga/resultado que cambian dinámicamente.
- Contraste revisado en ambos temas; se respeta `prefers-reduced-motion`.
- Navegación completa por teclado (enlaces y botones reales, sin `div` clicables).

## Modo oscuro

Sigue guardándose en `localStorage` (`pt_theme`). Se agregó: si el usuario **nunca** lo tocó manualmente, la web sigue la preferencia del sistema operativo (`prefers-color-scheme`) y se actualiza sola si el usuario cambia esa preferencia del sistema. El tema se aplica antes de pintar la página (script inline en el `<head>`) para evitar el parpadeo claro→oscuro al cargar.

## Monetización futura

`js/config.js` tiene `adsEnabled: false`. Mientras esté en `false`, `Components.adSlot(...)` no renderiza nada. Ya hay contenedores reservados (con su espacio en el layout, para no generar saltos) después de la Pokédex, la ficha de Pokémon, la ficha de movimiento, la sección de tipos, los juegos y la home. Para activarlos en el futuro: poner `adsEnabled: true` e insertar el código del proveedor de anuncios dentro de `.ad-slot` (o adaptar `adSlot()` en `js/components.js`).

## Seguridad

- Sin backend propio, sin claves ni datos sensibles en el frontend.
- Todo el contenido dinámico se inserta con `Utils.el(...)` (creación de nodos DOM y `textContent`), **nunca** con `innerHTML` sobre datos externos — la única excepción es `contenedor.innerHTML = ''` para vaciar un contenedor antes de volver a dibujarlo.
- Parámetros de URL (nombre de Pokémon, movimiento, tipo, búsqueda) se validan con `Utils.cleanSlug()` antes de usarse; si no son válidos, se muestra "no encontrado" en vez de pasarlos sin filtrar a la PokéAPI o al DOM.
- `js/router.js` valida que los enlaces internos apunten al mismo origen antes de interceptarlos.

## Limitaciones conocidas

- **Disponibilidad exacta por juego** (generador de equipos, filtro de movimientos): PokéAPI no informa con precisión qué Pokémon están en cada juego puntual (dex regionales, exclusivos de versión, remakes). Se aproxima con "disponible hasta tal generación". Esto ya estaba documentado en la versión anterior y se mantiene igual; ahora también se explica directamente en la interfaz (`<details>` en el generador de equipos, nota en el buscador de movimientos).
- **Cobertura ofensiva del analizador de equipos**: se calcula con los tipos propios de cada Pokémon (aproximando su ataque STAB), no con movimientos reales, porque esta versión no incluye selección de movimientos por integrante del equipo.
- **`sitemap.xml` incluido**: por no tener salida a internet en el entorno donde se generó este proyecto, el sitemap entregado tiene las páginas principales, los 18 tipos y los 151 Pokémon de la generación I. Correr `scripts/generate-sitemap.js` con conexión a internet para el sitemap completo (~1025 Pokémon, ~900 movimientos).
- **Ordenar la Pokédex por estadísticas** sigue deshabilitado sin un filtro de tipo/generación activo (para no descargar +1000 Pokémon de una sola vez); con un filtro sí funciona. Esto ya era así antes y se mantiene.

## Cómo agregar una herramienta o un juego

1. Escribí la función `render(container, params, query)` en el archivo del módulo correspondiente (o uno nuevo, agregándolo como `<script src="/js/tu-archivo.js">` en `index.html`, **antes** de `js/app.js`).
2. Registrá la ruta en `registerRoutes()` (`js/app.js`) con `R('/tu-ruta', tuFuncion, { title, description })`.
3. Si es indexable, agregala a `TOOL_LIST` (`js/tools.js`) o `GAME_LIST` (`js/games.js`) si querés que aparezca en las tarjetas de la home/hub, y sumala a `STATIC_PAGES` en `scripts/generate-sitemap.js`.
4. Usá `Components.pageHeader(title, subtitle)` para el H1 y `Utils.errorBox(...)`/`Utils.loadingSpinner(...)` para los estados de carga y error, así todo queda visualmente consistente.

## Verificación realizada / no realizada

**Se ejecutó y confirmó automáticamente** (con un harness propio en Node + jsdom que sirve estos mismos archivos y simula las respuestas de PokéAPI, ya que este entorno no tiene salida de red hacia `pokeapi.co`):

- `node --check` sin errores en los 15 archivos `.js` del proyecto.
- Render correcto (H1 presente, sin errores de JS, canonical correcto) en 28 rutas distintas: home, Pokédex, ficha de Pokémon, ficha de movimiento, listado de movimientos, "quién aprende", tipos (grilla y detalle), comparador, equipos (generador y analizador), las 5 herramientas, los 8 juegos, desafío diario y favoritos.
- Títulos y meta descriptions **únicos** en esas 28 páginas.
- `og:title`, `og:description`, `og:image`, `og:url` y JSON-LD `BreadcrumbList` correctos en una ficha de Pokémon.
- Enlaces reales (no hashes) en la cadena evolutiva, tarjetas de la Pokédex, botones del hero y navegación anterior/siguiente.
- Click en un enlace interno navega sin recargar y sin agregar `#` a la URL; el botón "atrás" del navegador funciona.
- `/pokemon/25` reescribe la URL a `/pokemon/pikachu` (nombre canónico).
- Páginas inexistentes o con parámetros inválidos (`/pokemon/zzzz`, `/pokemon/%3Cscript%3E`, `/move/nope`, `/types/xyz`, ruta random) muestran un mensaje amigable, marcan `noindex` y **no** reflejan el parámetro sin filtrar en el HTML.
- URLs viejas con hash (`#/movimientos/tackle`, `#/juegos/quien-tiene-mas`) se convierten solas a las nuevas rutas limpias.
- Pokédex: los filtros de tipo funcionan y las tarjetas enlazan a `/pokemon/<nombre>`.
- Favoritos: guardar, listar y quitar (con actualización inmediata de la lista) funcionan y persisten en `localStorage`.
- Tema claro/oscuro: el botón cambia el tema y lo persiste.
- Búsqueda global del header redirige a la ficha correcta.
- Generador de equipos ("equilibrado") entrega 6 Pokémon sin error.
- Analizador de equipos: con un nombre inexistente entre los cargados, avisa cuáles no encontró y analiza el resto.
- Desafío diario: el resultado queda guardado en `localStorage` con la fecha del día.
- "¿Quién aprende este movimiento?" con filtro de juego informa la cantidad de Pokémon encontrados.
- El servidor de desarrollo (`dev-server.js`, que reproduce `vercel.json`) sirve `/style.css`, `/js/app.js`, `/sitemap.xml` y `/robots.txt` como archivos reales, y devuelve `index.html` para rutas de la app como `/pokemon/pikachu` o `/games/trivia` (incluida una recarga directa).

**No se pudo verificar** (por no tener salida de red hacia `pokeapi.co` ni `vercel.com` en este entorno):

- El comportamiento contra la PokéAPI real (nombres, campos y límites exactos de la respuesta). El código sigue el esquema documentado de PokéAPI v2, el mismo que ya usaba la versión anterior (que sí fue probada manualmente por vos), y no se modificó ningún endpoint ni la forma de leer sus respuestas.
- El despliegue real en Vercel (dominio propio, certificado, cabeceras finales). El comportamiento de `vercel.json` se validó indirectamente reproduciendo la misma lógica de rewrite en `dev-server.js` y probándola.
- Cómo indexa/posiciona Google el sitio en la práctica (eso no depende del código sino del tiempo y de Google).
- El sitemap completo con los ~1025 Pokémon y ~900 movimientos (se generó offline con la lista fija de la generación I; el script para el resto necesita conexión a internet, como se explica arriba).

## Cambios realizados

- Migración completa de hash routing (`#/pokemon/pikachu`) a **URLs reales** con History API, manteniendo compatibilidad con enlaces viejos.
- `vercel.json` con rewrites para servir `index.html` en cualquier ruta de la app, sin romper archivos estáticos.
- SEO dinámico por página: `<title>`, meta description, canonical, Open Graph, Twitter Card, JSON-LD (`js/seo.js`, `js/config.js`).
- `sitemap.xml`, `robots.txt` y `scripts/generate-sitemap.js` para mantenerlo actualizado.
- Favicon, íconos (192/512/maskable/apple-touch) y `og-default.png` propios, generados para este proyecto (sin usar arte con copyright de Nintendo/Game Freak).
- `manifest.webmanifest` básico.
- Identidad visual nueva (paleta, tipografías, tarjetas, hero, header) manteniendo HTML/CSS/JS vanilla.
- Responsive revisado de 320px a escritorio; sin overflow horizontal.
- Accesibilidad: labels, aria-live, foco visible, alt en imágenes, enlace "saltar al contenido".
- Modo oscuro: preferencia del sistema como valor inicial si el usuario no eligió, sin parpadeo al cargar.
- Rendimiento: `IntersectionObserver` para cargar tarjetas de Pokémon solo cuando entran en pantalla, deduplicación y timeout/reintento en `js/api.js`, límite de tamaño en la caché de `localStorage`.
- Racha e instrucciones ("❓ Cómo jugar") agregadas a los 8 juegos; racha diaria en el desafío del día.
- Contenedores de anuncios reservados pero apagados (`adsEnabled: false`).
- Ningún juego, herramienta ni algoritmo (Pokédex, comparador, generador/analizador de equipos) fue eliminado o simplificado: se reorganizó la presentación y se agregaron enlaces reales, pero la lógica de datos es la misma que ya habías probado.

## Archivos modificados

`index.html`, `style.css`, `js/utils.js`, `js/storage.js`, `js/api.js`, `js/components.js`, `js/router.js`, `js/pokedex.js`, `js/moves.js`, `js/types.js`, `js/comparison.js`, `js/teams.js`, `js/tools.js`, `js/games.js`, `js/app.js`, `README.md`.

## Archivos nuevos

`js/config.js`, `js/seo.js`, `vercel.json`, `robots.txt`, `sitemap.xml`, `scripts/generate-sitemap.js`, `manifest.webmanifest`, `favicon.svg`, `icons/` (favicon-32, icon-192, icon-512, icon-maskable-512, apple-touch-icon), `og-default.png`, `dev-server.js`.

## Próximo paso razonable

Con la base técnica ya lista, lo siguiente con más impacto sería: (1) desplegar en Vercel con dominio propio y correr `scripts/generate-sitemap.js` con conexión real para el sitemap completo; (2) dar de alta el dominio en Google Search Console y enviar el sitemap; (3) medir con Lighthouse/PageSpeed en producción y ajustar si hace falta; (4) recién después, si se quiere seguir sumando alcance, pensar en contenido adicional (por ejemplo fichas de habilidades u objetos con su propia URL) reutilizando el mismo patrón de rutas y SEO ya armado.
