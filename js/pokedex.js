/* ============================================================
   pokedex.js
   - Listado de la Pokédex (búsqueda, filtros, orden, carga progresiva).
   - Página de detalle /pokemon/:name con SEO dinámico.
   - Favoritos y búsqueda global.
   La lógica de datos es la misma de la versión anterior; se mejoraron
   enlaces reales, metadatos, textos descriptivos y manejo de errores.
   ============================================================ */

const Pokedex = (() => {
  const PAGE_SIZE = 24;
  const NATIONAL_DEX_TOTAL = 1025;

  function freshState() {
    return { search: '', type: '', generation: '', sort: 'number', page: 1, idsPool: null };
  }

  function toRoman(n) {
    return ['I','II','III','IV','V','VI','VII','VIII','IX'][n - 1] || String(n);
  }

  function labeled(labelText, control) {
    return Utils.el('label', { class: 'field' }, [Utils.el('span', { class: 'field-label' }, labelText), control]);
  }

  async function renderPokedex(container) {
    const state = freshState();
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Pokédex', 'Explorá los Pokémon: buscá por nombre o número, filtrá por tipo y generación y ordená los resultados.'));

    const searchInput = Utils.el('input', {
      type: 'search', placeholder: 'Ej: Pikachu o 25', class: 'input', autocomplete: 'off', inputmode: 'search'
    });
    const typeSelect = Utils.el('select', { class: 'input' }, [
      Utils.el('option', { value: '' }, 'Todos los tipos'),
      ...Utils.ALL_TYPES.map(t => Utils.el('option', { value: t }, Utils.typeLabel(t)))
    ]);
    const genSelect = Utils.el('select', { class: 'input' }, [
      Utils.el('option', { value: '' }, 'Todas las generaciones'),
      ...Array.from({ length: 9 }, (_, i) => i + 1).map(n => Utils.el('option', { value: n }, 'Generación ' + toRoman(n)))
    ]);
    const sortSelect = Utils.el('select', { class: 'input' }, [
      Utils.el('option', { value: 'number' }, 'Número'),
      Utils.el('option', { value: 'name' }, 'Nombre (A-Z)'),
      Utils.el('option', { value: 'stats' }, 'Estadísticas totales')
    ]);
    const clearBtn = Utils.el('button', { class: 'btn btn-secondary btn-small', type: 'button' }, 'Limpiar filtros');

    const controls = Utils.el('div', { class: 'filters-panel' }, [
      Utils.el('div', { class: 'pokedex-controls' }, [
        labeled('Buscar', searchInput), labeled('Tipo', typeSelect),
        labeled('Generación', genSelect), labeled('Ordenar por', sortSelect)
      ]),
      clearBtn
    ]);

    const grid = Utils.el('div', { class: 'poke-grid' });
    const status = Utils.el('div', { class: 'pokedex-status', 'aria-live': 'polite' });
    const loadMoreBtn = Utils.el('button', { class: 'btn btn-secondary load-more', type: 'button' }, 'Cargar más');
    loadMoreBtn.style.display = 'none';
    container.append(controls, status, grid, loadMoreBtn);

    let runId = 0;

    async function applyFilters() {
      const myRun = ++runId;
      state.page = 1;
      grid.innerHTML = '';
      loadMoreBtn.style.display = 'none';
      status.innerHTML = '';
      status.appendChild(Utils.loadingSpinner('Buscando Pokémon…'));

      try {
        state.idsPool = await computePool(state);
        if (myRun !== runId) return;

        if (state.sort === 'stats') {
          if (state.idsPool.length > 400) {
            status.innerHTML = '';
            status.appendChild(Utils.errorBox('Para ordenar por estadísticas elegí primero un tipo o una generación (así no descargamos más de 1000 Pokémon).'));
            return;
          }
          status.innerHTML = '';
          status.appendChild(Utils.loadingSpinner('Calculando estadísticas para ordenar…'));
          const withStats = await Api.mapLimit(state.idsPool, 8, async (id) => {
            const p = await Api.getPokemon(id);
            return { id, total: p.stats.reduce((s, st) => s + st.base_stat, 0) };
          });
          if (myRun !== runId) return;
          withStats.sort((a, b) => b.total - a.total);
          state.idsPool = withStats.map(x => x.id);
        }
      } catch (e) {
        if (myRun !== runId) return;
        console.error(e);
        status.innerHTML = '';
        status.appendChild(Utils.errorBox(Utils.GENERIC_ERROR, { retry: applyFilters }));
        return;
      }

      status.innerHTML = '';
      status.appendChild(Utils.el('p', { class: 'muted' }, `${state.idsPool.length} Pokémon encontrados`));
      if (state.idsPool.length === 0) {
        grid.appendChild(Components.emptyState('No encontramos Pokémon con esos filtros.', clearBtn.cloneNode(true)));
        grid.querySelector('button')?.addEventListener('click', resetFilters);
        return;
      }
      loadFromPool(myRun);
    }

    async function loadFromPool(myRun) {
      const start = (state.page - 1) * PAGE_SIZE;
      const slice = state.idsPool.slice(start, start + PAGE_SIZE);
      const skeletons = slice.map(() => Components.pokemonCardSkeleton());
      skeletons.forEach(s => grid.appendChild(s));
      const details = await Api.mapLimit(slice, 8, id => Api.getPokemon(id).catch(() => null));
      if (myRun !== runId) return;
      skeletons.forEach((s, i) => {
        if (details[i]) s.replaceWith(Components.pokemonCard(details[i])); else s.remove();
      });
      if (details.some(d => !d)) {
        status.appendChild(Utils.errorBox('Algunos Pokémon no se pudieron cargar.', { retry: applyFilters }));
      }
      loadMoreBtn.style.display = (start + PAGE_SIZE < state.idsPool.length) ? 'block' : 'none';
    }

    function resetFilters() {
      searchInput.value = ''; typeSelect.value = ''; genSelect.value = ''; sortSelect.value = 'number';
      state.search = ''; state.type = ''; state.generation = ''; state.sort = 'number';
      applyFilters();
    }

    loadMoreBtn.addEventListener('click', () => { state.page += 1; loadFromPool(runId); });
    clearBtn.addEventListener('click', resetFilters);
    const debouncedSearch = Utils.debounce((val) => { state.search = val.trim().toLowerCase(); applyFilters(); }, 350);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
    typeSelect.addEventListener('change', (e) => { state.type = e.target.value; applyFilters(); });
    genSelect.addEventListener('change', (e) => { state.generation = e.target.value; applyFilters(); });
    sortSelect.addEventListener('change', (e) => { state.sort = e.target.value; applyFilters(); });

    const ad = Components.adSlot('pokedex-bottom');
    if (ad) container.appendChild(ad);

    applyFilters();
  }

  // Conjunto de IDs que cumplen los filtros activos (misma lógica que antes)
  async function computePool(state) {
    let idSet = null;

    if (state.type) {
      const typeData = await Api.getType(state.type);
      idSet = new Set(typeData.pokemon.map(p => Utils.idFromUrl(p.pokemon.url)).filter(id => id <= NATIONAL_DEX_TOTAL));
    }
    if (state.generation) {
      const gen = await Api.getGeneration(Number(state.generation));
      const ids = gen.pokemon_species.map(s => Utils.idFromUrl(s.url));
      idSet = idSet ? new Set(ids.filter(id => idSet.has(id))) : new Set(ids);
    }

    let idList = idSet ? Array.from(idSet) : Array.from({ length: NATIONAL_DEX_TOTAL }, (_, i) => i + 1);

    if (state.search) {
      const q = state.search;
      const asNumber = Number(q);
      if (!isNaN(asNumber) && asNumber > 0) {
        idList = idList.filter(id => id === asNumber);
      } else {
        const all = await Api.getPokemonList(NATIONAL_DEX_TOTAL, 0);
        const matchIds = new Set(all.results.filter(r => r.name.includes(q)).map(r => Utils.idFromUrl(r.url)));
        idList = idList.filter(id => matchIds.has(id));
      }
    }

    if (state.sort === 'number' || state.sort === 'stats') idList.sort((a, b) => a - b);
    if (state.sort === 'name') {
      const all = await Api.getPokemonList(NATIONAL_DEX_TOTAL, 0);
      const nameById = new Map(all.results.map(r => [Utils.idFromUrl(r.url), r.name]));
      idList.sort((a, b) => (nameById.get(a) || '').localeCompare(nameById.get(b) || ''));
    }
    return idList;
  }

  // ---------------- Detalle de Pokémon ----------------

  function notFoundView(container, what = 'ese Pokémon') {
    Seo.notFound();
    container.innerHTML = '';
    container.appendChild(Components.emptyState(`No encontramos ${what}.`,
      Utils.el('a', { class: 'btn', href: '/pokedex' }, 'Ir a la Pokédex')));
  }

  async function renderPokemonDetail(container, params) {
    container.innerHTML = '';
    const slug = Utils.cleanSlug(params.name);
    if (!slug) return notFoundView(container);

    let data, species;
    try {
      data = await Api.findPokemon(slug);
      species = await Api.getPokemonSpecies(data.species.name);
    } catch (e) {
      if (Utils.isNotFound(e)) return notFoundView(container);
      throw e;
    }

    // Si entraron por número (/pokemon/25) dejamos la URL canónica con el nombre
    if (slug !== data.name) Router.replaceUrl('/pokemon/' + data.name);

    const nameD = Utils.displayName(data.name);
    const typeNames = data.types.map(t => t.type.name);
    const typesTxt = typeNames.map(Utils.typeLabel).join(' / ');
    const total = data.stats.reduce((s, st) => s + st.base_stat, 0);
    const topStat = data.stats.slice().sort((a, b) => b.base_stat - a.base_stat)[0];
    const topStatLabel = Utils.STAT_LABELS[topStat.stat.name] || topStat.stat.name;
    const abilityNames = data.abilities.map(a => Utils.displayName(a.ability.name));
    const genLabel = Utils.generationLabel(species.generation.name);
    const heightM = (data.height / 10).toFixed(1).replace('.', ',');
    const weightKg = (data.weight / 10).toFixed(1).replace('.', ',');

    Seo.set({
      title: `${nameD}: tipo ${typesTxt}, stats, movimientos y evoluciones`,
      description: `Ficha de ${nameD} (${Utils.padId(data.id)}): Pokémon de tipo ${typesTxt} de la ${genLabel}. Estadísticas base (total ${total}), habilidades (${abilityNames.join(', ')}), movimientos y línea evolutiva.`,
      path: '/pokemon/' + data.name,
      image: Utils.officialArtwork(data),
      type: 'article',
      jsonLd: Seo.breadcrumbs([
        { name: 'Inicio', path: '/' }, { name: 'Pokédex', path: '/pokedex' },
        { name: nameD, path: '/pokemon/' + data.name }
      ])
    });

    const flavorEntry = species.flavor_text_entries.find(f => f.language.name === 'es') ||
      species.flavor_text_entries.find(f => f.language.name === 'en');
    const flavorText = flavorEntry ? flavorEntry.flavor_text.replace(/[\n\f\u000c]/g, ' ') : '';

    const fav = Storage.isFavorite(data.id);
    const favBtn = Utils.el('button', {
      class: 'btn btn-secondary', type: 'button', 'aria-pressed': String(fav),
      onclick: () => {
        const nowFav = Storage.toggleFavorite(data.id);
        favBtn.textContent = nowFav ? '★ En favoritos' : '☆ Agregar a favoritos';
        favBtn.setAttribute('aria-pressed', String(nowFav));
      }
    }, fav ? '★ En favoritos' : '☆ Agregar a favoritos');

    const breadcrumb = Utils.el('nav', { class: 'breadcrumb', 'aria-label': 'Ruta de navegación' }, [
      Utils.el('a', { href: '/' }, 'Inicio'), ' › ',
      Utils.el('a', { href: '/pokedex' }, 'Pokédex'), ' › ', nameD
    ]);

    const header = Utils.el('section', {
      class: 'poke-detail-header', style: `--tc:${Utils.TYPE_COLORS[typeNames[0]] || '#8a8fa3'}`
    }, [
      Utils.el('div', { class: 'poke-detail-art' }, [
        Utils.el('img', { class: 'poke-detail-img', src: Utils.officialArtwork(data), alt: 'Imagen oficial de ' + nameD, width: '220', height: '220' })
      ]),
      Utils.el('div', { class: 'poke-detail-info' }, [
        Utils.el('span', { class: 'poke-detail-id' }, Utils.padId(data.id)),
        Utils.el('h1', {}, nameD),
        Utils.el('div', { class: 'poke-card-types' }, typeNames.map(t => Utils.typeBadge(t, { link: true }))),
        flavorText ? Utils.el('p', { class: 'flavor-text' }, flavorText) : null,
        favBtn
      ])
    ]);

    const quickFacts = Utils.el('div', { class: 'quick-facts' }, [
      factCard('Altura', heightM + ' m'), factCard('Peso', weightKg + ' kg'),
      factCard('Exp. base', data.base_experience ?? 'N/D'), factCard('Generación', species.generation.name.replace('generation-', '').toUpperCase())
    ]);

    const about = Utils.el('p', { class: 'about-text' },
      `${nameD} es un Pokémon de tipo ${typesTxt} de la ${genLabel}, número ${data.id} de la Pokédex nacional. ` +
      `Mide ${heightM} m y pesa ${weightKg} kg. Su estadística base más alta es ${topStatLabel} (${topStat.base_stat}) ` +
      `y su total de estadísticas base es ${total}. ` +
      `Sus habilidades son ${abilityNames.join(', ')}.`);

    const abilitiesBox = Utils.el('div', { class: 'abilities-list' },
      data.abilities.map(a => Utils.el('a', {
        class: 'ability-chip' + (a.is_hidden ? ' hidden-ability' : ''),
        href: '/tools/abilities/' + a.ability.name
      }, Utils.displayName(a.ability.name) + (a.is_hidden ? ' (oculta)' : ''))));

    const statsBox = Utils.el('div', { class: 'stats-box' },
      data.stats.map(s => Utils.statBar(Utils.STAT_LABELS[s.stat.name] || s.stat.name, s.base_stat)));
    statsBox.appendChild(Utils.el('p', { class: 'stat-total' }, 'Total: ' + total));

    // Debilidades / resistencias (usa la matriz de tipos cacheada)
    const defenseBox = Utils.el('div', { class: 'relations-grid' });
    const defenseSection = Utils.el('section', {}, [
      Components.sectionTitle(`Debilidades y resistencias de ${nameD}`), defenseBox
    ]);

    const movesSection = Utils.el('section', { class: 'moves-section' });
    const movesSearch = Utils.el('input', { type: 'search', class: 'input', placeholder: 'Filtrar movimientos…', 'aria-label': 'Filtrar movimientos de ' + nameD });
    const movesList = Utils.el('div', { class: 'moves-grid' });
    function renderMoves(filter = '') {
      movesList.innerHTML = '';
      const sorted = data.moves
        .map(m => ({ name: m.move.name, detail: bestLearnMethod(m.version_group_details) }))
        .filter(m => m.name.includes(filter))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (sorted.length === 0) { movesList.appendChild(Components.emptyState('Sin resultados.')); return; }
      sorted.forEach(m => {
        movesList.appendChild(Utils.el('a', { class: 'move-chip', href: '/move/' + m.name }, [
          Utils.el('span', {}, Utils.displayName(m.name)),
          Utils.el('span', { class: 'muted small' }, m.detail)
        ]));
      });
    }
    movesSearch.addEventListener('input', Utils.debounce(e => renderMoves(e.target.value.trim().toLowerCase()), 250));
    movesSection.append(
      Components.sectionTitle(`Movimientos de ${nameD}`, `Puede aprender ${data.moves.length} movimientos en total.`),
      movesSearch, movesList
    );
    renderMoves();

    const evoWrap = Utils.el('div', { class: 'evo-chain' }, Utils.loadingSpinner('Cargando evolución…'));
    const evoSection = Utils.el('section', { class: 'evo-section' }, [
      Components.sectionTitle(`Evoluciones de ${nameD}`), evoWrap
    ]);

    const pager = Utils.el('nav', { class: 'poke-pager', 'aria-label': 'Pokémon anterior y siguiente' });

    container.append(
      breadcrumb, header, quickFacts, about,
      Components.sectionTitle('Habilidades'), abilitiesBox,
      Components.sectionTitle('Estadísticas base'), statsBox,
      defenseSection, evoSection
    );
    const ad = Components.adSlot('pokemon-mid');
    if (ad) container.appendChild(ad);
    container.append(movesSection, pager);

    // Secciones que cargan después (no bloquean la ficha)
    Types.defenseProfile(typeNames).then(profile => {
      defenseBox.append(
        relBox('Débil frente a', profile.weaknesses, true),
        relBox('Resiste a', profile.resistances, true),
        relBox('Inmune a', profile.immunities, false)
      );
    }).catch(() => defenseSection.remove());

    try {
      const chain = await Api.getEvolutionChain(species.evolution_chain.url);
      evoWrap.innerHTML = '';
      evoWrap.appendChild(await renderEvoNode(chain.chain, data.id));
    } catch {
      evoWrap.innerHTML = '';
      evoWrap.appendChild(Utils.errorBox('No pudimos cargar la cadena evolutiva.'));
    }

    if (data.id <= NATIONAL_DEX_TOTAL) {
      Api.getAllPokemonNames().then(names => {
        const prev = names[data.id - 2], next = names[data.id];
        if (prev) pager.appendChild(Utils.el('a', { class: 'btn btn-secondary', href: '/pokemon/' + prev }, '← ' + Utils.displayName(prev)));
        if (next) pager.appendChild(Utils.el('a', { class: 'btn btn-secondary', href: '/pokemon/' + next }, Utils.displayName(next) + ' →'));
      }).catch(() => {});
    }
  }

  function relBox(title, list, showMult) {
    return Utils.el('div', { class: 'rel-box' }, [
      Utils.el('h3', {}, title),
      list.length === 0
        ? Utils.el('p', { class: 'muted small' }, 'Ninguno')
        : Utils.el('div', { class: 'poke-card-types' }, list.map(w => {
            const badge = Utils.typeBadge(w.type, { link: true });
            if (showMult) badge.appendChild(document.createTextNode(' ×' + w.mult));
            return badge;
          }))
    ]);
  }

  function factCard(label, value) {
    return Utils.el('div', { class: 'fact-card' }, [
      Utils.el('span', { class: 'fact-value' }, String(value)),
      Utils.el('span', { class: 'fact-label' }, label)
    ]);
  }

  function bestLearnMethod(details) {
    if (!details || details.length === 0) return '';
    const last = details[details.length - 1];
    if (last.move_learn_method.name === 'level-up') return 'Nv. ' + last.level_learned_at;
    return Utils.displayName(last.move_learn_method.name);
  }

  async function renderEvoNode(node, highlightId) {
    const id = Utils.idFromUrl(node.species.url);
    let img = Utils.PLACEHOLDER_IMG;
    try { img = Utils.officialArtwork(await Api.getPokemon(id)); } catch { /* sin imagen */ }

    const nameD = Utils.displayName(node.species.name);
    const box = Utils.el('a', {
      class: 'evo-box' + (id === highlightId ? ' evo-current' : ''),
      href: '/pokemon/' + node.species.name,
      'aria-current': id === highlightId ? 'page' : null
    }, [
      Utils.el('img', { src: img, alt: 'Imagen de ' + nameD, loading: 'lazy', width: '72', height: '72' }),
      Utils.el('span', {}, nameD)
    ]);

    const group = Utils.el('div', { class: 'evo-node-group' }, [box]);
    if (node.evolves_to && node.evolves_to.length > 0) {
      const childrenWrap = Utils.el('div', { class: 'evo-children' });
      for (const child of node.evolves_to) {
        const branch = Utils.el('div', { class: 'evo-branch' });
        branch.appendChild(Utils.el('div', { class: 'evo-arrow' }, [
          Utils.el('span', { 'aria-hidden': 'true' }, '→'),
          Utils.el('small', {}, evolutionConditionText(child.evolution_details))
        ]));
        branch.appendChild(await renderEvoNode(child, highlightId));
        childrenWrap.appendChild(branch);
      }
      group.appendChild(childrenWrap);
    }
    return group;
  }

  function evolutionConditionText(detailsArr) {
    if (!detailsArr || detailsArr.length === 0) return '';
    const d = detailsArr[0];
    const parts = [];
    if (d.min_level) parts.push('Nivel ' + d.min_level);
    if (d.item) parts.push('Usar ' + Utils.displayName(d.item.name));
    if (d.held_item) parts.push('Llevando ' + Utils.displayName(d.held_item.name));
    if (d.known_move) parts.push('Conociendo ' + Utils.displayName(d.known_move.name));
    if (d.min_happiness) parts.push('Felicidad alta');
    if (d.time_of_day) parts.push(d.time_of_day === 'day' ? 'De día' : 'De noche');
    if (d.trigger && d.trigger.name === 'trade') parts.push('Intercambio');
    if (parts.length === 0 && d.trigger) parts.push(Utils.displayName(d.trigger.name));
    return parts.join(' · ');
  }

  // ---------------- Favoritos ----------------

  async function renderFavorites(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Mis Pokémon favoritos', 'Los favoritos se guardan solo en este navegador.'));
    const ids = Storage.getFavorites();
    const grid = Utils.el('div', { class: 'poke-grid' });

    function emptyMsg() {
      return Components.emptyState('Todavía no marcaste ningún Pokémon como favorito. Tocá la ☆ en cualquier tarjeta.',
        Utils.el('a', { class: 'btn', href: '/pokedex' }, 'Explorar la Pokédex'));
    }
    if (ids.length === 0) { container.appendChild(emptyMsg()); return; }

    container.appendChild(grid);
    // al quitar un favorito, la tarjeta desaparece al instante
    Components.lazyCards(grid, ids, {
      onFavChange: (id, isFav) => {
        if (isFav) return;
        const card = Array.from(grid.children).find(c => c.querySelector('.poke-card-id')?.textContent === Utils.padId(id));
        if (card) card.remove();
        if (Storage.getFavorites().length === 0) { grid.remove(); container.appendChild(emptyMsg()); }
      }
    });
  }

  // ---------------- Búsqueda global ----------------

  async function renderGlobalSearch(container, params) {
    container.innerHTML = '';
    Seo.set({ title: 'Buscar Pokémon y movimientos', description: 'Resultados de búsqueda en PokéTools.', noindex: true });
    const q = (params.query || '').trim().toLowerCase();
    container.appendChild(Components.pageHeader('Resultados de la búsqueda'));
    const slug = Utils.cleanSlug(q);
    if (slug) {
      try {
        const p = await Api.findPokemon(slug);
        Router.navigate('/pokemon/' + p.name, { replace: true });
        return;
      } catch (e) { if (!Utils.isNotFound(e)) throw e; }
      try {
        const m = await Api.getMove(slug);
        Router.navigate('/move/' + m.name, { replace: true });
        return;
      } catch (e) { if (!Utils.isNotFound(e)) throw e; }
    }
    container.appendChild(Components.emptyState('No encontramos ningún Pokémon o movimiento con ese nombre o número.',
      Utils.el('a', { class: 'btn', href: '/pokedex' }, 'Ir a la Pokédex')));
  }

  return { renderPokedex, renderPokemonDetail, renderFavorites, renderGlobalSearch, renderEvoNode, evolutionConditionText };
})();
