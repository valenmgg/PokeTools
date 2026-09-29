/* ============================================================
   games.js
   Sección PokéGames: minijuegos originales que corren 100% en el
   navegador, usando datos reales de la PokéAPI. Ninguno usa ROMs
   ni contenido con derechos de autor de terceros más allá de los
   datos/sprites que la propia PokéAPI expone.
   ============================================================ */

const Games = (() => {
  const NATIONAL_DEX_TOTAL = 1025;

  function normalize(str) {
    return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function scoreboard(gameId) {
    const sc = Storage.getScore(gameId);
    const box = Utils.el('div', { class: 'scoreboard' }, [
      Utils.el('span', {}, '🔥 Racha: ' + sc.streak),
      Utils.el('span', {}, '🏆 Mejor racha: ' + sc.best),
      Utils.el('span', {}, '✅ Aciertos: ' + sc.correct + '/' + sc.played),
      Utils.el('button', {
        class: 'link-btn', type: 'button',
        onclick: () => { Storage.resetScore(gameId); box.replaceWith(scoreboard(gameId)); }
      }, 'Reiniciar puntaje')
    ]);
    return box;
  }

  function refreshScoreboard(container, gameId) {
    const old = container.querySelector('.scoreboard');
    if (old) old.replaceWith(scoreboard(gameId));
  }

  // Encabezado común de cada juego: título (H1), descripción, instrucciones (modal) y puntaje
  function gameHeader(container, { title, subtitle, howTo, gameId }) {
    const head = Components.pageHeader(title, subtitle);
    head.appendChild(Utils.el('div', { class: 'game-head-actions' }, [
      Utils.el('a', { class: 'link-btn', href: '/games' }, '← Todos los juegos'),
      Utils.el('button', {
        class: 'btn btn-secondary btn-small', type: 'button',
        onclick: () => Components.modal('Cómo jugar', Utils.el('ul', { class: 'summary-list' }, howTo.map(h => Utils.el('li', {}, h))))
      }, '❓ Cómo jugar')
    ]));
    container.appendChild(head);
    if (gameId) container.appendChild(scoreboard(gameId));
  }

  function randomPokemonId() { return Utils.randomInt(1, NATIONAL_DEX_TOTAL); }

  // ---------------- Hub ----------------
  const GAME_LIST = [
    { to: '/games/who-is-that-pokemon', id: 'who-is-this', icon: '❓', title: '¿Quién es este Pokémon?', desc: 'Adiviná a partir de su silueta.' },
    { to: '/games/pokemonle', id: 'pokemonle', icon: '🟩', title: 'Pokémonle', desc: 'Un Pokémon secreto por día, con pistas.' },
    { to: '/games/guess-type', id: 'guess-type', icon: '🎯', title: 'Adivina el tipo', desc: 'Mirá al Pokémon y elegí su tipo.' },
    { to: '/games/guess-evolution', id: 'guess-evolution', icon: '🧬', title: 'Adivina la evolución', desc: '¿En qué evoluciona este Pokémon?' },
    { to: '/games/trivia', id: 'trivia', icon: '🧠', title: 'Trivia Pokémon', desc: 'Preguntas de opción múltiple.' },
    { to: '/games/who-has-more', id: 'higher-stat', icon: '⚡', title: '¿Quién tiene más?', desc: 'Compará estadísticas entre dos Pokémon.' },
    { to: '/games/guess-stats', id: 'guess-stats', icon: '📊', title: 'Adivina por estadísticas', desc: 'Sin nombre ni imagen: solo números.' },
    { to: '/games/guess-move', id: 'guess-move', icon: '💥', title: 'Adivina el movimiento', desc: 'Pistas de un movimiento secreto.' }
  ];

  function gameCard(g, withScore) {
    const sc = withScore ? Storage.getScore(g.id) : null;
    return Utils.el('a', { class: 'feature-card game-card', href: g.to }, [
      Utils.el('span', { class: 'feature-icon', 'aria-hidden': 'true' }, g.icon),
      Utils.el('h3', {}, g.title),
      Utils.el('p', { class: 'muted small' }, g.desc),
      sc && sc.played > 0 ? Utils.el('span', { class: 'game-best' }, '🏆 Mejor racha: ' + sc.best) : null
    ]);
  }

  function renderHub(container) {
    container.innerHTML = '';
    container.appendChild(Components.pageHeader('Juegos Pokémon: PokéGames', 'Ocho minijuegos originales para poner a prueba lo que sabés de Pokémon. Se juegan en el navegador y guardan tus rachas en este dispositivo.'));

    const daily = Storage.dailyDoneToday();
    const streak = Storage.dailyStreak();
    container.appendChild(Utils.el('a', { class: 'daily-banner', href: '/daily-challenge' }, [
      Utils.el('span', { class: 'feature-icon', 'aria-hidden': 'true' }, '📅'),
      Utils.el('div', {}, [
        Utils.el('h2', {}, 'Desafío diario'),
        Utils.el('p', {}, daily ? (daily.correct ? '¡Completado hoy! Volvé mañana.' : 'Ya lo jugaste hoy. Volvé mañana.') : 'Un Pokémon misterioso nuevo cada día.'),
        streak > 0 ? Utils.el('span', { class: 'game-best' }, '🔥 Racha diaria: ' + streak) : null
      ])
    ]));

    container.appendChild(Utils.el('div', { class: 'feature-grid' }, GAME_LIST.map(g => gameCard(g, true))));
    const ad = Components.adSlot('games-bottom');
    if (ad) container.appendChild(ad);
  }

  // ---------------- Juego 1: ¿Quién es este Pokémon? ----------------
  async function renderWhoIsThis(container, opts = {}) {
    const gameId = opts.dailyId ? 'daily' : 'who-is-this';
    container.innerHTML = '';
    gameHeader(container, {
      title: opts.dailyTitle || '¿Quién es este Pokémon?',
      subtitle: opts.dailyId ? 'Todos reciben el mismo Pokémon hoy. Solo tenés un intento.' : 'Mirá la silueta y escribí el nombre del Pokémon.',
      howTo: ['Se muestra la silueta de un Pokémon.', 'Escribí su nombre (en inglés, como figura en la Pokédex) y pulsá Comprobar.', opts.dailyId ? 'El desafío diario permite un solo intento por día.' : 'Cada acierto seguido suma a tu racha.'],
      gameId: opts.dailyId ? null : gameId
    });

    const img = Utils.el('img', { class: 'silhouette-img', alt: 'Silueta de un Pokémon oculto', width: '220', height: '220' });
    const imgWrap = Utils.el('div', { class: 'silhouette-wrap' }, [img]);
    const form = Utils.el('form', { class: 'guess-form' });
    const input = Utils.el('input', { class: 'input', placeholder: 'Escribí el nombre…', autocomplete: 'off', 'aria-label': 'Escribí el nombre' });
    const submitBtn = Utils.el('button', { class: 'btn', type: 'submit' }, 'Comprobar');
    form.append(input, submitBtn);
    const feedback = Utils.el('div', { class: 'game-feedback' });
    const nextBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button', style: 'display:none' }, 'Otra ronda ▶');
    container.append(imgWrap, form, feedback, nextBtn);

    let current = null;
    let answered = false;

    async function loadRound() {
      answered = false;
      feedback.innerHTML = '';
      input.value = '';
      input.disabled = false;
      submitBtn.disabled = false;
      nextBtn.style.display = 'none';
      img.classList.add('is-silhouette');
      const id = opts.dailyId || randomPokemonId();
      current = await Api.getPokemon(id);
      img.src = Utils.officialArtwork(current);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (answered || !current) return;
      answered = true;
      input.disabled = true;
      submitBtn.disabled = true;
      const correct = normalize(input.value) === normalize(current.name);
      img.classList.remove('is-silhouette');
      img.alt = 'Imagen de ' + Utils.displayName(current.name);
      feedback.innerHTML = '';
      feedback.appendChild(Utils.el('p', { class: correct ? 'feedback-ok' : 'feedback-bad' },
        correct ? '¡Correcto! Es ' + Utils.displayName(current.name) : 'Era ' + Utils.displayName(current.name) + '. ¡Seguí intentando!'));
      if (opts.dailyId) {
        const d = Storage.completeDaily(correct);
        feedback.appendChild(Utils.el('p', { class: 'muted' }, d.streak > 0 ? '🔥 Racha diaria: ' + d.streak + ' (mejor: ' + d.bestStreak + ')' : 'Volvé mañana para un nuevo desafío.'));
      } else {
        Storage.updateScore(gameId, { correct });
        refreshScoreboard(container, gameId);
      }
      if (!opts.dailyId) nextBtn.style.display = 'inline-block';
    });
    nextBtn.addEventListener('click', loadRound);

    if (opts.dailyId) {
      const daily = Storage.dailyDoneToday();
      if (daily) {
        await loadRoundButShowResult(daily);
        return;
      }
    }
    await loadRound();

    async function loadRoundButShowResult(daily) {
      current = await Api.getPokemon(opts.dailyId);
      img.src = Utils.officialArtwork(current);
      img.classList.remove('is-silhouette');
      input.disabled = true; submitBtn.disabled = true;
      feedback.appendChild(Utils.el('p', { class: daily.correct ? 'feedback-ok' : 'feedback-bad' },
        `Ya completaste el desafío de hoy. Era ${Utils.displayName(current.name)}. ¡Volvé mañana por uno nuevo!`));
      if (daily.streak > 0) feedback.appendChild(Utils.el('p', { class: 'muted' }, '🔥 Racha diaria: ' + daily.streak + ' (mejor: ' + (daily.bestStreak || daily.streak) + ')'));
    }
  }

  // ---------------- Juego 2: Pokémonle ----------------
  async function renderPokemonle(container) {
    container.innerHTML = '';
    gameHeader(container, {
      title: 'Pokémonle', subtitle: 'Adiviná el Pokémon secreto del día en 6 intentos, con pistas.', gameId: 'pokemonle',
      howTo: ['Escribí el nombre de un Pokémon y pulsá Adivinar.', 'Verde: coincide. Naranja: coincide parcialmente (un tipo en común). Gris: no coincide.', 'Las flechas de Altura y Peso indican si el secreto es más grande (↑) o más chico (↓).', 'El Pokémon secreto es el mismo para todos durante el día.']
    });

    const rand = Utils.seededRandom('pokemonle-' + Utils.todaySeed());
    const targetId = 1 + Math.floor(rand() * NATIONAL_DEX_TOTAL);
    const target = await Api.getPokemon(targetId);
    const targetSpecies = await Api.getPokemonSpecies(target.species.name);

    const guessesBox = Utils.el('div', { class: 'wordle-guesses' });
    const form = Utils.el('form', { class: 'guess-form' });
    const input = Utils.el('input', { class: 'input', placeholder: 'Nombre de un Pokémon…', autocomplete: 'off', 'aria-label': 'Nombre de un Pokémon' });
    const btn = Utils.el('button', { class: 'btn', type: 'submit' }, 'Adivinar');
    form.append(input, btn);
    const feedback = Utils.el('div', { class: 'game-feedback' });
    container.append(guessesBox, form, feedback);

    let attempts = 0;
    const maxAttempts = 6;
    let finished = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (finished) return;
      const q = input.value.trim();
      if (!q) return;
      let guess, guessSpecies;
      try {
        guess = await Api.findPokemon(q);
        guessSpecies = await Api.getPokemonSpecies(guess.species.name);
      } catch {
        feedback.innerHTML = '';
        feedback.appendChild(Utils.errorBox('No encontramos ese Pokémon.'));
        return;
      }
      attempts++;
      input.value = '';
      guessesBox.appendChild(buildGuessRow(guess, guessSpecies, target, targetSpecies));

      if (guess.id === target.id) {
        finished = true;
        feedback.innerHTML = '';
        feedback.appendChild(Utils.el('p', { class: 'feedback-ok' }, '¡Correcto! Era ' + Utils.displayName(target.name) + '.'));
        Storage.updateScore('pokemonle', { correct: true });
        refreshScoreboard(container, 'pokemonle');
      } else if (attempts >= maxAttempts) {
        finished = true;
        feedback.innerHTML = '';
        feedback.appendChild(Utils.el('p', { class: 'feedback-bad' }, 'Se acabaron los intentos. Era ' + Utils.displayName(target.name) + '.'));
        Storage.updateScore('pokemonle', { correct: false });
        refreshScoreboard(container, 'pokemonle');
      }
    });
  }

  function buildGuessRow(guess, guessSpecies, target, targetSpecies) {
    const row = Utils.el('div', { class: 'wordle-row' });
    const gTypes = guess.types.map(t => t.type.name);
    const tTypes = target.types.map(t => t.type.name);

    row.appendChild(wCell(Utils.displayName(guess.name), guess.id === target.id ? 'hit' : 'miss'));
    row.appendChild(wCell(gTypes.map(Utils.typeLabel).join('/'), typeCellState(gTypes, tTypes)));
    row.appendChild(wCell('Gen ' + guessSpecies.generation.name.replace('generation-', '').toUpperCase(),
      guessSpecies.generation.name === targetSpecies.generation.name ? 'hit' : 'miss'));
    row.appendChild(wCell(Utils.displayName(guessSpecies.color.name), guessSpecies.color.name === targetSpecies.color.name ? 'hit' : 'miss'));
    row.appendChild(arrowCell(guess.height, target.height, 'Altura'));
    row.appendChild(arrowCell(guess.weight, target.weight, 'Peso'));
    return row;
  }

  function typeCellState(gTypes, tTypes) {
    const sameSet = gTypes.length === tTypes.length && gTypes.every(t => tTypes.includes(t));
    if (sameSet) return 'hit';
    if (gTypes.some(t => tTypes.includes(t))) return 'partial';
    return 'miss';
  }

  function wCell(text, state) {
    return Utils.el('div', { class: 'wordle-cell ' + state }, text);
  }

  function arrowCell(guessVal, targetVal, label) {
    let arrow = '=', state = 'hit';
    if (guessVal < targetVal) { arrow = '↑'; state = 'miss'; }
    else if (guessVal > targetVal) { arrow = '↓'; state = 'miss'; }
    return Utils.el('div', { class: 'wordle-cell ' + state }, `${label} ${arrow}`);
  }

  // ---------------- Juego 3: Adivina el tipo ----------------
  async function renderGuessType(container) {
    container.innerHTML = '';
    gameHeader(container, {
      title: 'Adivina el tipo', subtitle: 'Elegí el tipo (o los dos tipos) del Pokémon.', gameId: 'guess-type',
      howTo: ['Se muestra un Pokémon.', 'Seleccioná uno o dos tipos.', 'Pulsá Confirmar: acertás solo si elegís exactamente sus tipos.']
    });
    const img = Utils.el('img', { class: 'game-poke-img', alt: 'Pokémon del juego', width: '180', height: '180' });
    const name = Utils.el('h3', {});
    const options = Utils.el('div', { class: 'type-pick-grid' },
      Utils.ALL_TYPES.map(t => Utils.el('button', {
        class: 'type-badge type-pick', type: 'button', style: `background:${Utils.TYPE_COLORS[t]}`
      }, Utils.typeLabel(t))));
    const submitBtn = Utils.el('button', { class: 'btn' }, 'Confirmar');
    const feedback = Utils.el('div', { class: 'game-feedback' });
    const nextBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button', style: 'display:none' }, 'Siguiente ▶');
    container.append(img, name, options, submitBtn, feedback, nextBtn);

    let current, selected = new Set();
    options.querySelectorAll('.type-pick').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const t = Utils.ALL_TYPES[i];
        if (selected.has(t)) { selected.delete(t); btn.classList.remove('picked'); }
        else { if (selected.size >= 2) return; selected.add(t); btn.classList.add('picked'); }
      });
    });

    async function loadRound() {
      selected = new Set();
      options.querySelectorAll('.type-pick').forEach(b => b.classList.remove('picked'));
      feedback.innerHTML = '';
      nextBtn.style.display = 'none';
      submitBtn.disabled = false;
      current = await Api.getPokemon(randomPokemonId());
      img.src = Utils.officialArtwork(current);
      name.textContent = Utils.displayName(current.name);
    }

    submitBtn.addEventListener('click', () => {
      const actual = new Set(current.types.map(t => t.type.name));
      const correct = actual.size === selected.size && [...actual].every(t => selected.has(t));
      feedback.innerHTML = '';
      feedback.appendChild(Utils.el('p', { class: correct ? 'feedback-ok' : 'feedback-bad' },
        correct ? '¡Correcto!' : 'Era ' + [...actual].map(Utils.typeLabel).join('/')));
      Storage.updateScore('guess-type', { correct });
      refreshScoreboard(container, 'guess-type');
      submitBtn.disabled = true;
      nextBtn.style.display = 'inline-block';
    });
    nextBtn.addEventListener('click', loadRound);
    await loadRound();
  }

  // ---------------- Juego 4: Adivina la evolución ----------------
  async function renderGuessEvolution(container) {
    container.innerHTML = '';
    gameHeader(container, {
      title: 'Adivina la evolución', subtitle: '¿En qué evoluciona este Pokémon?', gameId: 'guess-evolution',
      howTo: ['Se muestra un Pokémon que puede evolucionar.', 'Elegí entre 4 opciones cuál es su siguiente evolución.', 'Si tiene varias evoluciones posibles, cualquiera de ellas es correcta.']
    });
    const img = Utils.el('img', { class: 'game-poke-img', alt: 'Pokémon del juego', width: '180', height: '180' });
    const name = Utils.el('h3', {});
    const optionsBox = Utils.el('div', { class: 'trivia-options' });
    const feedback = Utils.el('div', { class: 'game-feedback' });
    const nextBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button', style: 'display:none' }, 'Siguiente ▶');
    container.append(img, name, optionsBox, feedback, nextBtn);

    async function loadRound() {
      feedback.innerHTML = '';
      nextBtn.style.display = 'none';
      optionsBox.innerHTML = '';
      optionsBox.appendChild(Utils.loadingSpinner());
      let base, correctNames;
      let tries = 0;
      // Buscamos un Pokémon con al menos una evolución posterior (puede tardar un par de intentos)
      while (tries < 15) {
        tries++;
        const id = randomPokemonId();
        try {
          const p = await Api.getPokemon(id);
          const species = await Api.getPokemonSpecies(p.species.name);
          const chainData = await Api.getEvolutionChain(species.evolution_chain.url);
          const node = findNodeByName(chainData.chain, p.name);
          if (node && node.evolves_to.length > 0) {
            base = p;
            correctNames = node.evolves_to.map(n => n.species.name);
            break;
          }
        } catch { /* seguimos probando */ }
      }
      optionsBox.innerHTML = '';
      if (!base) {
        optionsBox.appendChild(Utils.errorBox('No pudimos preparar una ronda. Probá de nuevo.'));
        return;
      }
      img.src = Utils.officialArtwork(base);
      name.textContent = Utils.displayName(base.name);

      const distractorIds = new Set();
      while (distractorIds.size < 3) {
        const id = randomPokemonId();
        if (id !== base.id) distractorIds.add(id);
      }
      const distractors = await Api.mapLimit(Array.from(distractorIds), 3, id => Api.getPokemon(id));
      const correctOption = await Api.getPokemon(correctNames[0]);
      const allOptions = Utils.shuffle([correctOption, ...distractors]);

      allOptions.forEach(opt => {
        const btn = Utils.el('button', { class: 'trivia-option', type: 'button' }, Utils.displayName(opt.name));
        btn.addEventListener('click', () => {
          const correct = correctNames.includes(opt.name);
          feedback.innerHTML = '';
          feedback.appendChild(Utils.el('p', { class: correct ? 'feedback-ok' : 'feedback-bad' },
            correct ? '¡Correcto!' : 'La respuesta correcta era ' + Utils.displayName(correctNames[0])));
          Storage.updateScore('guess-evolution', { correct });
          refreshScoreboard(container, 'guess-evolution');
          optionsBox.querySelectorAll('.trivia-option').forEach(b => b.disabled = true);
          nextBtn.style.display = 'inline-block';
        });
        optionsBox.appendChild(btn);
      });
    }
    nextBtn.addEventListener('click', loadRound);
    await loadRound();
  }

  function findNodeByName(node, name) {
    if (node.species.name === name) return node;
    for (const child of node.evolves_to) {
      const found = findNodeByName(child, name);
      if (found) return found;
    }
    return null;
  }

  // ---------------- Juego 5: Trivia ----------------
  async function renderTrivia(container) {
    container.innerHTML = '';
    gameHeader(container, {
      title: 'Trivia Pokémon', subtitle: 'Preguntas de opción múltiple con datos reales de PokéAPI.', gameId: 'trivia',
      howTo: ['Leé la pregunta y elegí una de las 4 respuestas.', 'Tu racha sube con cada acierto y vuelve a cero si fallás.']
    });
    const qBox = Utils.el('div', { class: 'trivia-question' });
    const optionsBox = Utils.el('div', { class: 'trivia-options' });
    const feedback = Utils.el('div', { class: 'game-feedback' });
    const nextBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button', style: 'display:none' }, 'Siguiente pregunta ▶');
    container.append(qBox, optionsBox, feedback, nextBtn);

    async function loadRound() {
      feedback.innerHTML = '';
      nextBtn.style.display = 'none';
      qBox.innerHTML = '';
      optionsBox.innerHTML = '';
      qBox.appendChild(Utils.loadingSpinner());

      const type = Utils.shuffle(Utils.ALL_TYPES)[0];
      const typeData = await Api.getType(type);
      const inType = typeData.pokemon.map(p => p.pokemon.name);
      let correctName = Utils.shuffle(inType)[0];
      const others = [];
      while (others.length < 3) {
        const id = randomPokemonId();
        const p = await Api.getPokemon(id).catch(() => null);
        if (p && !p.types.some(t => t.type.name === type) && !others.some(o => o.name === p.name)) others.push(p);
      }
      const correctPoke = await Api.getPokemon(correctName);
      const options = Utils.shuffle([correctPoke, ...others]);

      qBox.innerHTML = '';
      qBox.appendChild(Utils.el('p', {}, `¿Cuál de estos Pokémon es de tipo ${Utils.typeLabel(type)}?`));
      options.forEach(opt => {
        const btn = Utils.el('button', { class: 'trivia-option', type: 'button' }, Utils.displayName(opt.name));
        btn.addEventListener('click', () => {
          const correct = opt.name === correctPoke.name;
          feedback.innerHTML = '';
          feedback.appendChild(Utils.el('p', { class: correct ? 'feedback-ok' : 'feedback-bad' },
            correct ? '¡Correcto!' : 'Era ' + Utils.displayName(correctPoke.name)));
          Storage.updateScore('trivia', { correct });
          refreshScoreboard(container, 'trivia');
          optionsBox.querySelectorAll('.trivia-option').forEach(b => b.disabled = true);
          nextBtn.style.display = 'inline-block';
        });
        optionsBox.appendChild(btn);
      });
    }
    nextBtn.addEventListener('click', loadRound);
    await loadRound();
  }

  // ---------------- Juego 6: ¿Quién tiene más? ----------------
  async function renderHigherStat(container) {
    container.innerHTML = '';
    gameHeader(container, {
      title: '¿Quién tiene más?', subtitle: 'Elegí qué Pokémon tiene la mayor estadística base indicada.', gameId: 'higher-stat',
      howTo: ['Se muestran dos Pokémon y una estadística.', 'Tocá al que tenga el valor base más alto.', 'Si empatan, cualquiera cuenta como acierto.']
    });
    const question = Utils.el('h3', {});
    const pair = Utils.el('div', { class: 'vs-grid' });
    const feedback = Utils.el('div', { class: 'game-feedback' });
    const nextBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button', style: 'display:none' }, 'Siguiente ▶');
    container.append(question, pair, feedback, nextBtn);

    async function loadRound() {
      feedback.innerHTML = '';
      nextBtn.style.display = 'none';
      pair.innerHTML = '';
      pair.appendChild(Utils.loadingSpinner());
      const [a, b] = await Api.mapLimit([randomPokemonId(), randomPokemonId()], 2, id => Api.getPokemon(id));
      const statKey = Utils.shuffle(Object.keys(Utils.STAT_LABELS))[0];
      question.textContent = `¿Quién tiene más ${Utils.STAT_LABELS[statKey]}?`;
      pair.innerHTML = '';
      [a, b].forEach(p => {
        const val = p.stats.find(s => s.stat.name === statKey).base_stat;
        const card = Utils.el('button', { class: 'vs-card', type: 'button' }, [
          Utils.el('img', { src: Utils.officialArtwork(p), alt: 'Imagen de ' + Utils.displayName(p.name), width: '110', height: '110' }),
          Utils.el('h4', {}, Utils.displayName(p.name))
        ]);
        card.addEventListener('click', () => {
          const va = a.stats.find(s => s.stat.name === statKey).base_stat;
          const vb = b.stats.find(s => s.stat.name === statKey).base_stat;
          const correct = (p === a && va >= vb) || (p === b && vb >= va);
          feedback.innerHTML = '';
          feedback.appendChild(Utils.el('p', { class: correct ? 'feedback-ok' : 'feedback-bad' },
            `${Utils.displayName(a.name)}: ${va} · ${Utils.displayName(b.name)}: ${vb}`));
          Storage.updateScore('higher-stat', { correct });
          refreshScoreboard(container, 'higher-stat');
          pair.querySelectorAll('.vs-card').forEach(c => c.disabled = true);
          nextBtn.style.display = 'inline-block';
        });
        pair.appendChild(card);
      });
    }
    nextBtn.addEventListener('click', loadRound);
    await loadRound();
  }

  // ---------------- Juego 7: Adivina por estadísticas ----------------
  async function renderGuessStats(container) {
    container.innerHTML = '';
    gameHeader(container, {
      title: 'Adivina el Pokémon por sus estadísticas', subtitle: 'Sin nombre ni imagen: solo las estadísticas base.', gameId: 'guess-stats',
      howTo: ['Se muestran las 6 estadísticas base de un Pokémon.', 'Escribí su nombre (en inglés) y pulsá Comprobar.']
    });
    const statsBox = Utils.el('div', { class: 'stats-box' });
    const form = Utils.el('form', { class: 'guess-form' });
    const input = Utils.el('input', { class: 'input', placeholder: 'Escribí el nombre…', autocomplete: 'off', 'aria-label': 'Escribí el nombre' });
    const submitBtn = Utils.el('button', { class: 'btn', type: 'submit' }, 'Comprobar');
    form.append(input, submitBtn);
    const feedback = Utils.el('div', { class: 'game-feedback' });
    const nextBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button', style: 'display:none' }, 'Otra ronda ▶');
    container.append(statsBox, form, feedback, nextBtn);

    let current;
    async function loadRound() {
      feedback.innerHTML = ''; input.value = ''; input.disabled = false; submitBtn.disabled = false;
      nextBtn.style.display = 'none';
      current = await Api.getPokemon(randomPokemonId());
      statsBox.innerHTML = '';
      current.stats.forEach(s => statsBox.appendChild(Utils.statBar(Utils.STAT_LABELS[s.stat.name], s.base_stat)));
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      input.disabled = true; submitBtn.disabled = true;
      const correct = normalize(input.value) === normalize(current.name);
      feedback.innerHTML = '';
      feedback.appendChild(Utils.el('p', { class: correct ? 'feedback-ok' : 'feedback-bad' },
        correct ? '¡Correcto!' : 'Era ' + Utils.displayName(current.name)));
      Storage.updateScore('guess-stats', { correct });
      refreshScoreboard(container, 'guess-stats');
      nextBtn.style.display = 'inline-block';
    });
    nextBtn.addEventListener('click', loadRound);
    await loadRound();
  }

  // ---------------- Juego 8: Adivina el movimiento ----------------
  async function renderGuessMove(container) {
    container.innerHTML = '';
    gameHeader(container, {
      title: 'Adivina el movimiento', subtitle: 'Deducí el movimiento a partir de sus datos.', gameId: 'guess-move',
      howTo: ['Se muestran tipo, categoría, potencia, precisión y PP de un movimiento.', 'Escribí su nombre en inglés (ej: thunderbolt) y pulsá Comprobar.']
    });
    const clues = Utils.el('div', { class: 'quick-facts' });
    const form = Utils.el('form', { class: 'guess-form' });
    const input = Utils.el('input', { class: 'input', placeholder: 'Escribí el nombre del movimiento…', autocomplete: 'off', 'aria-label': 'Escribí el nombre del movimiento' });
    const submitBtn = Utils.el('button', { class: 'btn', type: 'submit' }, 'Comprobar');
    form.append(input, submitBtn);
    const feedback = Utils.el('div', { class: 'game-feedback' });
    const nextBtn = Utils.el('button', { class: 'btn btn-secondary', type: 'button', style: 'display:none' }, 'Otra ronda ▶');
    container.append(clues, form, feedback, nextBtn);

    let current;
    async function loadRound() {
      feedback.innerHTML = ''; input.value = ''; input.disabled = false; submitBtn.disabled = false;
      nextBtn.style.display = 'none';
      clues.innerHTML = '';
      clues.appendChild(Utils.loadingSpinner());
      let move = null;
      while (!move) {
        const id = Utils.randomInt(1, 850); // rango con buena cobertura de movimientos "clásicos"
        const m = await Api.getMove(id).catch(() => null);
        if (m && m.power) move = m; // preferimos movimientos con potencia definida (más fáciles de adivinar)
      }
      current = move;
      clues.innerHTML = '';
      clues.append(
        factCard('Tipo', Utils.typeLabel(current.type.name)),
        factCard('Categoría', current.damage_class.name === 'physical' ? 'Físico' : current.damage_class.name === 'special' ? 'Especial' : 'Estado'),
        factCard('Potencia', current.power ?? '—'),
        factCard('Precisión', current.accuracy ? current.accuracy + '%' : '—'),
        factCard('PP', current.pp ?? '—')
      );
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      input.disabled = true; submitBtn.disabled = true;
      const correct = normalize(input.value) === normalize(current.name);
      feedback.innerHTML = '';
      feedback.appendChild(Utils.el('p', { class: correct ? 'feedback-ok' : 'feedback-bad' },
        correct ? '¡Correcto!' : 'Era ' + Utils.displayName(current.name)));
      Storage.updateScore('guess-move', { correct });
      refreshScoreboard(container, 'guess-move');
      nextBtn.style.display = 'inline-block';
    });
    nextBtn.addEventListener('click', loadRound);
    await loadRound();
  }

  function factCard(label, value) {
    return Utils.el('div', { class: 'fact-card' }, [
      Utils.el('span', { class: 'fact-value' }, String(value)),
      Utils.el('span', { class: 'fact-label' }, label)
    ]);
  }

  // ---------------- Desafío diario ----------------
  async function renderDaily(container) {
    const rand = Utils.seededRandom('daily-' + Utils.todaySeed());
    const id = 1 + Math.floor(rand() * NATIONAL_DEX_TOTAL);
    const fecha = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    await renderWhoIsThis(container, { dailyId: id, dailyTitle: `Desafío del ${fecha}: ¿Quién es este Pokémon?` });
  }

  return {
    GAME_LIST, gameCard, renderHub, renderWhoIsThis, renderPokemonle, renderGuessType, renderGuessEvolution,
    renderTrivia, renderHigherStat, renderGuessStats, renderGuessMove, renderDaily
  };
})();
