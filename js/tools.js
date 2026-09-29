/* ============================================================
   tools.js
   Sección /tools: mini-utilidades independientes.
   ============================================================ */

const Tools = (() => {
  const NATIONAL_DEX_TOTAL = 1025;

  function labeled(text, control) {
    return Utils.el('label', { class: 'field' }, [Utils.el('span', { class: 'field-label' }, text), control]);
  }

  // Lista de herramientas (también la usa la home)
  const TOOL_LIST = [
    { to: '/tools/random', icon: '🎲', title: 'Pokémon aleatorio', desc: 'Descubrí un Pokémon al azar.' },
    { to: '/tools/name-generator', icon: '🏷️', title: 'Generador de nombres', desc: 'Nombres para tu equipo Pokémon.' },
    { to: '/tools/evolutions', icon: '🧬', title: 'Buscador de evoluciones', desc: 'La línea evolutiva completa de cualquier Pokémon.' },
    { to: '/tools/abilities', icon: '✨', title: 'Buscador de habilidades', desc: 'Qué Pokémon tienen una habilidad.' },
    { to: '/tools/items', icon: '🎒', title: 'Buscador de objetos', desc: 'Consultá objetos de los juegos.' },
    { to: '/moves/learners', icon: '📘', title: '¿Quién aprende este movimiento?', desc: 'Pokémon que aprenden un movimiento, por juego.' }
  ];

  function toolCard(it) {
    return Utils.el('a', { class: 'feature-card', href: it.to }, [
      Utils.el('span', { class: 'feature-icon', 'aria-hidden': 'true' }, it.icon),
      Utils.el('h3', {}, it.title),
      Utils.el('p', { class: 'muted small' }, it.desc)
    ]);
  }

  function renderHub(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Herramientas Pokémon', 'Utilidades rápidas para explorar el mundo Pokémon.'));
    container.appendChild(Utils.el('div', { class: 'feature-grid' }, TOOL_LIST.map(toolCard)));
  }

  // ---- Pokémon aleatorio ----
  async function renderRandom(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Pokémon aleatorio', 'Un Pokémon al azar de la Pokédex nacional.'));
    const box = Utils.el('div', { class: 'random-box', 'aria-live': 'polite' });
    const btn = Utils.el('button', { class: 'btn', type: 'button' }, '¡Otro Pokémon!');
    container.append(box, btn);

    async function pick() {
      box.innerHTML = '';
      box.appendChild(Utils.loadingSpinner());
      try {
        const p = await Api.getPokemon(Utils.randomInt(1, NATIONAL_DEX_TOTAL));
        box.innerHTML = '';
        box.appendChild(Components.pokemonCard(p));
      } catch {
        box.innerHTML = '';
        box.appendChild(Utils.errorBox(Utils.GENERIC_ERROR, { retry: pick }));
      }
    }
    btn.addEventListener('click', pick);
    pick();
  }

  // ---- Generador de nombres de equipo ----
  function renderNameGenerator(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Generador de nombres de equipo', 'Ideas de nombres para tu equipo Pokémon.'));
    const prefixes = ['Escuadrón', 'Alianza', 'Legión', 'Clan', 'Brigada', 'Tropa', 'Orden', 'Pacto', 'Furia', 'Guardia'];
    const themes = ['Trueno', 'Fuego Eterno', 'Sombra', 'Cristal', 'Tormenta', 'Aurora', 'Abismo', 'Estrella Fugaz', 'Roca Viva', 'Viento Norte'];
    const box = Utils.el('div', { class: 'name-gen-box', 'aria-live': 'polite' });
    const btn = Utils.el('button', { class: 'btn', type: 'button' }, 'Generar nombre');
    container.append(box, btn);
    function gen() {
      box.innerHTML = '';
      box.appendChild(Utils.el('p', { class: 'generated-name' }, `${Utils.shuffle(prefixes)[0]} ${Utils.shuffle(themes)[0]}`));
    }
    btn.addEventListener('click', gen);
    gen();
  }

  // ---- Buscador de evoluciones ----
  function renderEvolutionFinder(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Buscador de evoluciones', 'Buscá un Pokémon y mirá toda su línea evolutiva.'));
    Components.ensurePokemonDatalist();
    const input = Utils.el('input', { class: 'input', type: 'search', list: 'pokemon-names', placeholder: 'Ej: eevee', autocomplete: 'off' });
    const btn = Utils.el('button', { class: 'btn', type: 'button' }, 'Buscar');
    const result = Utils.el('div', { class: 'evo-chain', 'aria-live': 'polite' });
    container.append(Utils.el('div', { class: 'filters-panel' }, [
      Utils.el('div', { class: 'compare-picker single' }, [labeled('Pokémon', input), btn])
    ]), result);

    async function run() {
      const q = input.value.trim();
      if (!q) return;
      result.innerHTML = '';
      result.appendChild(Utils.loadingSpinner());
      try {
        const p = await Api.findPokemon(q);
        const species = await Api.getPokemonSpecies(p.species.name);
        const chain = await Api.getEvolutionChain(species.evolution_chain.url);
        result.innerHTML = '';
        result.appendChild(await Pokedex.renderEvoNode(chain.chain, p.id));
      } catch (e) {
        result.innerHTML = '';
        result.appendChild(Utils.isNotFound(e) ? Utils.errorBox('No encontramos ese Pokémon.') : Utils.errorBox(Utils.GENERIC_ERROR, { retry: run }));
      }
    }
    btn.addEventListener('click', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  }

  // ---- Buscador de habilidades ----
  async function renderAbilitySearch(container, params) {
    container.innerHTML = '';
    const preset = params.name ? Utils.cleanSlug(params.name) : null;
    if (preset) {
      Seo.set({
        title: `Habilidad ${Utils.displayName(preset)}: qué Pokémon la tienen`,
        description: `Descripción de la habilidad ${Utils.displayName(preset)} y lista de Pokémon que la pueden tener.`,
        path: '/tools/abilities/' + preset
      });
    }
    container.appendChild(Components.pageHeader('Buscador de habilidades', 'Buscá una habilidad (en inglés) y mirá qué Pokémon la tienen.'));
    const input = Utils.el('input', { class: 'input', type: 'search', placeholder: 'Ej: overgrow, torrent…', value: preset || '', autocomplete: 'off' });
    const btn = Utils.el('button', { class: 'btn', type: 'button' }, 'Buscar');
    const result = Utils.el('div', { 'aria-live': 'polite' });
    container.append(Utils.el('div', { class: 'filters-panel' }, [
      Utils.el('div', { class: 'compare-picker single' }, [labeled('Habilidad', input), btn])
    ]), result);

    async function run() {
      const q = Utils.cleanSlug(input.value);
      if (!q) { result.innerHTML = ''; result.appendChild(Utils.errorBox('Escribí el nombre de una habilidad (ej: overgrow).')); return; }
      result.innerHTML = '';
      result.appendChild(Utils.loadingSpinner());
      try {
        const ability = await Api.getAbility(q);
        const effect = ability.effect_entries.find(e => e.language.name === 'es') ||
          ability.effect_entries.find(e => e.language.name === 'en');
        result.innerHTML = '';
        result.appendChild(Utils.el('h2', {}, Utils.displayName(ability.name)));
        result.appendChild(Utils.el('p', { class: 'flavor-text' }, effect ? (effect.short_effect || effect.effect) : 'Sin descripción disponible.'));
        const ids = ability.pokemon.map(p => Utils.idFromUrl(p.pokemon.url)).filter(id => id <= NATIONAL_DEX_TOTAL).sort((a, b) => a - b);
        result.appendChild(Utils.el('p', { class: 'muted' }, `${ids.length} Pokémon pueden tener esta habilidad.`));
        const grid = Utils.el('div', { class: 'poke-grid' });
        result.appendChild(grid);
        Components.lazyCards(grid, ids);
      } catch (e) {
        result.innerHTML = '';
        result.appendChild(Utils.isNotFound(e) ? Utils.errorBox('No encontramos esa habilidad.') : Utils.errorBox(Utils.GENERIC_ERROR, { retry: run }));
      }
    }
    btn.addEventListener('click', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    if (preset) run();
  }

  // ---- Buscador de objetos ----
  async function renderItemSearch(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Buscador de objetos', 'Consultá objetos de los juegos (nombre en inglés, ej: poke-ball).'));
    const input = Utils.el('input', { class: 'input', type: 'search', placeholder: 'Ej: poke-ball, oran-berry…', autocomplete: 'off' });
    const btn = Utils.el('button', { class: 'btn', type: 'button' }, 'Buscar');
    const result = Utils.el('div', { 'aria-live': 'polite' });
    container.append(Utils.el('div', { class: 'filters-panel' }, [
      Utils.el('div', { class: 'compare-picker single' }, [labeled('Objeto', input), btn])
    ]), result);

    async function run() {
      const q = Utils.cleanSlug(input.value);
      if (!q) { result.innerHTML = ''; result.appendChild(Utils.errorBox('Escribí el nombre de un objeto (ej: poke-ball).')); return; }
      result.innerHTML = '';
      result.appendChild(Utils.loadingSpinner());
      try {
        const item = await Api.getItem(q);
        const effect = item.effect_entries.find(e => e.language.name === 'es') ||
          item.effect_entries.find(e => e.language.name === 'en');
        result.innerHTML = '';
        result.appendChild(Utils.el('div', { class: 'item-detail' }, [
          item.sprites?.default ? Utils.el('img', { src: item.sprites.default, alt: Utils.displayName(item.name), width: '56', height: '56' }) : null,
          Utils.el('div', {}, [
            Utils.el('h2', {}, Utils.displayName(item.name)),
            Utils.el('p', { class: 'muted small' }, 'Categoría: ' + Utils.displayName(item.category.name)),
            item.cost ? Utils.el('p', { class: 'muted small' }, 'Costo: ' + item.cost) : null,
            Utils.el('p', { class: 'flavor-text' }, effect ? (effect.short_effect || effect.effect) : 'Sin descripción disponible.')
          ])
        ]));
      } catch (e) {
        result.innerHTML = '';
        result.appendChild(Utils.isNotFound(e) ? Utils.errorBox('No encontramos ese objeto.') : Utils.errorBox(Utils.GENERIC_ERROR, { retry: run }));
      }
    }
    btn.addEventListener('click', run);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  }

  return {
    TOOL_LIST, toolCard, renderHub, renderRandom, renderNameGenerator, renderEvolutionFinder,
    renderAbilitySearch, renderItemSearch
  };
})();
