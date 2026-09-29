/* ============================================================
   storage.js
   Toda la interacción con localStorage vive acá. Guarda SOLO
   preferencias y progreso de juegos (nada sensible).
   ============================================================ */

const Storage = (() => {
  const KEYS = {
    THEME: 'pt_theme', FAVORITES: 'pt_favorites', SCORES: 'pt_scores',
    DAILY: 'pt_daily', CACHE_PREFIX: 'pt_cache_'
  };
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;   // 14 días
  const CACHE_MAX_ITEM = 150000;                   // caracteres; evita llenar los ~5 MB con respuestas gigantes

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  // ---- Tema: null = el usuario todavía no eligió (se usa la preferencia del sistema) ----
  function getTheme() { return get(KEYS.THEME, null); }
  function setTheme(theme) { set(KEYS.THEME, theme); }

  // ---- Favoritos ----
  function getFavorites() {
    const f = get(KEYS.FAVORITES, []);
    return Array.isArray(f) ? f : [];
  }
  function isFavorite(id) { return getFavorites().includes(id); }
  function toggleFavorite(id) {
    const favs = getFavorites();
    const idx = favs.indexOf(id);
    if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
    set(KEYS.FAVORITES, favs);
    return favs.includes(id);
  }

  // ---- Puntuaciones ----
  function getScores() { return get(KEYS.SCORES, {}); }
  function getScore(gameId) {
    return getScores()[gameId] || { best: 0, streak: 0, played: 0, correct: 0 };
  }
  function updateScore(gameId, { correct, resetStreak } = {}) {
    const scores = getScores();
    const s = scores[gameId] || { best: 0, streak: 0, played: 0, correct: 0 };
    s.played += 1;
    if (correct) {
      s.correct += 1; s.streak += 1;
      if (s.streak > s.best) s.best = s.streak;
    } else if (resetStreak !== false) {
      s.streak = 0;
    }
    scores[gameId] = s;
    set(KEYS.SCORES, scores);
    return s;
  }
  function resetScore(gameId) {
    const scores = getScores();
    delete scores[gameId];
    set(KEYS.SCORES, scores);
  }

  // ---- Desafío diario ----
  // { date, completed, correct, streak, bestStreak, lastWinDate, played, wins }
  function getDaily() { return get(KEYS.DAILY, null); }

  function dailyDoneToday() {
    const d = getDaily();
    return d && d.date === Utils.todaySeed() && d.completed ? d : null;
  }

  // Racha vigente: solo cuenta si la última victoria fue hoy o ayer
  function dailyStreak() {
    const d = getDaily();
    if (!d || !d.lastWinDate) return 0;
    return (d.lastWinDate === Utils.todaySeed() || d.lastWinDate === Utils.yesterdaySeed()) ? (d.streak || 0) : 0;
  }

  function completeDaily(correct) {
    const already = dailyDoneToday();
    if (already) return already;
    const prev = getDaily() || {};
    const today = Utils.todaySeed();
    let streak = 0;
    if (correct) streak = (prev.lastWinDate === Utils.yesterdaySeed()) ? (prev.streak || 0) + 1 : 1;
    const data = {
      date: today, completed: true, correct, streak,
      bestStreak: Math.max(prev.bestStreak || 0, streak),
      lastWinDate: correct ? today : (prev.lastWinDate || null),
      played: (prev.played || 0) + 1, wins: (prev.wins || 0) + (correct ? 1 : 0)
    };
    set(KEYS.DAILY, data);
    return data;
  }

  // ---- Caché de respuestas de PokéAPI ----
  function cacheGet(url) {
    try {
      const raw = localStorage.getItem(KEYS.CACHE_PREFIX + url);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.t > CACHE_TTL_MS) {
        localStorage.removeItem(KEYS.CACHE_PREFIX + url);
        return null;
      }
      return parsed.v;
    } catch { return null; }
  }

  function purgeCache(onlyBig = false) {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEYS.CACHE_PREFIX)) {
          if (!onlyBig || (localStorage.getItem(k) || '').length > CACHE_MAX_ITEM) toRemove.push(k);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* sin acceso a localStorage */ }
  }

  function cacheSet(url, value) {
    let str;
    try { str = JSON.stringify({ t: Date.now(), v: value }); } catch { return; }
    if (str.length > CACHE_MAX_ITEM) return;          // respuestas enormes (ej. /pokemon/x) quedan solo en memoria
    try {
      localStorage.setItem(KEYS.CACHE_PREFIX + url, str);
    } catch {
      purgeCache();                                   // almacenamiento lleno: limpiamos la caché y reintentamos una vez
      try { localStorage.setItem(KEYS.CACHE_PREFIX + url, str); } catch { /* sin espacio */ }
    }
  }

  // Al iniciar: elimina entradas gigantes que dejó la versión anterior
  function init() { purgeCache(true); }

  return {
    init, getTheme, setTheme, getFavorites, isFavorite, toggleFavorite,
    getScores, getScore, updateScore, resetScore,
    getDaily, dailyDoneToday, dailyStreak, completeDaily, cacheGet, cacheSet
  };
})();
