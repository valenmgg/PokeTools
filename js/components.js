/* ============================================================
   components.js
   Piezas de interfaz reutilizadas: tarjeta de Pokémon (con enlace
   real), carga perezosa de tarjetas, pestañas, modal accesible,
   datalist de autocompletado y espacio publicitario futuro.
   ============================================================ */

const Components = (() => {

  // Tarjeta de Pokémon. `data` = respuesta de /pokemon/{id}
  // opts: { noLink, onFavChange(id, isFav) }
  function pokemonCard(data, opts = {}) {
    const fav = Storage.isFavorite(data.id);
    const nameText = Utils.displayName(data.name);
    const firstType = data.types[0]?.type.name;

    const favBtn = Utils.el('button', {
      class: 'fav-btn' + (fav ? ' is-fav' : ''), type: 'button',
      'aria-label': 'Favorito: ' + nameText, 'aria-pressed': String(fav),
      onclick: (e) => {
        e.preventDefault(); e.stopPropagation();
        const nowFav = Storage.toggleFavorite(data.id);
        favBtn.classList.toggle('is-fav', nowFav);
        favBtn.setAttribute('aria-pressed', String(nowFav));
        favBtn.textContent = nowFav ? '★' : '☆';
        if (opts.onFavChange) opts.onFavChange(data.id, nowFav);
      }
    }, fav ? '★' : '☆');

    const title = opts.noLink
      ? Utils.el('h3', { class: 'poke-card-name' }, nameText)
      : Utils.el('h3', { class: 'poke-card-name' }, [
          Utils.el('a', { class: 'poke-card-link', href: '/pokemon/' + data.name }, nameText)
        ]);

    return Utils.el('article', {
      class: 'poke-card' + (opts.noLink ? '' : ' clickable'),
      style: `--tc:${Utils.TYPE_COLORS[firstType] || '#8a8fa3'}`
    }, [
      favBtn,
      Utils.el('span', { class: 'poke-card-id' }, Utils.padId(data.id)),
      Utils.el('img', {
        class: 'poke-card-img', loading: 'lazy', width: '112', height: '112',
        alt: 'Imagen de ' + nameText, src: Utils.officialArtwork(data)
      }),
      title,
      Utils.el('div', { class: 'poke-card-types' }, data.types.map(t => Utils.typeBadge(t.type.name)))
    ]);
  }

  function pokemonCardSkeleton() {
    return Utils.el('article', { class: 'poke-card skeleton', 'aria-hidden': 'true' }, [
      Utils.el('div', { class: 'skeleton-img' }),
      Utils.el('div', { class: 'skeleton-line' }),
      Utils.el('div', { class: 'skeleton-line short' })
    ]);
  }

  // Añade a `grid` una tarjeta por cada id/nombre, pero solo descarga los datos
  // cuando la tarjeta está por entrar en pantalla (ahorra muchas requests).
  function lazyCards(grid, items, opts = {}) {
    const placeholders = items.map(item => {
      const ph = pokemonCardSkeleton();
      grid.appendChild(ph);
      return { item, ph };
    });

    async function load({ item, ph }) {
      try {
        const data = await Api.getPokemon(item);
        ph.replaceWith(pokemonCard(data, opts));
      } catch {
        ph.remove();
      }
    }

    if (!('IntersectionObserver' in window)) {
      Api.mapLimit(placeholders, 6, load);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const found = placeholders.find(p => p.ph === entry.target);
        if (found) load(found);
      });
    }, { rootMargin: '400px 0px' });
    placeholders.forEach(p => observer.observe(p.ph));
  }

  function tabs(tabsDef, initial) {
    const wrap = Utils.el('div', { class: 'tabs' });
    const tabBar = Utils.el('div', { class: 'tab-bar', role: 'tablist' });
    const body = Utils.el('div', { class: 'tab-body' });
    let active = initial || tabsDef[0].id;
    function renderActive() {
      body.innerHTML = '';
      tabsDef.find(t => t.id === active).render(body);
      tabBar.querySelectorAll('.tab-btn').forEach(b => {
        const on = b.dataset.id === active;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      });
    }
    tabsDef.forEach(t => tabBar.appendChild(Utils.el('button', {
      class: 'tab-btn', 'data-id': t.id, role: 'tab', type: 'button',
      onclick: () => { active = t.id; renderActive(); }
    }, t.label)));
    wrap.append(tabBar, body);
    renderActive();
    return wrap;
  }

  function sectionTitle(text, subtitle, level = 2) {
    const wrap = Utils.el('div', { class: 'section-title' }, [Utils.el('h' + level, {}, text)]);
    if (subtitle) wrap.appendChild(Utils.el('p', { class: 'muted' }, subtitle));
    return wrap;
  }

  // Título de página (H1) con subtítulo
  function pageHeader(title, subtitle) {
    const wrap = Utils.el('header', { class: 'page-header' }, [Utils.el('h1', {}, title)]);
    if (subtitle) wrap.appendChild(Utils.el('p', { class: 'muted' }, subtitle));
    return wrap;
  }

  function emptyState(message, action) {
    return Utils.el('div', { class: 'empty-state' }, [
      Utils.el('div', { class: 'empty-icon', 'aria-hidden': 'true' }, '🔍'),
      Utils.el('p', {}, message),
      action || null
    ]);
  }

  // Modal accesible basado en <dialog>
  function modal(title, bodyNode) {
    const titleId = 'modal-title-' + Math.random().toString(36).slice(2, 7);
    const dlg = Utils.el('dialog', { class: 'modal', 'aria-labelledby': titleId }, [
      Utils.el('div', { class: 'modal-head' }, [
        Utils.el('h2', { id: titleId }, title),
        Utils.el('button', { class: 'modal-close', type: 'button', 'aria-label': 'Cerrar', onclick: () => dlg.close() }, '✕')
      ]),
      Utils.el('div', { class: 'modal-body' }, [bodyNode])
    ]);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  // Autocompletado de nombres (un solo request cacheado). Usar en inputs con list="pokemon-names"
  function ensurePokemonDatalist() {
    if (document.getElementById('pokemon-names')) return;
    const dl = Utils.el('datalist', { id: 'pokemon-names' });
    document.body.appendChild(dl);
    Api.getAllPokemonNames().then(names => {
      names.forEach(n => dl.appendChild(Utils.el('option', { value: n })));
    }).catch(() => { /* el autocompletado es opcional */ });
  }

  // Espacio publicitario futuro. Mientras adsEnabled=false no se dibuja nada.
  // Cuando se active, reserva altura fija para no provocar saltos de layout.
  function adSlot(name) {
    if (!SITE_CONFIG.adsEnabled) return null;
    return Utils.el('aside', { class: 'ad-slot', 'data-slot': name, 'aria-label': 'Publicidad' });
  }

  return {
    pokemonCard, pokemonCardSkeleton, lazyCards, tabs, sectionTitle, pageHeader,
    emptyState, modal, ensurePokemonDatalist, adSlot
  };
})();
