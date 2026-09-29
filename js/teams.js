/* ============================================================
   teams.js
   - /teams: generador de equipos de 6 Pokémon (aleatorio o "equilibrado").
   - /teams/analyzer: analizador (tipos, debilidades, resistencias,
     inmunidades, cobertura y observaciones de composición).

   LIMITACIONES (también explicadas en la interfaz):
   * PokéAPI no indica con exactitud qué Pokémon están en cada juego
     (dex regionales, exclusivos, remakes). Filtramos por generación:
     "todos los Pokémon introducidos hasta la generación N".
   * La cobertura ofensiva se aproxima con los tipos propios de cada
     Pokémon (ataques STAB), no con sus movimientos reales.
   * Los resultados son descriptivos: no hay "mejor equipo" objetivo.
   ============================================================ */

const Teams = (() => {

  function labeled(text, control) {
    return Utils.el('label', { class: 'field' }, [Utils.el('span', { class: 'field-label' }, text), control]);
  }

  function checkbox(label) {
    const input = Utils.el('input', { type: 'checkbox' });
    return { input, wrap: Utils.el('label', { class: 'checkbox-label' }, [input, ' ' + label]) };
  }

  async function renderTeamGenerator(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Generador de equipos Pokémon', 'Armá un equipo de 6 Pokémon: totalmente aleatorio o equilibrado en tipos.'));
    Components.ensurePokemonDatalist();

    const gameSelect = Utils.el('select', { class: 'input' }, [
      Utils.el('option', { value: '' }, 'Todas las generaciones'),
      ...Object.entries(Utils.GAME_TO_GEN).map(([label, gen]) => Utils.el('option', { value: gen }, `${label} (hasta Gen ${gen})`))
    ]);
    const typeSelect = Utils.el('select', { class: 'input' }, [
      Utils.el('option', { value: '' }, 'Cualquier tipo'),
      ...Utils.ALL_TYPES.map(t => Utils.el('option', { value: t }, Utils.typeLabel(t)))
    ]);
    const excludeLegendary = checkbox('Excluir legendarios y míticos');
    const requiredInput = Utils.el('input', { class: 'input', list: 'pokemon-names', placeholder: 'Ej: pikachu, charizard (opcional)', autocomplete: 'off' });
    const balancedBtn = Utils.el('button', { class: 'btn', type: 'button' }, '⚖️ Generar equipo equilibrado');
    const randomBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button' }, '🎲 Generar equipo aleatorio');

    const explain = Utils.el('details', { class: 'explain' }, [
      Utils.el('summary', {}, '¿Cómo funciona? Limitaciones'),
      Utils.el('p', {}, 'Disponibilidad: PokéAPI no informa con exactitud qué Pokémon están en cada juego. Usamos una aproximación: todos los Pokémon introducidos hasta la generación del juego elegido.'),
      Utils.el('p', {}, 'Equipo equilibrado: se evalúan grupos de candidatos al azar y se elige el que suma más puntos según (1) tipos nuevos para el equipo, (2) resistencias a tipos frente a los que el equipo ya es débil, (3) pocas debilidades propias y (4) estadísticas base algo más altas. Es una heurística simple y explicable, no un algoritmo competitivo: no existe un equipo objetivamente "mejor".')
    ]);

    const result = Utils.el('div', { class: 'team-result', 'aria-live': 'polite' });
    container.append(
      Utils.el('div', { class: 'filters-panel' }, [
        Utils.el('div', { class: 'pokedex-controls' }, [
          labeled('Juego / generación', gameSelect), labeled('Tipo preferido', typeSelect),
          labeled('Pokémon obligatorios (separados por coma)', requiredInput), excludeLegendary.wrap
        ]),
        Utils.el('div', { class: 'btn-row' }, [randomBtn, balancedBtn])
      ]),
      explain, result
    );

    let lastBalanced = true, runId = 0;
    async function generate(balanced) {
      lastBalanced = balanced;
      const myRun = ++runId;
      result.innerHTML = '';
      result.appendChild(Utils.loadingSpinner('Armando equipo…'));
      try {
        const options = {
          gen: gameSelect.value ? Number(gameSelect.value) : null,
          preferredType: typeSelect.value || null,
          excludeLegendary: excludeLegendary.input.checked,
          required: requiredInput.value.split(',').map(s => Utils.cleanSlug(s)).filter(Boolean),
          balanced
        };
        const team = await generateTeam(options);
        if (myRun !== runId) return;
        result.innerHTML = '';
        result.appendChild(await buildTeamResult(team, options));
        result.appendChild(Utils.el('button', { class: 'btn btn-secondary', type: 'button', onclick: () => generate(lastBalanced) }, '🔄 Generar otro equipo'));
      } catch (e) {
        if (myRun !== runId) return;
        console.error(e);
        result.innerHTML = '';
        result.appendChild(Utils.errorBox('No pudimos generar un equipo con esos filtros. Probá con opciones menos restrictivas o reintentá.', { retry: () => generate(balanced) }));
      }
    }
    randomBtn.addEventListener('click', () => generate(false));
    balancedBtn.addEventListener('click', () => generate(true));
  }

  async function buildPool(gen, preferredType) {
    let pool;
    if (gen) {
      const names = await Api.getSpeciesUpToGeneration(gen);
      pool = Array.from(names);
    } else {
      const all = await Api.getPokemonList(1025, 0);
      pool = all.results.map(r => r.name);
    }
    if (preferredType) {
      const typeData = await Api.getType(preferredType);
      const typeNames = new Set(typeData.pokemon.map(p => p.pokemon.name));
      pool = pool.filter(n => typeNames.has(n));
    }
    return Utils.shuffle(pool);
  }

  async function generateTeam(options) {
    const pool = await buildPool(options.gen, options.preferredType);
    if (pool.length === 0) throw new Error('empty pool');

    const team = []; // array de objetos pokemon completos
    const usedNames = new Set();

    // Pokémon obligatorios primero
    for (const reqName of options.required) {
      if (team.length >= 6) break;
      try {
        const p = await Api.getPokemon(reqName);
        if (!usedNames.has(p.name)) { team.push(p); usedNames.add(p.name); }
      } catch { /* si el nombre obligatorio no existe, se ignora */ }
    }

    let poolIndex = 0;
    let attempts = 0;
    const maxAttempts = pool.length * 2 + 20;

    while (team.length < 6 && attempts < maxAttempts) {
      attempts++;
      // Para el modo equilibrado, evaluamos un pequeño lote de candidatos y elegimos el mejor
      const batchSize = options.balanced ? 6 : 1;
      const batch = [];
      while (batch.length < batchSize && poolIndex < pool.length) {
        const name = pool[poolIndex++];
        if (!usedNames.has(name)) batch.push(name);
      }
      if (batch.length === 0) break;

      const candidates = (await Api.mapLimit(batch, 4, n => Api.getPokemon(n).catch(() => null)))
        .filter(Boolean);

      let valid = candidates;
      if (options.excludeLegendary) {
        const speciesData = await Api.mapLimit(valid, 4, p => Api.getPokemonSpecies(p.species.name).catch(() => null));
        valid = valid.filter((p, i) => speciesData[i] && !speciesData[i].is_legendary && !speciesData[i].is_mythical);
      }
      if (valid.length === 0) continue;

      let chosen;
      if (options.balanced) {
        const scored = await Promise.all(valid.map(async p => ({ p, score: await scoreCandidate(p, team) })));
        scored.sort((a, b) => b.score - a.score);
        chosen = scored[0].p;
      } else {
        chosen = valid[0];
      }
      team.push(chosen);
      usedNames.add(chosen.name);
    }

    if (team.length < 6) {
      throw new Error('No se pudo completar el equipo con esos filtros.');
    }
    return team;
  }

  // Puntaje simple: premia diversidad de tipos, cobertura de debilidades del equipo y estadísticas totales
  async function scoreCandidate(p, currentTeam) {
    const types = p.types.map(t => t.type.name);
    let score = 0;

    const teamTypes = currentTeam.flatMap(m => m.types.map(t => t.type.name));
    const newTypes = types.filter(t => !teamTypes.includes(t));
    score += newTypes.length * 8; // diversidad

    if (currentTeam.length > 0) {
      const profile = await Types.defenseProfile(types);
      // Si este Pokémon resiste tipos frente a los que el equipo ya es débil, suma puntos
      const teamWeakTypes = new Set();
      for (const member of currentTeam) {
        const mp = await Types.defenseProfile(member.types.map(t => t.type.name));
        mp.weaknesses.forEach(w => teamWeakTypes.add(w.type));
      }
      const coversWeakness = profile.resistances.filter(r => teamWeakTypes.has(r.type)).length +
        profile.immunities.filter(im => teamWeakTypes.has(im.type)).length * 1.5;
      score += coversWeakness * 6;
      score -= profile.weaknesses.length * 1.5; // penaliza Pokémon muy frágiles
    }

    const total = p.stats.reduce((s, st) => s + st.base_stat, 0);
    score += total / 40; // leve preferencia por estadísticas más altas

    return score;
  }

  async function buildTeamResult(team) {
    const wrap = Utils.el('div', {});
    const grid = Utils.el('div', { class: 'team-slots' }, team.map((p, i) => teamSlot(p, i)));
    wrap.appendChild(grid);
    wrap.appendChild(Components.sectionTitle('Fortalezas y debilidades generales del equipo', null, 2));
    wrap.appendChild(await teamTypeSummary(team));
    return wrap;
  }

  function teamSlot(p, i) {
    const total = p.stats.reduce((s, st) => s + st.base_stat, 0);
    const top = p.stats.slice().sort((a, b) => b.base_stat - a.base_stat)[0];
    return Utils.el('div', { class: 'team-slot' }, [
      Utils.el('span', { class: 'slot-num', 'aria-hidden': 'true' }, String(i + 1)),
      Components.pokemonCard(p),
      Utils.el('p', { class: 'slot-stats muted small' }, `Total ${total} · Mayor: ${Utils.STAT_LABELS[top.stat.name]} ${top.base_stat}`)
    ]);
  }

  // ---------------- Analizador de equipo ----------------

  async function renderTeamAnalyzer(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Analizador de equipos Pokémon', 'Ingresá hasta 6 Pokémon y mirá sus tipos, debilidades, resistencias y cobertura.'));
    Components.ensurePokemonDatalist();

    const inputs = Array.from({ length: 6 }, (_, i) =>
      Utils.el('input', { class: 'input', list: 'pokemon-names', placeholder: 'Nombre o número', autocomplete: 'off' }));
    const analyzeBtn = Utils.el('button', { class: 'btn', type: 'button' }, 'Analizar equipo');
    const result = Utils.el('div', { class: 'team-result', 'aria-live': 'polite' });
    container.append(
      Utils.el('div', { class: 'filters-panel' }, [
        Utils.el('div', { class: 'team-inputs' }, inputs.map((inp, i) => labeled('Pokémon ' + (i + 1), inp))),
        analyzeBtn
      ]),
      result
    );

    async function analyze() {
      const names = inputs.map(i => i.value.trim()).filter(Boolean);
      if (names.length === 0) {
        result.innerHTML = '';
        result.appendChild(Utils.errorBox('Ingresá al menos un Pokémon.'));
        return;
      }
      result.innerHTML = '';
      result.appendChild(Utils.loadingSpinner('Analizando equipo…'));
      try {
        const found = await Api.mapLimit(names, 4, async n => {
          try { return await Api.findPokemon(n); }
          catch (e) { if (Utils.isNotFound(e)) return null; throw e; }
        });
        const team = found.filter(Boolean);
        const missing = names.filter((n, i) => !found[i]);
        if (team.length === 0) throw Object.assign(new Error('none'), { kind: 'notfound' });
        result.innerHTML = '';
        if (missing.length) result.appendChild(Utils.errorBox('No encontramos: ' + missing.join(', ') + '. Analizamos el resto.'));
        result.appendChild(Utils.el('div', { class: 'team-slots' }, team.map((p, i) => teamSlot(p, i))));
        result.appendChild(await teamTypeSummary(team));
      } catch (e) {
        result.innerHTML = '';
        result.appendChild(Utils.isNotFound(e)
          ? Utils.errorBox('No encontramos esos Pokémon. Revisá los nombres.')
          : Utils.errorBox(Utils.GENERIC_ERROR, { retry: analyze }));
      }
    }
    analyzeBtn.addEventListener('click', analyze);
  }

  function countBadges(countObj, teamSize) {
    const entries = Object.entries(countObj).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return Utils.el('p', { class: 'muted small' }, 'Ninguna destacable.');
    return Utils.el('div', { class: 'poke-card-types count-badges' }, entries.map(([t, c]) => {
      const b = Utils.typeBadge(t, { link: true });
      b.appendChild(document.createTextNode(` ${c}/${teamSize}`));
      return b;
    }));
  }

  async function teamTypeSummary(team) {
    const box = Utils.el('div', { class: 'team-summary' });
    const size = team.length;

    const typeCount = {};
    team.forEach(p => p.types.forEach(t => { typeCount[t.type.name] = (typeCount[t.type.name] || 0) + 1; }));

    const weakCount = {}, resistCount = {}, immuneCount = {};
    for (const p of team) {
      const profile = await Types.defenseProfile(p.types.map(t => t.type.name));
      profile.weaknesses.forEach(w => weakCount[w.type] = (weakCount[w.type] || 0) + 1);
      profile.resistances.forEach(r => resistCount[r.type] = (resistCount[r.type] || 0) + 1);
      profile.immunities.forEach(im => immuneCount[im.type] = (immuneCount[im.type] || 0) + 1);
    }

    box.append(
      section('Tipos presentes', Utils.el('div', { class: 'poke-card-types' },
        Object.entries(typeCount).map(([t, c]) => {
          const b = Utils.typeBadge(t, { link: true });
          if (c > 1) b.appendChild(document.createTextNode(' ×' + c));
          return b;
        }))),
      section('Debilidades (Pokémon débiles a cada tipo)', countBadges(weakCount, size)),
      section('Resistencias (Pokémon que resisten cada tipo)', countBadges(resistCount, size))
    );
    if (Object.keys(immuneCount).length > 0) {
      box.appendChild(section('Inmunidades', countBadges(immuneCount, size)));
    }

    // Cobertura ofensiva aproximada con los tipos propios del equipo (STAB)
    const matrix = await Types.getMatrix();
    const ownTypes = Array.from(new Set(team.flatMap(p => p.types.map(t => t.type.name))));
    const covered = Utils.ALL_TYPES.filter(def => ownTypes.some(atk => matrix[atk][def] > 1));
    const uncovered = Utils.ALL_TYPES.filter(def => !covered.includes(def));
    box.appendChild(section('Cobertura ofensiva aproximada',
      Utils.el('div', {}, [
        Utils.el('p', { class: 'muted small' }, 'Basada en los tipos propios de cada Pokémon (ataques STAB). La cobertura real depende de los movimientos que elijas.'),
        Utils.el('p', { class: 'small' }, `Tipos a los que el equipo puede atacar con ventaja (${covered.length}/18):`),
        Utils.el('div', { class: 'poke-card-types' }, covered.map(t => Utils.typeBadge(t, { link: true }))),
        uncovered.length ? Utils.el('p', { class: 'small' }, 'Sin ataque con ventaja a:') : null,
        uncovered.length ? Utils.el('div', { class: 'poke-card-types' }, uncovered.map(t => Utils.typeBadge(t, { link: true }))) : null
      ])));

    // Observaciones descriptivas
    const notes = [];
    Object.entries(weakCount).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])
      .forEach(([t, c]) => notes.push(`${c} Pokémon son débiles a ${Utils.typeLabel(t)}.`));
    Object.entries(weakCount).filter(([t, c]) => c >= 2 && !resistCount[t] && !immuneCount[t])
      .forEach(([t]) => notes.push(`Ningún Pokémon del equipo resiste ${Utils.typeLabel(t)}, y hay más de uno débil a ese tipo.`));
    Object.entries(immuneCount).forEach(([t, c]) => notes.push(`El equipo tiene ${c} inmunidad${c > 1 ? 'es' : ''} a ${Utils.typeLabel(t)}.`));
    Object.entries(typeCount).filter(([, c]) => c >= 3)
      .forEach(([t, c]) => notes.push(`Hay ${c} Pokémon con el tipo ${Utils.typeLabel(t)} (repetición alta).`));
    if (uncovered.length) notes.push(`Los tipos del equipo no atacan con ventaja a: ${uncovered.map(Utils.typeLabel).join(', ')}.`);
    if (notes.length === 0) notes.push('No se detectan patrones marcados de debilidad, repetición o falta de cobertura.');
    box.appendChild(section('Observaciones', Utils.el('ul', { class: 'summary-list' }, notes.map(n => Utils.el('li', {}, n)))));
    box.appendChild(Utils.el('p', { class: 'muted small' }, 'Estas observaciones son descriptivas y no califican al equipo como bueno o malo.'));
    return box;
  }

  function section(title, node) {
    return Utils.el('div', { class: 'summary-block' }, [Utils.el('h3', {}, title), node]);
  }

  return { renderTeamGenerator, renderTeamAnalyzer };
})();
