/* ============================================================
   api.js
   Única capa que habla con la PokéAPI (https://pokeapi.co/api/v2).
   - Caché en memoria + localStorage (solo respuestas chicas).
   - Deduplica peticiones en curso (misma URL = una sola request).
   - Timeout y un reintento ante errores de red / 5xx.
   - Errores clasificados: err.kind = 'notfound' | 'timeout' | 'network'
   ============================================================ */

const Api = (() => {
  const BASE = 'https://pokeapi.co/api/v2';
  const TIMEOUT_MS = 12000;
  const memCache = new Map();
  const inFlight = new Map();

  function makeError(kind, status) {
    const err = new Error(kind);
    err.kind = kind;
    err.status = status;
    return err;
  }

  async function fetchOnce(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (res.status === 404) throw makeError('notfound', 404);
      if (!res.ok) throw makeError('network', res.status);
      return await res.json();
    } catch (e) {
      if (e.kind) throw e;
      if (e.name === 'AbortError') throw makeError('timeout');
      throw makeError('network');
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchJSON(url) {
    if (memCache.has(url)) return memCache.get(url);
    const cached = Storage.cacheGet(url);
    if (cached) { memCache.set(url, cached); return cached; }
    if (inFlight.has(url)) return inFlight.get(url);

    const promise = (async () => {
      try {
        let data;
        try {
          data = await fetchOnce(url);
        } catch (e) {
          if (e.kind === 'notfound') throw e;
          await new Promise(r => setTimeout(r, 600));   // un reintento
          data = await fetchOnce(url);
        }
        memCache.set(url, data);
        Storage.cacheSet(url, data);
        return data;
      } finally {
        inFlight.delete(url);
      }
    })();
    inFlight.set(url, promise);
    return promise;
  }

  // Ejecuta tareas con límite de concurrencia
  async function mapLimit(items, limit, iterator) {
    const results = new Array(items.length);
    let i = 0;
    async function worker() {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await iterator(items[idx], idx);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }

  const enc = (v) => encodeURIComponent(String(v).toLowerCase());

  function getPokemonList(limit = 24, offset = 0) { return fetchJSON(`${BASE}/pokemon?limit=${limit}&offset=${offset}`); }
  function getPokemon(idOrName) { return fetchJSON(`${BASE}/pokemon/${enc(idOrName)}`); }
  function getPokemonSpecies(idOrName) { return fetchJSON(`${BASE}/pokemon-species/${enc(idOrName)}`); }
  function getEvolutionChain(url) {
    if (!url.startsWith(BASE + '/')) throw makeError('notfound', 404);
    return fetchJSON(url);
  }
  function getType(nameOrId) { return fetchJSON(`${BASE}/type/${enc(nameOrId)}`); }
  function getMoveList(limit = 20, offset = 0) { return fetchJSON(`${BASE}/move?limit=${limit}&offset=${offset}`); }
  function getMove(nameOrId) { return fetchJSON(`${BASE}/move/${enc(nameOrId)}`); }
  function getAbility(nameOrId) { return fetchJSON(`${BASE}/ability/${enc(nameOrId)}`); }
  function getAbilityList(limit = 20, offset = 0) { return fetchJSON(`${BASE}/ability?limit=${limit}&offset=${offset}`); }
  function getItem(nameOrId) { return fetchJSON(`${BASE}/item/${enc(nameOrId)}`); }
  function getItemList(limit = 20, offset = 0) { return fetchJSON(`${BASE}/item?limit=${limit}&offset=${offset}`); }
  function getGeneration(idOrName) { return fetchJSON(`${BASE}/generation/${enc(idOrName)}`); }

  async function getSpeciesUpToGeneration(genNumber) {
    const gens = await mapLimit(Array.from({ length: genNumber }, (_, i) => i + 1), 5, n => getGeneration(n));
    const names = new Set();
    gens.forEach(g => g.pokemon_species.forEach(s => names.add(s.name)));
    return names;
  }

  async function findPokemon(query) {
    const q = String(query).trim().toLowerCase();
    if (!q) throw makeError('notfound', 404);
    return getPokemon(q);
  }

  // Lista liviana (1 request) con todos los nombres, útil para prev/next y autocompletado
  async function getAllPokemonNames() {
    const all = await getPokemonList(1025, 0);
    return all.results.map(r => r.name);
  }

  return {
    fetchJSON, mapLimit, getPokemonList, getPokemon, getPokemonSpecies, getEvolutionChain,
    getType, getMoveList, getMove, getAbility, getAbilityList, getItem, getItemList,
    getGeneration, getSpeciesUpToGeneration, findPokemon, getAllPokemonNames
  };
})();
