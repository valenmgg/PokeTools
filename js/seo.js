/* ============================================================
   seo.js
   Actualiza <title>, meta description, canonical, Open Graph,
   Twitter Card, robots y JSON-LD en cada cambio de página.
   ============================================================ */
const Seo = (() => {
  function baseUrl() {
    return (SITE_CONFIG.siteUrl || location.origin).replace(/\/+$/, '');
  }

  function absolute(pathOrUrl) {
    if (!pathOrUrl) return '';
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return baseUrl() + (pathOrUrl.startsWith('/') ? '' : '/') + pathOrUrl;
  }

  function upsertMeta(attr, key, content) {
    let node = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(attr, key);
      document.head.appendChild(node);
    }
    node.setAttribute('content', content);
  }

  function upsertCanonical(href) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  function clamp(text, max) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…';
  }

  // opts: { title, description, path, image, type, noindex, jsonLd }
  function set(opts) {
    const siteName = SITE_CONFIG.siteName;
    const title = opts.title.includes(siteName) ? opts.title : `${opts.title} | ${siteName}`;
    const description = clamp(opts.description, 160);
    const path = opts.path || location.pathname;
    const url = absolute(path);
    const image = absolute(opts.image || SITE_CONFIG.defaultImage);

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', opts.noindex ? 'noindex, follow' : 'index, follow');
    upsertCanonical(url);

    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', opts.type || 'website');
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:locale', 'es_AR');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    const old = document.getElementById('jsonld');
    if (old) old.remove();
    if (opts.jsonLd) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'jsonld';
      s.textContent = JSON.stringify(opts.jsonLd);
      document.head.appendChild(s);
    }
  }

  function breadcrumbs(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(it.path)
      }))
    };
  }

  function notFound() {
    set({
      title: 'Página no encontrada',
      description: 'La página que buscás no existe en PokéTools.',
      noindex: true
    });
  }

  return { set, notFound, breadcrumbs, absolute };
})();
