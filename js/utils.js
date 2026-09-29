/* ============================================================
   utils.js
   Funciones auxiliares compartidas: formato de texto, colores y
   nombres de tipos, helpers de DOM, validación de parámetros.
   Nota de seguridad: el contenido dinámico se inserta SIEMPRE con
   nodos de texto (Utils.el), nunca con innerHTML. innerHTML solo se
   usa para vaciar contenedores (= '').
   ============================================================ */

const Utils = (() => {

  function displayName(name) {
    if (!name) return '';
    return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function idFromUrl(url) {
    const parts = url.split('/').filter(Boolean);
    return parseInt(parts[parts.length - 1], 10);
  }

  function padId(id) { return '#' + String(id).padStart(3, '0'); }

  const TYPE_COLORS = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
    steel: '#B7B7CE', fairy: '#D685AD'
  };

  const TYPE_ES = {
    normal: 'Normal', fighting: 'Lucha', flying: 'Volador', poison: 'Veneno',
    ground: 'Tierra', rock: 'Roca', bug: 'Bicho', ghost: 'Fantasma', steel: 'Acero',
    fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico',
    psychic: 'Psíquico', ice: 'Hielo', dragon: 'Dragón', dark: 'Siniestro', fairy: 'Hada'
  };

  function typeLabel(t) { return TYPE_ES[t] || displayName(t); }

  // "generation-iii" -> "Generación III"
  function generationLabel(name) {
    if (!name) return '';
    return 'Generación ' + name.replace('generation-', '').toUpperCase();
  }

  const ALL_TYPES = ['normal','fighting','flying','poison','ground','rock','bug',
    'ghost','steel','fire','water','grass','electric','psychic','ice','dragon',
    'dark','fairy'];

  const STAT_LABELS = {
    hp: 'PS', attack: 'Ataque', defense: 'Defensa',
    'special-attack': 'At. Esp.', 'special-defense': 'Def. Esp.', speed: 'Velocidad'
  };

  const STAT_MAX = 255;

  const GAME_TO_GEN = {
    'Rojo/Azul/Amarillo': 1, 'Oro/Plata/Cristal': 2, 'Rubí/Zafiro/Esmeralda': 3,
    'Diamante/Perla/Platino': 4, 'Negro/Blanco': 5, 'X/Y': 6, 'Sol/Luna': 7,
    'Espada/Escudo': 8, 'Escarlata/Púrpura': 9
  };

  const GEN_TO_VERSION_GROUP = {
    1: 'red-blue', 2: 'gold-silver', 3: 'ruby-sapphire', 4: 'diamond-pearl',
    5: 'black-white', 6: 'x-y', 7: 'sun-moon', 8: 'sword-shield', 9: 'scarlet-violet'
  };

  // Imagen de reemplazo (SVG propio) cuando una imagen de la API no carga
  const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="16" fill="#9aa5bd" fill-opacity=".25"/><circle cx="48" cy="48" r="20" fill="none" stroke="#9aa5bd" stroke-width="5"/><path d="M40 48h16" stroke="#9aa5bd" stroke-width="5" stroke-linecap="round"/></svg>');

  function officialArtwork(pokemonData) {
    return (
      pokemonData?.sprites?.other?.['official-artwork']?.front_default ||
      pokemonData?.sprites?.other?.home?.front_default ||
      pokemonData?.sprites?.front_default ||
      PLACEHOLDER_IMG
    );
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function dateSeed(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todaySeed() { return dateSeed(new Date()); }
  function yesterdaySeed() { const d = new Date(); d.setDate(d.getDate() - 1); return dateSeed(d); }

  function seededRandom(seedStr) {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
    return function () {
      h = Math.imul(h ^ (h >>> 15), 1 | h);
      h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h;
      return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Valida un parámetro de URL/entrada de usuario: solo letras, números y guiones.
  // Devuelve el slug en minúsculas o null si no es válido.
  function cleanSlug(str) {
    const s = String(str || '').trim().toLowerCase().replace(/\s+/g, '-');
    return /^[a-z0-9][a-z0-9-]{0,59}$/.test(s) ? s : null;
  }

  function isNotFound(err) { return err && (err.status === 404 || err.kind === 'notfound'); }

  const GENERIC_ERROR = 'No pudimos cargar los datos. Intentá nuevamente.';

  function loadingSpinner(text = 'Cargando…') {
    return el('div', { class: 'loading', role: 'status', 'aria-live': 'polite' }, [
      el('div', { class: 'spinner', 'aria-hidden': 'true' }),
      el('p', {}, text)
    ]);
  }

  // opts.retry: función a ejecutar al pulsar "Reintentar"
  function errorBox(message, opts = {}) {
    return el('div', { class: 'error-box', role: 'alert' }, [
      el('p', {}, message),
      opts.retry ? el('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: opts.retry }, 'Reintentar') : null
    ]);
  }

  // Insignia de tipo. Con opts.link es un <a> real hacia /types/<tipo>
  function typeBadge(typeName, opts = {}) {
    const color = TYPE_COLORS[typeName] || '#8a8fa3';
    const attrs = { class: 'type-badge' + (opts.link ? ' type-badge-link' : ''), style: `background:${color}` };
    if (opts.link) { attrs.href = '/types/' + typeName; return el('a', attrs, typeLabel(typeName)); }
    return el('span', attrs, typeLabel(typeName));
  }

  function statBar(label, value, opts = {}) {
    const pct = Math.min(100, Math.round((value / (opts.max || STAT_MAX)) * 100));
    let color = '#EF5350';
    if (value >= 90) color = '#43A047';
    else if (value >= 60) color = '#FDD835';
    else if (value >= 30) color = '#FB8C00';
    return el('div', { class: 'stat-row', role: 'img', 'aria-label': `${label}: ${value}` }, [
      el('span', { class: 'stat-label' }, label),
      el('div', { class: 'stat-track' }, [el('div', { class: 'stat-fill', style: `width:${pct}%;background:${color}` })]),
      el('span', { class: 'stat-value' }, String(value))
    ]);
  }

  return {
    displayName, idFromUrl, padId, TYPE_COLORS, TYPE_ES, typeLabel, generationLabel, ALL_TYPES,
    STAT_LABELS, STAT_MAX, GAME_TO_GEN, GEN_TO_VERSION_GROUP, PLACEHOLDER_IMG, officialArtwork,
    debounce, el, shuffle, randomInt, dateSeed, todaySeed, yesterdaySeed, seededRandom,
    cleanSlug, isNotFound, GENERIC_ERROR, loadingSpinner, errorBox, typeBadge, statBar
  };
})();
