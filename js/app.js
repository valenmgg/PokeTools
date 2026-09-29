/* ============================================================
   app.js
   Punto de entrada: página de inicio, tabla de rutas (con title y
   description por sección) y arranque.

   Para AGREGAR una página nueva:
   1) escribí su función render(container, params, query)
   2) registrala en registerRoutes() con su title/description
   3) agregala a sitemap (scripts/generate-sitemap.js) si es indexable
   ============================================================ */

(function () {
  const NATIONAL_DEX_TOTAL = 1025;

  function featureCard(icon, title, desc, to) {
    return Utils.el('a', { class: 'feature-card', href: to }, [
      Utils.el('span', { class: 'feature-icon', 'aria-hidden': 'true' }, icon),
      Utils.el('h3', {}, title),
      Utils.el('p', { class: 'muted small' }, desc)
    ]);
  }

  function heroSearch() {
    const form = Utils.el('form', { class: 'hero-search', role: 'search' });
    const input = Utils.el('input', {
      class: 'input hero-search-input', type: 'search', 'aria-label': 'Buscar Pokémon o movimiento',
      placeholder: 'Buscá un Pokémon o movimiento (ej: pikachu, 25, thunderbolt)', autocomplete: 'off'
    });
    form.append(input, Utils.el('button', { class: 'btn', type: 'submit' }, 'Buscar'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) Router.navigate('/search/' + encodeURIComponent(q));
    });
    return form;
  }

  async function renderHome(container) {
    container.innerHTML = '';

    const hero = Utils.el('section', { class: 'hero' }, [
      Utils.el('div', { class: 'hero-inner' }, [
        Utils.el('p', { class: 'hero-eyebrow' }, 'Herramientas para fans de Pokémon'),
        Utils.el('h1', {}, 'PokéTools'),
        Utils.el('p', { class: 'hero-subtitle' },
          'Una Pokédex con estadísticas, tipos y evoluciones, buscador de movimientos, comparador, generador y analizador de equipos, y minijuegos. Explorá, compará, creá equipos y jugá con Pokémon.'),
        Utils.el('div', { class: 'hero-actions' }, [
          Utils.el('a', { class: 'btn', href: '/pokedex' }, 'Pokédex'),
          Utils.el('a', { class: 'btn btn-ghost', href: '/games' }, 'PokéGames'),
          Utils.el('a', { class: 'btn btn-ghost', href: '/teams' }, 'Generador de equipos')
        ]),
        heroSearch()
      ])
    ]);

    const mainTools = Utils.el('section', {}, [
      Components.sectionTitle('Herramientas principales', 'Todo lo que necesitás para consultar y planear.'),
      Utils.el('div', { class: 'feature-grid' }, [
        featureCard('📖', 'Pokédex', 'Más de 1000 Pokémon con stats, habilidades y evoluciones.', '/pokedex'),
        featureCard('📘', 'Movimientos', 'Buscá movimientos y mirá quién puede aprenderlos.', '/moves'),
        featureCard('🧩', 'Tipos', 'Fortalezas, debilidades y tabla de efectividad.', '/types'),
        featureCard('⚔️', 'Comparador', 'Compará dos Pokémon lado a lado.', '/comparison'),
        featureCard('👥', 'Generador de equipos', 'Equipos aleatorios o equilibrados de 6 Pokémon.', '/teams'),
        featureCard('📊', 'Analizador de equipos', 'Revisá tipos, debilidades y cobertura de tu equipo.', '/teams/analyzer')
      ])
    ]);

    const featuredGrid = Utils.el('div', { class: 'poke-grid' });
    const featured = Utils.el('section', {}, [
      Components.sectionTitle('Pokémon destacados', 'Una selección que cambia cada día. El primero es el Pokémon del día.'),
      featuredGrid
    ]);

    const streak = Storage.dailyStreak();
    const done = Storage.dailyDoneToday();
    const dailyBanner = Utils.el('a', { class: 'daily-banner', href: '/daily-challenge' }, [
      Utils.el('span', { class: 'feature-icon', 'aria-hidden': 'true' }, '📅'),
      Utils.el('div', {}, [
        Utils.el('h2', {}, 'Desafío diario'),
        Utils.el('p', {}, done ? 'Ya lo completaste hoy. ¡Volvé mañana!' : 'Un Pokémon misterioso nuevo cada día, igual para todos.'),
        streak > 0 ? Utils.el('span', { class: 'game-best' }, '🔥 Racha: ' + streak) : null
      ])
    ]);

    const games = Utils.el('section', {}, [
      Components.sectionTitle('Juegos', 'Minijuegos para practicar lo que sabés.'),
      Utils.el('div', { class: 'feature-grid' }, Games.GAME_LIST.slice(0, 4).map(g => Games.gameCard(g, false))),
      Utils.el('p', { class: 'section-more' }, [Utils.el('a', { href: '/games' }, 'Ver los 8 juegos →')])
    ]);

    const more = Utils.el('section', {}, [
      Components.sectionTitle('Herramientas adicionales'),
      Utils.el('div', { class: 'feature-grid' }, Tools.TOOL_LIST.map(Tools.toolCard))
    ]);

    const about = Utils.el('section', { class: 'about-block' }, [
      Components.sectionTitle('¿Qué es PokéTools?'),
      Utils.el('p', {}, 'PokéTools es un proyecto de fans que reúne en un solo lugar las consultas más comunes del mundo Pokémon: fichas con estadísticas base, tipos, habilidades, movimientos y líneas evolutivas; una tabla de efectividad de tipos; y herramientas para armar y analizar equipos.'),
      Utils.el('p', {}, 'Los datos provienen de PokéAPI y las preferencias (favoritos, tema, puntajes) se guardan solo en tu navegador. No hace falta crear una cuenta.'),
      Utils.el('ul', { class: 'summary-list' }, [
        Utils.el('li', {}, ['Consultá la ', Utils.el('a', { href: '/pokedex' }, 'Pokédex'), ' y entrá a la ficha de cada Pokémon.']),
        Utils.el('li', {}, ['Mirá qué ', Utils.el('a', { href: '/moves/learners' }, 'Pokémon aprende un movimiento'), ', filtrando por juego.']),
        Utils.el('li', {}, ['Entendé las ', Utils.el('a', { href: '/types' }, 'debilidades y resistencias por tipo'), '.']),
        Utils.el('li', {}, ['Armá un equipo con el ', Utils.el('a', { href: '/teams' }, 'generador'), ' y revisalo con el ', Utils.el('a', { href: '/teams/analyzer' }, 'analizador'), '.'])
      ])
    ]);

    container.append(hero, mainTools, featured, dailyBanner, games, more);
    const ad = Components.adSlot('home-mid');
    if (ad) container.appendChild(ad);
    container.appendChild(about);

    // Pokémon destacados (semilla diaria: todos ven los mismos ese día)
    const rand = Utils.seededRandom('potd-' + Utils.todaySeed());
    const ids = new Set();
    while (ids.size < 6) ids.add(1 + Math.floor(rand() * NATIONAL_DEX_TOTAL));
    Components.lazyCards(featuredGrid, Array.from(ids));
  }

  function registerRoutes() {
    const R = Router.register;
    R('/', (c) => renderHome(c), {
      title: 'PokéTools: Pokédex, movimientos, tipos, equipos y juegos Pokémon',
      description: 'Pokédex con stats y evoluciones, buscador de movimientos, tabla de tipos, comparador, generador y analizador de equipos y 8 minijuegos Pokémon. Datos de PokéAPI.'
    });
    R('/pokedex', (c) => Pokedex.renderPokedex(c), {
      title: 'Pokédex Pokémon: buscá por nombre, tipo y generación',
      description: 'Pokédex completa: buscá Pokémon por nombre o número, filtrá por tipo y generación y consultá stats, habilidades, movimientos y evoluciones.'
    });
    R('/pokemon/:name', (c, p) => Pokedex.renderPokemonDetail(c, p));
    R('/favorites', (c) => Pokedex.renderFavorites(c), {
      title: 'Mis Pokémon favoritos', description: 'Tu lista personal de Pokémon favoritos, guardada en este navegador.', noindex: true
    });
    R('/search/:query', (c, p) => Pokedex.renderGlobalSearch(c, p));

    R('/moves', (c) => Moves.renderMovesList(c), {
      title: 'Movimientos Pokémon: buscador por nombre y tipo',
      description: 'Buscá cualquier movimiento Pokémon por nombre o tipo y entrá a su ficha con potencia, precisión, PP y Pokémon que lo aprenden.'
    });
    R('/move/:name', (c, p) => Moves.renderMoveDetail(c, p));
    R('/moves/learners', (c) => Moves.renderLearners(c, {}), {
      title: '¿Qué Pokémon aprende un movimiento? Buscador por juego',
      description: 'Elegí un movimiento y descubrí qué Pokémon pueden aprenderlo, con filtro opcional por juego o generación.'
    });
    R('/moves/learners/:name', (c, p) => Moves.renderLearners(c, p));

    R('/types', (c) => Types.renderTypesGrid(c), {
      title: 'Tipos Pokémon: tabla de efectividad, fortalezas y debilidades',
      description: 'Los 18 tipos Pokémon con su tabla de efectividad interactiva: fortalezas, debilidades, resistencias e inmunidades de cada tipo.'
    });
    R('/types/:name', (c, p) => Types.renderTypeDetail(c, p));

    R('/comparison', (c, p, q) => Comparison.renderComparator(c, p, q), {
      title: 'Comparador de Pokémon: estadísticas lado a lado',
      description: 'Compará dos Pokémon: tipos, habilidades, altura, peso y estadísticas base, con las diferencias a la vista.'
    });

    R('/teams', (c) => Teams.renderTeamGenerator(c), {
      title: 'Generador de equipos Pokémon: aleatorio o equilibrado',
      description: 'Generá equipos de 6 Pokémon aleatorios o equilibrados en tipos, filtrando por generación, tipo, legendarios y Pokémon obligatorios.'
    });
    R('/teams/analyzer', (c) => Teams.renderTeamAnalyzer(c), {
      title: 'Analizador de equipos Pokémon: debilidades y cobertura',
      description: 'Ingresá tu equipo y analizá tipos, debilidades, resistencias, inmunidades y cobertura ofensiva aproximada.'
    });

    R('/tools', (c) => Tools.renderHub(c), {
      title: 'Herramientas Pokémon', description: 'Pokémon aleatorio, generador de nombres, buscador de evoluciones, habilidades y objetos, y más utilidades Pokémon.'
    });
    R('/tools/random', (c) => Tools.renderRandom(c), {
      title: 'Pokémon aleatorio', description: 'Descubrí un Pokémon al azar de la Pokédex nacional con sus tipos e imagen.'
    });
    R('/tools/name-generator', (c) => Tools.renderNameGenerator(c), {
      title: 'Generador de nombres de equipo Pokémon', description: 'Generá nombres originales para tu equipo Pokémon.'
    });
    R('/tools/evolutions', (c) => Tools.renderEvolutionFinder(c), {
      title: 'Buscador de evoluciones Pokémon', description: 'Buscá un Pokémon y mirá toda su línea evolutiva con las condiciones de cada evolución.'
    });
    R('/tools/abilities', (c) => Tools.renderAbilitySearch(c, {}), {
      title: 'Buscador de habilidades Pokémon', description: 'Buscá una habilidad y mirá su descripción y qué Pokémon pueden tenerla.'
    });
    R('/tools/abilities/:name', (c, p) => Tools.renderAbilitySearch(c, p));
    R('/tools/items', (c) => Tools.renderItemSearch(c), {
      title: 'Buscador de objetos Pokémon', description: 'Consultá objetos de los juegos Pokémon: categoría, costo y efecto.'
    });

    R('/games', (c) => Games.renderHub(c), {
      title: 'Juegos Pokémon: 8 minijuegos y desafío diario',
      description: 'PokéGames: ¿Quién es este Pokémon?, Pokémonle, trivia, adivina el tipo, la evolución, las estadísticas o el movimiento, y un desafío diario.'
    });
    R('/games/who-is-that-pokemon', (c) => Games.renderWhoIsThis(c, {}), {
      title: '¿Quién es este Pokémon? Juego de siluetas', description: 'Adiviná el Pokémon a partir de su silueta y armá tu racha de aciertos.'
    });
    R('/games/pokemonle', (c) => Games.renderPokemonle(c), {
      title: 'Pokémonle: adiviná el Pokémon del día', description: 'Juego estilo Wordle con Pokémon: 6 intentos y pistas de tipo, generación, color, altura y peso.'
    });
    R('/games/guess-type', (c) => Games.renderGuessType(c), {
      title: 'Adivina el tipo del Pokémon', description: 'Mirá un Pokémon y elegí su tipo o tipos. Guarda tu racha de aciertos.'
    });
    R('/games/guess-evolution', (c) => Games.renderGuessEvolution(c), {
      title: 'Adivina la evolución del Pokémon', description: 'Elegí en qué evoluciona cada Pokémon entre cuatro opciones.'
    });
    R('/games/trivia', (c) => Games.renderTrivia(c), {
      title: 'Trivia Pokémon de opción múltiple', description: 'Preguntas de trivia Pokémon con datos reales. Sumá aciertos y superá tu récord.'
    });
    R('/games/who-has-more', (c) => Games.renderHigherStat(c), {
      title: '¿Quién tiene más? Juego de estadísticas Pokémon', description: 'Dos Pokémon, una estadística: elegí cuál tiene el valor base más alto.'
    });
    R('/games/guess-stats', (c) => Games.renderGuessStats(c), {
      title: 'Adivina el Pokémon por sus estadísticas', description: 'Se muestran solo las estadísticas base: ¿podés deducir qué Pokémon es?'
    });
    R('/games/guess-move', (c) => Games.renderGuessMove(c), {
      title: 'Adivina el movimiento Pokémon', description: 'Deducí el movimiento a partir de su tipo, categoría, potencia, precisión y PP.'
    });
    R('/daily-challenge', (c) => Games.renderDaily(c), {
      title: 'Desafío diario Pokémon', description: 'Un Pokémon misterioso nuevo cada día, igual para todos. Guardá tu racha diaria.'
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    Storage.init();
    registerRoutes();
    Router.start();
  });
})();
