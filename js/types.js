/* ============================================================
   types.js
   - /types: los 18 tipos + tabla de efectividad.
   - /types/:name: fortalezas, debilidades, resistencias, inmunidades
     y Pokémon de ese tipo.
   - Expone getMatrix()/defenseProfile() (reutilizados por equipos y fichas).
   ============================================================ */

const Types = (() => {
  let matrixCache = null;

  async function getMatrix() {
    if (matrixCache) return matrixCache;
    const allData = await Api.mapLimit(Utils.ALL_TYPES, 6, t => Api.getType(t));
    const matrix = {};
    Utils.ALL_TYPES.forEach(t => { matrix[t] = {}; Utils.ALL_TYPES.forEach(d => matrix[t][d] = 1); });
    allData.forEach(t => {
      const name = t.name;
      t.damage_relations.double_damage_to.forEach(d => { if (matrix[name][d.name] !== undefined) matrix[name][d.name] = 2; });
      t.damage_relations.half_damage_to.forEach(d => { if (matrix[name][d.name] !== undefined) matrix[name][d.name] = 0.5; });
      t.damage_relations.no_damage_to.forEach(d => { if (matrix[name][d.name] !== undefined) matrix[name][d.name] = 0; });
    });
    matrixCache = matrix;
    return matrix;
  }

  async function multiplierAgainst(attackType, defenderTypes) {
    const m = await getMatrix();
    return defenderTypes.reduce((acc, def) => acc * (m[attackType]?.[def] ?? 1), 1);
  }

  async function defenseProfile(defenderTypes) {
    const m = await getMatrix();
    const weaknesses = [], resistances = [], immunities = [];
    for (const atk of Utils.ALL_TYPES) {
      const mult = defenderTypes.reduce((acc, def) => acc * (m[atk]?.[def] ?? 1), 1);
      if (mult === 0) immunities.push({ type: atk, mult });
      else if (mult > 1) weaknesses.push({ type: atk, mult });
      else if (mult < 1) resistances.push({ type: atk, mult });
    }
    weaknesses.sort((a, b) => b.mult - a.mult);
    resistances.sort((a, b) => a.mult - b.mult);
    return { weaknesses, resistances, immunities };
  }

  async function renderTypesGrid(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Tipos Pokémon', 'Elegí un tipo para ver sus fortalezas, debilidades, resistencias e inmunidades.'));
    const grid = Utils.el('nav', { class: 'types-grid', 'aria-label': 'Tipos Pokémon' });
    Utils.ALL_TYPES.forEach(t => {
      grid.appendChild(Utils.el('a', {
        class: 'type-tile', href: '/types/' + t, style: `background:${Utils.TYPE_COLORS[t]}`
      }, Utils.typeLabel(t)));
    });
    container.appendChild(grid);

    container.appendChild(Components.sectionTitle('Tabla de efectividad de tipos',
      'Filas: tipo del ataque · Columnas: tipo del Pokémon que defiende. Deslizá la tabla si no entra en pantalla.'));
    container.appendChild(Utils.el('ul', { class: 'legend' }, [
      Utils.el('li', {}, [Utils.el('span', { class: 'legend-dot cell-weak' }), ' ×2 súper efectivo']),
      Utils.el('li', {}, [Utils.el('span', { class: 'legend-dot cell-resist' }), ' ×0,5 poco efectivo']),
      Utils.el('li', {}, [Utils.el('span', { class: 'legend-dot cell-immune' }), ' ×0 sin efecto'])
    ]));
    const holder = Utils.el('div', {}, Utils.loadingSpinner('Calculando tabla…'));
    container.appendChild(holder);
    const ad = Components.adSlot('types-bottom');
    if (ad) container.appendChild(ad);
    try {
      const matrix = await getMatrix();
      holder.innerHTML = '';
      holder.appendChild(buildEffectivenessTable(matrix));
    } catch {
      holder.innerHTML = '';
      holder.appendChild(Utils.errorBox(Utils.GENERIC_ERROR, { retry: () => renderTypesGrid(container) }));
    }
  }

  function buildEffectivenessTable(matrix) {
    const wrap = Utils.el('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': 'Tabla de efectividad de tipos' });
    const table = Utils.el('table', { class: 'effect-table' });
    table.appendChild(Utils.el('caption', { class: 'sr-only' }, 'Efectividad de cada tipo de ataque contra cada tipo defensor'));
    table.appendChild(Utils.el('tr', {}, [
      Utils.el('th', { scope: 'col' }, 'Atq ↓ / Def →'),
      ...Utils.ALL_TYPES.map(t => Utils.el('th', {
        scope: 'col', style: `background:${Utils.TYPE_COLORS[t]}`, title: Utils.typeLabel(t)
      }, Utils.typeLabel(t).slice(0, 3)))
    ]));
    Utils.ALL_TYPES.forEach(atk => {
      const row = Utils.el('tr', {}, [
        Utils.el('th', { scope: 'row', style: `background:${Utils.TYPE_COLORS[atk]}` }, Utils.typeLabel(atk))
      ]);
      Utils.ALL_TYPES.forEach(def => {
        const val = matrix[atk][def];
        row.appendChild(Utils.el('td', {
          class: cellClass(val), title: `${Utils.typeLabel(atk)} → ${Utils.typeLabel(def)}: ×${val}`
        }, val === 1 ? '' : String(val)));
      });
      table.appendChild(row);
    });
    wrap.appendChild(table);
    return wrap;
  }

  function cellClass(val) {
    if (val === 0) return 'cell-immune';
    if (val === 2) return 'cell-weak';
    if (val === 0.5) return 'cell-resist';
    return 'cell-neutral';
  }

  async function renderTypeDetail(container, params) {
    container.innerHTML = '';
    const typeName = (params.name || '').toLowerCase();
    if (!Utils.ALL_TYPES.includes(typeName)) {
      Seo.notFound();
      container.appendChild(Components.emptyState('No encontramos ese tipo.',
        Utils.el('a', { class: 'btn', href: '/types' }, 'Ver todos los tipos')));
      return;
    }
    const typeData = await Api.getType(typeName);
    const profile = await defenseProfile([typeName]);
    const rel = typeData.damage_relations;
    const label = Utils.typeLabel(typeName);

    Seo.set({
      title: `Tipo ${label}: fortalezas, debilidades y Pokémon`,
      description: `Tipo ${label}: es débil a ${profile.weaknesses.map(w => Utils.typeLabel(w.type)).join(', ') || 'ningún tipo'}, resiste ${profile.resistances.length} tipos y ataca con ventaja a ${rel.double_damage_to.map(t => Utils.typeLabel(t.name)).join(', ') || 'ningún tipo'}. Lista de Pokémon de tipo ${label}.`,
      path: '/types/' + typeName,
      jsonLd: Seo.breadcrumbs([
        { name: 'Inicio', path: '/' }, { name: 'Tipos', path: '/types' }, { name: label, path: '/types/' + typeName }
      ])
    });

    container.append(
      Utils.el('nav', { class: 'breadcrumb', 'aria-label': 'Ruta de navegación' }, [
        Utils.el('a', { href: '/' }, 'Inicio'), ' › ', Utils.el('a', { href: '/types' }, 'Tipos'), ' › ', label
      ]),
      Utils.el('header', { class: 'type-header', style: `background:${Utils.TYPE_COLORS[typeName]}` }, [
        Utils.el('h1', {}, 'Tipo ' + label)
      ]),
      Utils.el('div', { class: 'relations-grid' }, [
        relBox('Ataca con ventaja a', rel.double_damage_to),
        relBox('Ataca con poca efectividad a', rel.half_damage_to),
        relBox('No afecta a', rel.no_damage_to),
        relBox('Débil frente a', profile.weaknesses.map(w => ({ name: w.type }))),
        relBox('Resiste a', profile.resistances.map(w => ({ name: w.type }))),
        relBox('Inmune a', profile.immunities.map(w => ({ name: w.type })))
      ])
    );

    container.appendChild(Components.sectionTitle('Pokémon de tipo ' + label));
    const ids = typeData.pokemon.map(p => Utils.idFromUrl(p.pokemon.url)).filter(id => id <= 1025).sort((a, b) => a - b);
    const grid = Utils.el('div', { class: 'poke-grid' });
    container.appendChild(grid);
    Components.lazyCards(grid, ids);
    const ad = Components.adSlot('type-bottom');
    if (ad) container.appendChild(ad);
  }

  function relBox(title, list) {
    return Utils.el('div', { class: 'rel-box' }, [
      Utils.el('h3', {}, title),
      list.length === 0
        ? Utils.el('p', { class: 'muted small' }, 'Ninguno')
        : Utils.el('div', { class: 'poke-card-types' }, list.map(t => Utils.typeBadge(t.name, { link: true })))
    ]);
  }

  return { renderTypesGrid, renderTypeDetail, getMatrix, multiplierAgainst, defenseProfile };
})();
