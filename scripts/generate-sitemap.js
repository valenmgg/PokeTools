#!/usr/bin/env node
/* ============================================================
   scripts/generate-sitemap.js
   Genera sitemap.xml (y actualiza la línea Sitemap de robots.txt).
   Sin dependencias. Requiere Node 18+ (fetch incluido).

   Uso:
     SITE_URL=https://tudominio.com node scripts/generate-sitemap.js
   Opciones:
     --no-pokemon   no incluye las fichas de Pokémon
     --no-moves     no incluye las fichas de movimientos

   Las URLs de Pokémon y movimientos salen de la lista oficial de PokéAPI
   (los mismos nombres que usa el sitio), así que todas existen.
   Si el dominio no se indica, se lee de js/config.js (siteUrl).
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);

function readConfigSiteUrl() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
    const m = txt.match(/siteUrl:\s*'([^']*)'/);
    return m ? m[1] : '';
  } catch { return ''; }
}

const SITE = (process.env.SITE_URL || readConfigSiteUrl() || 'https://YOUR-DOMAIN.com').replace(/\/+$/, '');

// Páginas estáticas indexables (agregá acá las nuevas)
const STATIC_PAGES = [
  ['/', 1.0], ['/pokedex', 0.9], ['/moves', 0.8], ['/moves/learners', 0.8], ['/types', 0.8],
  ['/comparison', 0.7], ['/teams', 0.7], ['/teams/analyzer', 0.7], ['/tools', 0.6],
  ['/tools/random', 0.4], ['/tools/name-generator', 0.4], ['/tools/evolutions', 0.5],
  ['/tools/abilities', 0.5], ['/tools/items', 0.5], ['/games', 0.7],
  ['/games/who-is-that-pokemon', 0.5], ['/games/pokemonle', 0.5], ['/games/guess-type', 0.5],
  ['/games/guess-evolution', 0.5], ['/games/trivia', 0.5], ['/games/who-has-more', 0.5],
  ['/games/guess-stats', 0.5], ['/games/guess-move', 0.5], ['/daily-challenge', 0.6]
];

const TYPES = ['normal','fighting','flying','poison','ground','rock','bug','ghost','steel',
  'fire','water','grass','electric','psychic','ice','dragon','dark','fairy'];

async function getNames(endpoint, limit) {
  const res = await fetch(`https://pokeapi.co/api/v2/${endpoint}?limit=${limit}&offset=0`);
  if (!res.ok) throw new Error(`PokéAPI respondió ${res.status} para ${endpoint}`);
  const data = await res.json();
  return data.results.map(r => r.name);
}

function urlEntry(loc, priority) {
  return `  <url><loc>${SITE}${loc}</loc><priority>${priority.toFixed(1)}</priority></url>`;
}

async function main() {
  const entries = STATIC_PAGES.map(([p, pr]) => urlEntry(p, pr));
  TYPES.forEach(t => entries.push(urlEntry('/types/' + t, 0.6)));

  if (!args.includes('--no-pokemon')) {
    const names = await getNames('pokemon', 1025);   // Pokédex nacional (ids 1-1025)
    names.forEach(n => entries.push(urlEntry('/pokemon/' + n, 0.8)));
  }
  if (!args.includes('--no-moves')) {
    const names = await getNames('move', 2000);
    names.forEach(n => entries.push(urlEntry('/move/' + n, 0.4)));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);

  const robotsPath = path.join(ROOT, 'robots.txt');
  let robots = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, 'utf8') : 'User-agent: *\nAllow: /\n';
  robots = /^Sitemap:.*$/m.test(robots)
    ? robots.replace(/^Sitemap:.*$/m, `Sitemap: ${SITE}/sitemap.xml`)
    : robots.trimEnd() + `\nSitemap: ${SITE}/sitemap.xml\n`;
  fs.writeFileSync(robotsPath, robots);

  console.log(`sitemap.xml generado con ${entries.length} URLs para ${SITE}`);
  if (SITE.includes('YOUR-DOMAIN')) console.log('AVISO: falta definir tu dominio (SITE_URL=... o js/config.js).');
}

if (require.main === module) {
  main().catch(err => { console.error('No se pudo generar el sitemap:', err.message); process.exit(1); });
}

module.exports = { STATIC_PAGES, TYPES, urlEntry };
