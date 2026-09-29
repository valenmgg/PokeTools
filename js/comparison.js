/* ============================================================
   comparison.js
   Comparador de dos Pokémon: datos y estadísticas lado a lado.
   Solo muestra datos y diferencias; no declara un "mejor" Pokémon.
   URL compartible: /comparison?a=pikachu&b=raichu
   ============================================================ */

const Comparison = (() => {

  function labeled(text, control) {
    return Utils.el('label', { class: 'field' }, [Utils.el('span', { class: 'field-label' }, text), control]);
  }

  async function renderComparator(container, params, query) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Comparador de Pokémon', 'Elegí dos Pokémon para ver sus datos y estadísticas uno junto al otro.'));
    Components.ensurePokemonDatalist();

    const inputA = Utils.el('input', { class: 'input', type: 'search', list: 'pokemon-names', placeholder: 'Ej: pikachu', autocomplete: 'off', value: query?.get('a') || '' });
    const inputB = Utils.el('input', { class: 'input', type: 'search', list: 'pokemon-names', placeholder: 'Ej: raichu', autocomplete: 'off', value: query?.get('b') || '' });
    const goBtn = Utils.el('button', { class: 'btn', type: 'button' }, 'Comparar');
    const result = Utils.el('div', { class: 'compare-result', 'aria-live': 'polite' });
    container.append(
      Utils.el('div', { class: 'filters-panel' }, [
        Utils.el('div', { class: 'compare-picker' }, [labeled('Primer Pokémon', inputA), labeled('Segundo Pokémon', inputB), goBtn])
      ]),
      result
    );

    let runId = 0;
    async function run() {
      const a = inputA.value.trim(), b = inputB.value.trim();
      if (!a || !b) {
        result.innerHTML = '';
        result.appendChild(Utils.errorBox('Completá los dos Pokémon (nombre o número).'));
        return;
      }
      const myRun = ++runId;
      result.innerHTML = '';
      result.appendChild(Utils.loadingSpinner('Comparando…'));
      try {
        const [pa, pb] = await Promise.all([Api.findPokemon(a), Api.findPokemon(b)]);
        if (myRun !== runId) return;
        result.innerHTML = '';
        result.appendChild(buildComparison(pa, pb));
        Router.replaceUrl(`/comparison?a=${encodeURIComponent(pa.name)}&b=${encodeURIComponent(pb.name)}`);
      } catch (e) {
        if (myRun !== runId) return;
        result.innerHTML = '';
        result.appendChild(Utils.isNotFound(e)
          ? Utils.errorBox('No encontramos alguno de los dos Pokémon.')
          : Utils.errorBox(Utils.GENERIC_ERROR, { retry: run }));
      }
    }
    goBtn.addEventListener('click', run);
    [inputA, inputB].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') run(); }));
    if (inputA.value && inputB.value) run();
  }

  function total(p) { return p.stats.reduce((s, st) => s + st.base_stat, 0); }

  function buildComparison(pa, pb) {
    return Utils.el('div', { class: 'compare-grid' }, [sideCard(pa), statsCompareBox(pa, pb), sideCard(pb)]);
  }

  function sideCard(p) {
    const nameD = Utils.displayName(p.name);
    return Utils.el('div', { class: 'compare-side', style: `--tc:${Utils.TYPE_COLORS[p.types[0].type.name] || '#8a8fa3'}` }, [
      Utils.el('img', { src: Utils.officialArtwork(p), alt: 'Imagen de ' + nameD, width: '140', height: '140' }),
      Utils.el('h2', {}, Utils.el('a', { href: '/pokemon/' + p.name }, nameD)),
      Utils.el('div', { class: 'poke-card-types' }, p.types.map(t => Utils.typeBadge(t.type.name, { link: true }))),
      Utils.el('dl', { class: 'compare-facts' }, [
        Utils.el('dt', {}, 'Altura'), Utils.el('dd', {}, (p.height / 10).toFixed(1) + ' m'),
        Utils.el('dt', {}, 'Peso'), Utils.el('dd', {}, (p.weight / 10).toFixed(1) + ' kg'),
        Utils.el('dt', {}, 'Habilidades'), Utils.el('dd', {}, p.abilities.map(a => Utils.displayName(a.ability.name)).join(', ')),
        Utils.el('dt', {}, 'Total base'), Utils.el('dd', {}, String(total(p)))
      ])
    ]);
  }

  function statsCompareBox(pa, pb) {
    const box = Utils.el('div', { class: 'compare-stats' });
    const na = Utils.displayName(pa.name), nb = Utils.displayName(pb.name);
    box.appendChild(Utils.el('h2', { class: 'compare-title' }, 'Estadísticas base'));
    const statNames = pa.stats.map(s => s.stat.name);
    statNames.forEach(name => {
      const va = pa.stats.find(s => s.stat.name === name).base_stat;
      const vb = pb.stats.find(s => s.stat.name === name).base_stat;
      const max = Math.max(va, vb, 1);
      const diff = va - vb;
      box.appendChild(Utils.el('div', { class: 'compare-stat-row', role: 'img',
        'aria-label': `${Utils.STAT_LABELS[name]}: ${na} ${va}, ${nb} ${vb}` }, [
        Utils.el('span', { class: 'compare-stat-num' + (va > vb ? ' lead' : '') }, String(va)),
        Utils.el('div', { class: 'compare-stat-mid' }, [
          Utils.el('div', { class: 'compare-bar-track' }, [
            Utils.el('div', { class: 'compare-bar left', style: `width:${(va / max) * 50}%` }),
            Utils.el('div', { class: 'compare-bar right', style: `width:${(vb / max) * 50}%` })
          ]),
          Utils.el('span', { class: 'compare-stat-label' },
            Utils.STAT_LABELS[name] + (diff === 0 ? ' · igual' : ` · ${diff > 0 ? na : nb} +${Math.abs(diff)}`))
        ]),
        Utils.el('span', { class: 'compare-stat-num' + (vb > va ? ' lead' : '') }, String(vb))
      ]));
    });

    const diffs = statNames.map(name => ({
      name, diff: pa.stats.find(s => s.stat.name === name).base_stat - pb.stats.find(s => s.stat.name === name).base_stat
    })).sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
    const top = diffs[0];
    const notes = [];
    if (top && top.diff !== 0) {
      notes.push(`${top.diff > 0 ? na : nb} tiene ${Math.abs(top.diff)} puntos más de ${Utils.STAT_LABELS[top.name]}.`);
    }
    const td = total(pa) - total(pb);
    notes.push(td === 0 ? 'Ambos tienen el mismo total de estadísticas base.'
      : `Diferencia en el total base: ${Math.abs(td)} puntos a favor de ${td > 0 ? na : nb}.`);
    notes.push('La comparación muestra solo estadísticas base; no determina cuál es "mejor".');
    notes.forEach((n, i) => box.appendChild(Utils.el('p', { class: i === notes.length - 1 ? 'muted small' : 'compare-summary' }, n)));
    return box;
  }

  return { renderComparator };
})();
