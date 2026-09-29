/* ============================================================
   router.js
   Router con URLs reales (History API): /pokemon/pikachu, /move/tackle...
   - El servidor (Vercel, ver vercel.json) devuelve index.html para
     cualquier ruta; acá JavaScript decide qué mostrar.
   - Todos los <a href="/ruta"> internos se interceptan (sin recarga).
   - Las URLs viejas con hash (#/pokemon/pikachu) se convierten solas.
   ============================================================ */

const Router = (() => {
  const routes = []; // { pattern, keys, render, meta }
  const main = () => document.getElementById('view');
  let renderToken = 0;

  function register(path, render, meta) {
    const keys = [];
    const pattern = new RegExp('^' + path.replace(/:([^/]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    }) + '$');
    routes.push({ path, pattern, keys, render, meta });
  }

  function normalizePath(p) {
    let path = p || '/';
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path || '/';
  }

  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch { return null; }
  }

  async function resolve() {
    const token = ++renderToken;
    const path = normalizePath(location.pathname);
    const query = new URLSearchParams(location.search);
    updateActiveNav(path);
    closeMobileMenu();

    for (const r of routes) {
      const match = path.match(r.pattern);
      if (!match) continue;
      const params = {};
      let valid = true;
      r.keys.forEach((k, i) => {
        const v = safeDecode(match[i + 1]);
        if (v === null) valid = false;
        params[k] = v;
      });
      if (!valid) break;

      if (r.meta) Seo.set({ ...r.meta, path });
      const container = main();
      container.innerHTML = '';
      container.appendChild(Utils.loadingSpinner());
      try {
        await r.render(container, params, query);
      } catch (err) {
        if (token !== renderToken) return;
        console.error(err);
        container.innerHTML = '';
        container.appendChild(Utils.errorBox(Utils.GENERIC_ERROR, { retry: resolve }));
      }
      if (token === renderToken) afterRender();
      return;
    }
    showNotFound();
    afterRender();
  }

  function showNotFound() {
    Seo.notFound();
    const container = main();
    container.innerHTML = '';
    container.appendChild(Components.emptyState('No encontramos esa página.',
      Utils.el('a', { class: 'btn', href: '/' }, 'Volver al inicio')));
  }

  function afterRender() {
    window.scrollTo(0, 0);
    const m = main();
    m.focus({ preventScroll: true });
  }

  // Navega a una ruta interna sin recargar. opts.replace reemplaza la entrada del historial.
  function navigate(path, opts = {}) {
    const target = path.startsWith('/') ? path : '/' + path;
    const current = location.pathname + location.search;
    if (opts.replace) history.replaceState({}, '', target);
    else if (target !== current) history.pushState({}, '', target);
    else { resolve(); return; }
    resolve();
  }

  // Cambia la URL visible sin volver a renderizar (ej. tras una búsqueda)
  function replaceUrl(path) { history.replaceState({}, '', path); }

  function updateActiveNav(path) {
    let section = '/' + (path.split('/')[1] || '');
    const alias = { '/pokemon': '/pokedex', '/move': '/moves', '/daily-challenge': '/games', '/search': '/pokedex' };
    section = alias[section] || section;
    document.querySelectorAll('.nav-link').forEach(a => {
      const on = a.dataset.section === section;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function closeMobileMenu() {
    document.getElementById('nav-links')?.classList.remove('open');
    document.getElementById('nav-toggle')?.setAttribute('aria-expanded', 'false');
  }

  // ---- Compatibilidad con las URLs viejas (#/ruta) ----
  const LEGACY = [
    ['/favoritos', '/favorites'], ['/buscar/', '/search/'],
    ['/movimientos/', '/move/'], ['/movimientos', '/moves'],
    ['/aprende', '/moves/learners'], ['/tipos', '/types'],
    ['/comparador', '/comparison'], ['/equipos/analizar', '/teams/analyzer'], ['/equipos', '/teams'],
    ['/herramientas/aleatorio', '/tools/random'], ['/herramientas/nombres', '/tools/name-generator'],
    ['/herramientas/evoluciones', '/tools/evolutions'], ['/herramientas/habilidades', '/tools/abilities'],
    ['/herramientas/objetos', '/tools/items'], ['/herramientas', '/tools'],
    ['/juegos/quien-es', '/games/who-is-that-pokemon'], ['/juegos/tipo', '/games/guess-type'],
    ['/juegos/evolucion', '/games/guess-evolution'], ['/juegos/quien-tiene-mas', '/games/who-has-more'],
    ['/juegos/estadisticas', '/games/guess-stats'], ['/juegos/movimiento', '/games/guess-move'],
    ['/juegos', '/games'], ['/desafio-diario', '/daily-challenge']
  ];

  function migrateLegacyHash() {
    if (!location.hash.startsWith('#/')) return;
    let path = location.hash.slice(1);
    for (const [oldP, newP] of LEGACY) {
      if (path === oldP || path.startsWith(oldP + '/') || (oldP.endsWith('/') && path.startsWith(oldP))) {
        path = newP + path.slice(oldP.length);
        break;
      }
    }
    history.replaceState({}, '', path);
  }

  // ---- Interceptor de enlaces internos ----
  function isAppPath(pathname) {
    const last = pathname.split('/').pop();
    return !last.includes('.'); // /sitemap.xml, /robots.txt, etc. se dejan al navegador
  }

  function onLinkClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    if ((a.getAttribute('href') || '').startsWith('#')) return; // anclas internas (ej. "Saltar al contenido")
    let url;
    try { url = new URL(a.href, location.href); } catch { return; }
    if (url.origin !== location.origin || !isAppPath(url.pathname)) return;
    e.preventDefault();
    navigate(url.pathname + url.search);
  }

  function initChrome() {
    document.addEventListener('click', onLinkClick);

    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    // Tema: preferencia guardada, o la del sistema si todavía no eligió
    const themeBtn = document.getElementById('theme-toggle');
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#0A1220' : '#0B1F3A');
    }
    applyTheme(Storage.getTheme() || (media.matches ? 'dark' : 'light'));
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      Storage.setTheme(next);
      applyTheme(next);
    });
    media.addEventListener?.('change', (e) => { if (!Storage.getTheme()) applyTheme(e.matches ? 'dark' : 'light'); });

    // Buscador del header
    const form = document.getElementById('global-search-form');
    const input = document.getElementById('global-search-input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      navigate('/search/' + encodeURIComponent(q));
      input.value = '';
    });

    // Imagen rota (ej. artwork inexistente) -> imagen de reemplazo, una sola vez
    document.addEventListener('error', (e) => {
      const t = e.target;
      if (t && t.tagName === 'IMG' && !t.dataset.fallback) {
        t.dataset.fallback = '1';
        t.src = Utils.PLACEHOLDER_IMG;
      }
    }, true);
  }

  function start() {
    migrateLegacyHash();
    initChrome();
    window.addEventListener('popstate', resolve);
    resolve();
  }

  return { register, navigate, replaceUrl, start };
})();
