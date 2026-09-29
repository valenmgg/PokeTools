/* ============================================================
   config.js
   Configuración central del sitio. ÚNICO lugar donde definir el dominio.

   siteUrl: dominio definitivo SIN barra final, ej: 'https://poketools.com'
   - Si lo dejás vacío (''), las URLs canonical / og:url usan el origen
     actual (localhost, *.vercel.app, etc.). Sirve para probar.
   - Cuando tengas dominio propio, escribilo acá y también generá el
     sitemap con:  SITE_URL=https://tudominio.com node scripts/generate-sitemap.js

   adsEnabled: dejar en false. Cuando se quiera monetizar, ponerlo en true
   activa los contenedores publicitarios ya reservados en el diseño.
   ============================================================ */
const SITE_CONFIG = {
  siteName: 'PokéTools',
  siteUrl: '',
  defaultImage: '/og-default.png',
  adsEnabled: false
};
