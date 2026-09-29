/* ============================================================
   moves.js
   - /moves: listado y buscador de movimientos (filtro por nombre y tipo).
   - /move/:name: detalle con SEO dinámico y Pokémon que lo aprenden.
   - /moves/learners[/:name]: "¿Qué Pokémon puede aprender este movimiento?"
   ============================================================ */

const Moves = (() => {
  const DAMAGE_CLASS_LABEL = { physical: 'Físico', special: 'Especial', status: 'Estado' };
  const PAGE = 80;

  let allMovesCache = null;
  async function getAllMoveNames() {
    if (allMovesCache) return allMovesCache;
    const data = await Api.getMoveList(20000, 0);
    allMovesCache = data.results;
    return allMovesCache;
  }

  function labeled(text, control) {
    return Utils.el('label', { class: 'field' }, [Utils.el('span', { class: 'field-label' }, text), control]);
  }

  function factCard(label, value) {
    return Utils.el('div', { class: 'fact-card' }, [
      Utils.el('span', { class: 'fact-value' }, String(value)),
      Utils.el('span', { class: 'fact-label' }, label)
    ]);
  }

  // ---------------- Listado ----------------
  async function renderMovesList(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Movimientos Pokémon', 'Buscá cualquier movimiento por nombre o filtrá por tipo. Cada movimiento tiene su propia ficha.'));

    const input = Utils.el('input', { type: 'search', class: 'input', placeholder: 'Ej: thunderbolt, flamethrower…', autocomplete: 'off' });
    const typeSelect = Utils.el('select', { class: 'input' }, [
      Utils.el('option', { value: '' }, 'Todos los tipos'),
      ...Utils.ALL_TYPES.map(t => Utils.el('option', { value: t }, Utils.typeLabel(t)))
    ]);
    const learnersLink = Utils.el('a', { class: 'btn btn-secondary btn-small', href: '/moves/learners' }, '¿Qué Pokémon aprende un movimiento?');
    const status = Utils.el('p', { class: 'muted', 'aria-live': 'polite' });
    const grid = Utils.el('div', { class: 'moves-grid moves-grid-full' });
    const moreBtn = Utils.el('button', { class: 'btn btn-secondary load-more', type: 'button' }, 'Mostrar más');
    moreBtn.style.display = 'none';
    container.append(
      Utils.el('div', { class: 'filters-panel' }, [
        Utils.el('div', { class: 'pokedex-controls' }, [labeled('Buscar por nombre', input), labeled('Tipo', typeSelect)]),
        learnersLink
      ]),
      status, grid, moreBtn
    );

    const all = await getAllMoveNames();
    let filtered = all, shown = 0, runId = 0;

    function renderMore() {
      filtered.slice(shown, shown + PAGE).forEach(m => {
        grid.appendChild(Utils.el('a', { class: 'move-chip', href: '/move/' + m.name }, Utils.displayName(m.name)));
      });
      shown = Math.min(filtered.length, shown + PAGE);
      moreBtn.style.display = shown < filtered.length ? 'block' : 'none';
    }

    async function apply() {
      const myRun = ++runId;
      const q = input.value.trim().toLowerCase().replace(/\s+/g, '-');
      let base = all;
      if (typeSelect.value) {
        status.textContent = 'Filtrando por tipo…';
        try {
          const t = await Api.getType(typeSelect.value);
          if (myRun !== runId) return;
          const names = new Set(t.moves.map(m => m.name));
          base = all.filter(m => names.has(m.name));
        } catch {
          status.innerHTML = '';
          status.appendChild(Utils.errorBox(Utils.GENERIC_ERROR, { retry: apply }));
          return;
        }
      }
      filtered = q ? base.filter(m => m.name.includes(q)) : base;
      grid.innerHTML = ''; shown = 0;
      status.textContent = `${filtered.length} movimientos`;
      if (filtered.length === 0) { grid.appendChild(Components.emptyState('No encontramos movimientos con esos filtros.')); moreBtn.style.display = 'none'; return; }
      renderMore();
    }

    input.addEventListener('input', Utils.debounce(apply, 250));
    typeSelect.addEventListener('change', apply);
    moreBtn.addEventListener('click', renderMore);
    apply();
  }

  // ---------------- Detalle ----------------
  async function renderMoveDetail(container, params) {
    container.innerHTML = '';
    const slug = Utils.cleanSlug(params.name);
    let move;
    try {
      if (!slug) throw Object.assign(new Error('nf'), { kind: 'notfound' });
      move = await Api.getMove(slug);
    } catch (e) {
      if (Utils.isNotFound(e)) {
        Seo.notFound();
        container.appendChild(Components.emptyState('No encontramos ese movimiento.',
          Utils.el('a', { class: 'btn', href: '/moves' }, 'Ver todos los movimientos')));
        return;
      }
      throw e;
    }

    if (slug !== move.name) Router.replaceUrl('/move/' + move.name);

    const nameD = Utils.displayName(move.name);
    const cat = DAMAGE_CLASS_LABEL[move.damage_class.name] || move.damage_class.name;
    const effectEntry = move.effect_entries.find(e => e.language.name === 'es') ||
      move.effect_entries.find(e => e.language.name === 'en');
    const effectText = effectEntry
      ? (effectEntry.short_effect || effectEntry.effect).replace('$effect_chance', move.effect_chance ?? '')
      : 'Descripción no disponible.';

    const stats = [
      move.power ? `potencia ${move.power}` : 'sin potencia base',
      move.accuracy ? `precisión ${move.accuracy}%` : 'sin precisión fija',
      move.pp ? `${move.pp} PP` : null
    ].filter(Boolean).join(', ');
    Seo.set({
      title: `${nameD}: movimiento de tipo ${Utils.typeLabel(move.type.name)}, potencia y precisión`,
      description: `${nameD} es un movimiento ${cat.toLowerCase()} de tipo ${Utils.typeLabel(move.type.name)} (${stats}). Consultá su efecto y qué Pokémon pueden aprenderlo.`,
      path: '/move/' + move.name,
      jsonLd: Seo.breadcrumbs([
        { name: 'Inicio', path: '/' }, { name: 'Movimientos', path: '/moves' }, { name: nameD, path: '/move/' + move.name }
      ])
    });

    container.append(
      Utils.el('nav', { class: 'breadcrumb', 'aria-label': 'Ruta de navegación' }, [
        Utils.el('a', { href: '/' }, 'Inicio'), ' › ', Utils.el('a', { href: '/moves' }, 'Movimientos'), ' › ', nameD
      ]),
      Utils.el('header', { class: 'move-detail-header', style: `--tc:${Utils.TYPE_COLORS[move.type.name] || '#8a8fa3'}` }, [
        Utils.typeBadge(move.type.name, { link: true }),
        Utils.el('h1', {}, nameD)
      ]),
      Utils.el('div', { class: 'quick-facts' }, [
        factCard('Categoría', cat), factCard('Potencia', move.power ?? '—'),
        factCard('Precisión', move.accuracy ? move.accuracy + '%' : '—'), factCard('PP', move.pp ?? '—'),
        factCard('Prioridad', move.priority), factCard('Objetivo', Utils.displayName(move.target.name))
      ]),
      Utils.el('p', { class: 'flavor-text' }, effectText),
      Utils.el('p', { class: 'muted small' }, 'Descripción provista por PokéAPI (puede estar en inglés).')
    );

    // Pokémon que lo aprenden (lista liviana: no requiere descargar cada Pokémon)
    const learners = move.learned_by_pokemon
      .map(p => ({ name: p.name, id: Utils.idFromUrl(p.url) }))
      .filter(p => p.id <= 1025).sort((a, b) => a.id - b.id);

    const section = Utils.el('section', {}, [
      Components.sectionTitle(`Pokémon que pueden aprender ${nameD}`, `${learners.length} Pokémon lo aprenden en algún juego.`)
    ]);
    if (learners.length === 0) {
      section.appendChild(Components.emptyState('PokéAPI no registra Pokémon que aprendan este movimiento.'));
    } else {
      const grid = Utils.el('div', { class: 'learner-grid' });
      let shown = 0;
      const moreBtn = Utils.el('button', { class: 'btn btn-secondary load-more', type: 'button' }, 'Mostrar más');
      const renderMore = () => {
        learners.slice(shown, shown + 48).forEach(p => {
          grid.appendChild(Utils.el('a', { class: 'learner-chip', href: '/pokemon/' + p.name }, [
            Utils.el('img', {
              src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`,
              alt: '', loading: 'lazy', width: '56', height: '56'
            }),
            Utils.el('span', {}, Utils.displayName(p.name))
          ]));
        });
        shown = Math.min(learners.length, shown + 48);
        moreBtn.style.display = shown < learners.length ? 'block' : 'none';
      };
      moreBtn.addEventListener('click', renderMore);
      section.append(grid, moreBtn);
      renderMore();
      section.appendChild(Utils.el('a', { class: 'btn', href: '/moves/learners/' + move.name }, 'Filtrar por juego y ver con tipos'));
    }
    container.appendChild(section);
    const ad = Components.adSlot('move-bottom');
    if (ad) container.appendChild(ad);
  }

  // ---------------- ¿Qué Pokémon aprende este movimiento? ----------------
  async function renderLearners(container, params) {
    container.innerHTML = '';
    const preset = params.name ? Utils.cleanSlug(params.name) : null;
    if (preset) {
      Seo.set({
        title: `¿Qué Pokémon aprende ${Utils.displayName(preset)}?`,
        description: `Lista de Pokémon que pueden aprender ${Utils.displayName(preset)}, con filtro opcional por juego o generación.`,
        path: '/moves/learners/' + preset
      });
    }
    container.appendChild(Components.pageHeader(
      '¿Qué Pokémon puede aprender este movimiento?',
      'Elegí un movimiento y, si querés, un juego para filtrar por esa versión.'
    ));
    Components.ensurePokemonDatalist();

    const moveInput = Utils.el('input', {
      type: 'search', class: 'input', placeholder: 'Ej: thunderbolt', value: preset || '', autocomplete: 'off'
    });
    const gameSelect = Utils.el('select', { class: 'input' }, [
      Utils.el('option', { value: '' }, 'Todas las versiones'),
      ...Object.keys(Utils.GAME_TO_GEN).map(g => Utils.el('option', { value: g }, g))
    ]);
    const goBtn = Utils.el('button', { class: 'btn', type: 'button' }, 'Buscar');
    const note = Utils.el('p', { class: 'muted small' },
      'La lista general viene directo del movimiento en PokéAPI. Si elegís un juego, se revisa Pokémon por Pokémon si lo aprende en esa versión; PokéAPI no informa la disponibilidad exacta de cada juego (dex regionales, exclusivos), así que tomalo como una aproximación. Con movimientos muy comunes puede tardar unos segundos.');
    const status = Utils.el('div', { class: 'pokedex-status', 'aria-live': 'polite' });
    const grid = Utils.el('div', { class: 'poke-grid' });
    container.append(
      Utils.el('div', { class: 'filters-panel' }, [
        Utils.el('div', { class: 'pokedex-controls' }, [labeled('Movimiento', moveInput), labeled('Juego / versión', gameSelect)]),
        goBtn
      ]),
      note, status, grid
    );

    let runId = 0;

    async function run() {
      const moveName = Utils.cleanSlug(moveInput.value);
      if (!moveName) {
        status.innerHTML = '';
        status.appendChild(Utils.errorBox('Escribí el nombre de un movimiento (en inglés, ej: thunderbolt).'));
        return;
      }
      const myRun = ++runId;
      grid.innerHTML = ''; status.innerHTML = '';
      status.appendChild(Utils.loadingSpinner('Buscando movimiento…'));

      let move;
      try {
        move = await Api.getMove(moveName);
      } catch (e) {
        if (myRun !== runId) return;
        status.innerHTML = '';
        status.appendChild(Utils.isNotFound(e)
          ? Utils.errorBox('No encontramos ese movimiento.')
          : Utils.errorBox(Utils.GENERIC_ERROR, { retry: run }));
        return;
      }
      if (myRun !== runId) return;
      Router.replaceUrl('/moves/learners/' + move.name);

      const learners = move.learned_by_pokemon
        .map(p => ({ name: p.name, id: Utils.idFromUrl(p.url) }))
        .filter(p => p.id <= 1025);

      const gameName = gameSelect.value;
      if (!gameName) {
        status.innerHTML = '';
        status.appendChild(Utils.el('p', { class: 'muted' },
          `${learners.length} Pokémon pueden aprender ${Utils.displayName(move.name)} (en algún juego). `));
        status.appendChild(Utils.el('a', { href: '/move/' + move.name }, 'Ver ficha del movimiento'));
        showCards(learners);
        return;
      }

      const versionGroup = Utils.GEN_TO_VERSION_GROUP[Utils.GAME_TO_GEN[gameName]];
      const progress = Utils.el('p', { class: 'muted' }, '');
      status.innerHTML = '';
      status.append(Utils.loadingSpinner(`Revisando Pokémon para ${gameName}…`), progress);

      const filtered = [];
      let done = 0, failed = 0;
      await Api.mapLimit(learners, 6, async (p) => {
        if (myRun !== runId) return;
        try {
          const full = await Api.getPokemon(p.id);
          if (full.moves.some(m => m.move.name === move.name &&
              m.version_group_details.some(v => v.version_group.name === versionGroup))) filtered.push(p);
        } catch { failed++; }
        done++;
        progress.textContent = `${done} de ${learners.length} revisados`;
      });
      if (myRun !== runId) return;

      status.innerHTML = '';
      status.appendChild(Utils.el('p', { class: 'muted' },
        `${filtered.length} Pokémon pueden aprender ${Utils.displayName(move.name)} en ${gameName}.`));
      if (failed > 0) status.appendChild(Utils.errorBox(`${failed} Pokémon no se pudieron revisar.`, { retry: run }));
      showCards(filtered);
    }

    function showCards(list) {
      grid.innerHTML = '';
      if (list.length === 0) { grid.appendChild(Components.emptyState('Sin resultados.')); return; }
      Components.lazyCards(grid, list.slice().sort((a, b) => a.id - b.id).map(p => p.id));
    }

    goBtn.addEventListener('click', run);
    moveInput.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    if (preset) run();
  }

  return { renderMovesList, renderMoveDetail, renderLearners };
})();
