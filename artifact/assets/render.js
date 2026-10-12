// Drape page templates, shared by the static build (Node) and the live single-page app (browser).
// Pure functions: data in, HTML string out. UMD: require() in Node, window.DrapeRender in the browser.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./wordmark'), require('./icons'));
  else root.DrapeRender = factory(root.DrapeWordmark, root.DrapeIcons);
})(typeof self !== 'undefined' ? self : this, function (WM, icons) {
  const CATEGORIES = ['tops', 'bottoms', 'outerwear', 'footwear', 'accessories'];

  /**
   * ctx: {
   *   mode: 'static' | 'spa',
   *   languages, dicts, stores, products: () => Product[],
   *   year, privacyUpdated, contactEmail,
   *   siteUrl?, pretty?        (static only)
   *   showAdmin?: () => bool   (spa only: owner sees the Dashboard link)
   * }
   */
  function create(ctx) {
    const LANG = Object.fromEntries(ctx.languages.map(l => [l.code, l]));
    const STORE = Object.fromEntries(ctx.stores.map(s => [s.id, s]));
    const LTR_TOKENS = ['Drape'].concat(ctx.stores.map(s => s.name));
    const LTR_RE = new RegExp('(^|[^\\w])(' + LTR_TOKENS.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w])', 'g');

    /* ---------- strings ---------- */
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    const ltr = html => `<bdi dir="ltr">${html}</bdi>`;
    function get(lang, key) {
      const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx.dicts[lang]);
      if (v === undefined) throw new Error(`Missing string ${lang}:${key}`);
      return v;
    }
    // Isolate LTR runs (site name, store names, standalone numerals) inside RTL prose.
    function isolate(lang, html) {
      if (LANG[lang].dir !== 'rtl') return html;
      return html
        .replace(LTR_RE, (m, pre, word) => pre + ltr(word))
        .replace(/(^|[^\w>])(\d+(?:[.,]\d+)*)(?![\w<])/g, (m, pre, num) => pre + ltr(num));
    }
    const tx = (lang, str, vars = {}) => fill(isolate(lang, esc(str)), vars);
    const t = (lang, key, vars) => tx(lang, get(lang, key), vars);
    const ta = (lang, key, vars = {}) => esc(fill(get(lang, key), vars));

    const money = (n, cur = 'USD') => {
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
      catch (e) { return `${cur} ${n}`; }
    };
    const priceHTML = p => `<bdi dir="ltr" class="price">${esc(money(p.price, p.currency))}</bdi>`;
    function pluralCount(lang, n) {
      const forms = get(lang, 'shop.results');
      const cat = new Intl.PluralRules(LANG[lang].htmlLang).select(n);
      return tx(lang, forms[cat] || forms.other, { n: ltr(String(n)) });
    }
    const storeOf = p => STORE[p.store] || { id: p.store, name: p.store, logo: '' };

    /* ---------- links ---------- */
    const P = {
      home: l => `${l}/index.html`,
      shop: l => `${l}/shop/index.html`,
      about: l => `${l}/about/index.html`,
      disclosure: l => `${l}/disclosure/index.html`,
      privacy: l => `${l}/privacy/index.html`,
      product: (l, id) => `${l}/product/${id}/index.html`,
      notfound: l => `${l}/404.html`,
      admin: l => `${l}/admin/index.html`
    };
    function relPath(from, to) {
      const a = from.split('/').slice(0, -1);
      const b = to.split('/');
      let i = 0;
      while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
      let r = '../'.repeat(a.length - i) + b.slice(i).join('/');
      if (ctx.pretty) r = r.replace(/(^|\/)index\.html$/, '$1') || './';
      return r;
    }
    // A link to page `page` (with optional arg: product id, or a category/store filter for shop).
    function link(from, lang, page, arg) {
      if (ctx.mode === 'spa') return '#/' + lang + (page === 'home' ? '' : '/' + page) + (arg ? '/' + arg : '');
      if (page === 'shop' && arg) return relPath(from, P.shop(lang)) + '#' + arg;
      return relPath(from, P[page](lang, arg));
    }
    const pathOf = (lang, page, arg) => (page === 'product' ? P.product(lang, arg) : P[page](lang));
    function asset(from, p) {
      if (!p || /^(data:|https?:|blob:)/.test(p)) return p;
      return ctx.mode === 'spa' ? p : relPath(from, p);
    }
    const abs = to => (ctx.siteUrl ? `${ctx.siteUrl}/${ctx.pretty ? to.replace(/index\.html$/, '') : to}` : null);

    /* ---------- components ---------- */
    function storeLogo(from, s, cls = 'store-logo') {
      return s.logo ? `<img class="${cls}" src="${asset(from, s.logo)}" alt="${esc(s.name)}" width="96" height="24" decoding="async">` : `<span class="${cls}">${ltr(esc(s.name))}</span>`;
    }

    function breadcrumbs(lang, items) {
      return `<nav class="breadcrumbs" aria-label="${ta(lang, 'product.breadcrumb')}"><ol>${items.map((it, i) => {
        const sep = i ? icons.chevronEnd() : '';
        const last = i === items.length - 1;
        return `<li>${sep}${last ? `<span aria-current="page">${it.label}</span>` : `<a href="${it.href}">${it.label}</a>`}</li>`;
      }).join('')}</ol></nav>`;
    }

    function card(lang, from, p, order, opts = {}) {
      const h = opts.h || 'h3';
      const name = p.name[lang];
      const s = storeOf(p);
      const pdp = link(from, lang, 'product', p.id);
      const shopLabel = `${ta(lang, 'product.shop_at', { store: s.name })} (${ta(lang, 'product.new_tab')})`;
      return `<article class="card" data-tilt data-category="${p.category}" data-store="${esc(p.store)}" data-price="${p.price}" data-order="${order}" data-search="${esc((name + ' ' + s.name).toLowerCase())}">
${opts.badge && p.featured ? `<span class="badge">${t(lang, 'product.featured')}</span>` : ''}${icons.sparkle()}<span class="glare" aria-hidden="true"></span>
<a class="card-media" href="${pdp}" tabindex="-1"><img src="${asset(from, p.image)}" alt="${ta(lang, 'product.img_alt', { name, store: s.name })}" width="400" height="500" loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async"></a>
<div class="card-body">
<p class="card-store">${storeLogo(from, s)}</p>
<${h} class="card-title"><a href="${pdp}">${esc(name)}</a></${h}>
<div class="card-foot">${priceHTML(p)}<a class="card-cta aff" data-pid="${esc(p.id)}" data-store="${esc(p.store)}" href="${esc(p.affiliate_url)}" target="_blank" rel="sponsored nofollow noopener" aria-label="${shopLabel}">${t(lang, 'product.shop_now')}${icons.external()}</a></div>
</div>
</article>`;
    }

    function header(lang, from, current, alternates) {
      const L = LANG[lang];
      const items = ['home', 'shop', 'about'];
      if (ctx.mode === 'spa' && ctx.showAdmin && ctx.showAdmin()) items.push('admin');
      const nav = items.map(k =>
        `<li><a href="${link(from, lang, k)}"${current === k ? ' aria-current="page"' : ''}${k === 'admin' ? ' class="nav-admin"' : ''}>${t(lang, 'nav.' + k)}</a></li>`).join('');
      const menu = ctx.languages.map(x => `<li><a href="${alternates[x.code]}" hreflang="${x.htmlLang}" data-set-lang="${x.code}"${x.code === lang ? ' aria-current="true"' : ''}><span lang="${x.htmlLang}" dir="${x.dir}">${x.name}</span>${x.code === lang ? icons.check() : `<span class="code" dir="ltr">${x.code.toUpperCase()}</span>`}</a></li>`).join('');
      return `<header class="site-header"><div class="wrap header-inner">
<a class="logo" href="${link(from, lang, 'home')}" aria-label="${ta(lang, 'nav.logo')}">${WM.wordmark('wm-h')}</a>
<nav class="main-nav" aria-label="${ta(lang, 'nav.main')}"><ul>${nav}</ul></nav>
<div class="header-tools">
<details class="lang-switch">
<summary aria-label="${ta(lang, 'nav.language')}: ${esc(L.name)}">${icons.globe()}<span>${L.name}</span><span class="chev">${icons.chevronDown()}</span></summary>
<ul class="lang-menu">${menu}</ul>
</details>
</div>
</div></header>`;
    }

    function footer(lang, from, alternates) {
      const li = k => `<li><a href="${link(from, lang, k)}">${t(lang, 'nav.' + k)}</a></li>`;
      const langs = ctx.languages.map(x => `<li><a href="${alternates[x.code]}" hreflang="${x.htmlLang}" lang="${x.htmlLang}" dir="${x.dir}" data-set-lang="${x.code}"${x.code === lang ? ' aria-current="true"' : ''}>${x.name}</a></li>`).join('');
      const stores = ctx.stores.map(s => `<li><a href="${link(from, lang, 'shop', s.id)}">${storeLogo(from, s, 'store-logo store-logo-sm')}</a></li>`).join('');
      return `<footer class="site-footer"><div class="wrap">
<div class="footer-grid">
<div class="footer-brand">
<a class="footer-logo" href="${link(from, lang, 'home')}" aria-label="${ta(lang, 'nav.logo')}">${WM.wordmark('wm-f')}</a>
<p>${t(lang, 'footer.tagline')}</p>
<ul class="footer-stores" aria-label="${ta(lang, 'shop.store')}">${stores}</ul>
<div class="footer-disclosure" role="note"><strong>${t(lang, 'footer.disclosure_title')}</strong><p>${t(lang, 'footer.disclosure')} <a href="${link(from, lang, 'disclosure')}">${t(lang, 'footer.disclosure_link')}</a></p></div>
</div>
<nav class="footer-col" aria-labelledby="f-explore"><h2 id="f-explore">${t(lang, 'footer.explore')}</h2><ul>${li('home')}${li('shop')}${li('about')}</ul></nav>
<nav class="footer-col" aria-labelledby="f-legal"><h2 id="f-legal">${t(lang, 'footer.legal')}</h2><ul>${li('disclosure')}${li('privacy')}</ul></nav>
<nav class="footer-col footer-lang" aria-labelledby="f-lang"><h2 id="f-lang">${t(lang, 'footer.language')}</h2><ul>${langs}</ul></nav>
</div>
<p class="copyright">${t(lang, 'footer.copyright', { year: ltr(String(ctx.year)) })}</p>
</div></footer>`;
    }

    /* ---------- pages ---------- */
    function home(lang, from) {
      const products = ctx.products();
      const featured = products.filter(p => p.featured);
      const heroImgs = (featured.length >= 3 ? featured : products).slice(0, 3);
      const shop = link(from, lang, 'shop');
      const cats = CATEGORIES.map(c => {
        const items = products.filter(p => p.category === c);
        const img = items[0] ? `<img src="${asset(from, items[0].image)}" alt="" loading="lazy" decoding="async" width="400" height="500">` : '';
        return `<a class="cat-tile" data-tilt href="${link(from, lang, 'shop', c)}">${img}<strong>${t(lang, 'cat.' + c)}</strong><span>${pluralCount(lang, items.length)}${icons.chevronEnd()}</span></a>`;
      }).join('');
      const storeTiles = ctx.stores.map(s => {
        const n = products.filter(p => p.store === s.id).length;
        return `<a class="store-tile" data-tilt href="${link(from, lang, 'shop', s.id)}" style="--store:${esc(s.color)}">${storeLogo(from, s, 'store-logo store-logo-lg')}<span>${pluralCount(lang, n)}${icons.chevronEnd()}</span></a>`;
      }).join('');
      const marqueeItems = ctx.stores.map(s => storeLogo(from, s, 'store-logo store-logo-md') + icons.sparkle('sparkle')).join('');
      const steps = get(lang, 'home.steps').map(s => `<li data-reveal><h3>${tx(lang, s.t)}</h3><p>${tx(lang, s.p)}</p></li>`).join('');
      return `<section class="hero"><div class="wrap hero-grid">
<div class="hero-copy">
<span class="eyebrow">${icons.sparkle()}${t(lang, 'home.eyebrow')}</span>
<h1 class="chrome-text shine-text">${t(lang, 'home.title')}</h1>
<p>${t(lang, 'home.sub')}</p>
<div class="hero-ctas"><a class="btn btn-chrome" href="${shop}">${t(lang, 'home.cta_shop')}${icons.arrowEnd()}</a><a class="btn btn-ghost" href="${link(from, lang, 'about')}">${t(lang, 'home.cta_how')}</a></div>
</div>
<div class="hero-visual" aria-hidden="true">
<canvas class="hero-3d"></canvas>
<div class="hero-stage">
${heroImgs.map((p, i) => `<div class="tile t${i + 1}"><img src="${asset(from, p.image)}" alt="" width="400" height="500"></div>`).join('')}
</div>
${icons.sparkle('sparkle s1')}${icons.sparkle('sparkle s2')}${icons.sparkle('sparkle s3')}
</div>
</div></section>

<div class="marquee" aria-hidden="true"><div class="marquee-track"><div class="marquee-group">${marqueeItems}${marqueeItems}</div><div class="marquee-group">${marqueeItems}${marqueeItems}</div></div></div>

<section class="section" aria-labelledby="featured-title"><div class="wrap" data-carousel>
<div class="section-head"><div><h2 id="featured-title">${t(lang, 'home.featured_title')}</h2><p>${t(lang, 'home.featured_sub')}</p></div>
<div class="carousel-ctrl"><button class="icon-btn" type="button" data-prev aria-label="${ta(lang, 'home.prev')}">${icons.chevronStart()}</button><button class="icon-btn" type="button" data-next aria-label="${ta(lang, 'home.next')}">${icons.chevronEnd()}</button></div></div>
<ul class="carousel" aria-label="${ta(lang, 'home.featured_list')}">${featured.map((p, i) => `<li>${card(lang, from, p, i)}</li>`).join('')}</ul>
</div></section>

<section class="section" aria-labelledby="stores-title"><div class="wrap">
<div class="section-head"><div><h2 id="stores-title">${t(lang, 'home.stores_title')}</h2><p>${t(lang, 'home.stores_sub')}</p></div></div>
<div class="store-grid">${storeTiles}</div>
</div></section>

<section class="section" aria-labelledby="cat-title"><div class="wrap">
<div class="section-head"><div><h2 id="cat-title">${t(lang, 'home.categories_title')}</h2><p>${t(lang, 'home.categories_sub')}</p></div><a class="btn btn-ghost" href="${shop}">${t(lang, 'home.view_all')}${icons.arrowEnd()}</a></div>
<div class="cat-grid">${cats}</div>
</div></section>

<section class="section" aria-labelledby="how-title"><div class="wrap">
<div class="section-head"><h2 id="how-title">${t(lang, 'home.how_title')}</h2></div>
<ol class="steps">${steps}</ol>
</div></section>`;
    }

    function shop(lang, from) {
      const products = ctx.products();
      const prices = products.map(p => p.price);
      const minP = prices.length ? Math.floor(Math.min(...prices) / 5) * 5 : 0;
      const maxP = prices.length ? Math.ceil(Math.max(...prices) / 5) * 5 : 100;
      const catOpts = ['all', ...CATEGORIES].map(c => {
        const n = c === 'all' ? products.length : products.filter(p => p.category === c).length;
        return `<label class="opt"><input type="radio" name="cat" value="${c}"${c === 'all' ? ' checked' : ''}><span>${t(lang, 'cat.' + c)}</span><span class="n" dir="ltr">${n}</span></label>`;
      }).join('');
      const storeOpts = ctx.stores.map(s => {
        const n = products.filter(p => p.store === s.id).length;
        return `<label class="opt"><input type="checkbox" name="store" value="${esc(s.id)}">${storeLogo(from, s, 'store-logo store-logo-sm')}<span class="n" dir="ltr">${n}</span></label>`;
      }).join('');
      const cards = products.map((p, i) => card(lang, from, p, i, { h: 'h2', badge: true, eager: i < 4 })).join('');
      return `<div class="wrap">
<div class="page-head">
${breadcrumbs(lang, [{ label: t(lang, 'nav.home'), href: link(from, lang, 'home') }, { label: t(lang, 'nav.shop') }])}
<h1 class="chrome-text">${t(lang, 'shop.title')}</h1>
<p>${t(lang, 'shop.sub')}</p>
</div>
<noscript><p class="notice">${t(lang, 'shop.noscript')}</p></noscript>
<div class="shop-layout">
<aside class="filters" aria-labelledby="filters-title">
<details class="filters-panel">
<summary><span id="filters-title">${t(lang, 'shop.filters')}</span><span class="chev">${icons.chevronDown()}</span></summary>
<form id="filter-form" class="filter-form" role="search" aria-labelledby="filters-title">
<div class="field"><label class="field-label" for="f-search">${t(lang, 'shop.search')}</label><div class="input-wrap">${icons.search()}<input class="input" id="f-search" name="q" type="search" placeholder="${ta(lang, 'shop.search_placeholder')}" autocomplete="off"></div></div>
<fieldset class="field"><legend>${t(lang, 'shop.category')}</legend>${catOpts}</fieldset>
<fieldset class="field"><legend>${t(lang, 'shop.store')}</legend>${storeOpts}</fieldset>
<div class="field"><label class="field-label" for="f-price">${t(lang, 'shop.price')}</label>
<input class="range" id="f-price" name="max" type="range" min="${minP}" max="${maxP}" step="5" value="${maxP}">
<div class="range-scale"><bdi dir="ltr">${money(minP)}</bdi><output id="f-price-out" class="range-out" for="f-price">${t(lang, 'shop.price_value', { price: ltr(money(maxP)) })}</output><bdi dir="ltr">${money(maxP)}</bdi></div></div>
<button type="button" class="link-btn" data-reset>${t(lang, 'shop.reset')}</button>
</form>
</details>
</aside>
<section class="results">
<div class="results-bar"><p class="count" id="results-count" aria-live="polite">${pluralCount(lang, products.length)}</p>
<div class="sort-field"><label class="field-label" for="f-sort">${t(lang, 'shop.sort')}</label><span class="select"><select id="f-sort"><option value="featured">${t(lang, 'shop.sort_featured')}</option><option value="low">${t(lang, 'shop.sort_low')}</option><option value="high">${t(lang, 'shop.sort_high')}</option></select>${icons.chevronDown()}</span></div></div>
<div class="grid" id="grid">${cards}</div>
<div class="empty" id="empty" hidden>${icons.sparkle()}<h2>${t(lang, 'shop.empty_title')}</h2><p>${t(lang, 'shop.empty_text')}</p><button class="btn btn-ghost" type="button" data-reset>${t(lang, 'shop.reset')}</button></div>
</section>
</div>
</div>`;
    }

    function product(lang, from, p) {
      const products = ctx.products();
      const name = p.name[lang];
      const s = storeOf(p);
      const catLabel = t(lang, 'cat.' + p.category);
      const related = products.filter(x => x.category === p.category && x.id !== p.id)
        .concat(products.filter(x => x.category !== p.category && x.featured)).slice(0, 4);
      return `<div class="wrap">
<div class="page-head">
${breadcrumbs(lang, [
    { label: t(lang, 'nav.home'), href: link(from, lang, 'home') },
    { label: t(lang, 'nav.shop'), href: link(from, lang, 'shop') },
    { label: catLabel, href: link(from, lang, 'shop', p.category) },
    { label: esc(name) }
  ])}
</div>
<article class="pdp">
<div class="pdp-media" data-tilt><span class="glare" aria-hidden="true"></span><img src="${asset(from, p.image)}" alt="${ta(lang, 'product.img_alt', { name, store: s.name })}" width="400" height="500" fetchpriority="high"></div>
<div class="pdp-info">
<p class="card-store">${storeLogo(from, s, 'store-logo store-logo-md')}</p>
<h1 class="chrome-text">${esc(name)}</h1>
<div class="pdp-price">${priceHTML(p)}<small>${t(lang, 'product.price_note')}</small></div>
<p class="pdp-desc">${tx(lang, p.description[lang])}</p>
<div class="pdp-cta"><a class="btn btn-chrome aff" data-pid="${esc(p.id)}" data-store="${esc(p.store)}" href="${esc(p.affiliate_url)}" target="_blank" rel="sponsored nofollow noopener">${t(lang, 'product.shop_at', { store: ltr(esc(s.name)) })}${icons.external()}</a><small>${t(lang, 'product.new_tab')}</small></div>
<aside class="disclosure-note" aria-label="${ta(lang, 'footer.disclosure_title')}">${icons.info()}<div><p>${t(lang, 'product.disclosure', { store: ltr(esc(s.name)) })}</p><p><a href="${link(from, lang, 'disclosure')}">${t(lang, 'product.disclosure_link')}</a></p></div></aside>
<dl class="specs">
<dt>${t(lang, 'product.store')}</dt><dd><a href="${link(from, lang, 'shop', s.id)}">${ltr(esc(s.name))}</a></dd>
<dt>${t(lang, 'product.category')}</dt><dd><a href="${link(from, lang, 'shop', p.category)}">${catLabel}</a></dd>
<dt>${t(lang, 'product.ref')}</dt><dd>${ltr(esc(p.id.toUpperCase()))}</dd>
</dl>
<a class="back-link" href="${link(from, lang, 'shop')}">${icons.arrowStart()}${t(lang, 'product.back')}</a>
</div>
</article>
<section class="section" aria-labelledby="related-title">
<div class="section-head"><h2 id="related-title">${t(lang, 'product.related', { category: catLabel })}</h2></div>
<div class="grid grid-4">${related.map((r, i) => card(lang, from, r, i)).join('')}</div>
</section>
</div>`;
    }

    function prose(lang, from, key) {
      const page = get(lang, 'pages.' + key);
      const vars = { code: '<code dir="ltr">rel="sponsored"</code>', email: ltr(esc(ctx.contactEmail)) };
      const date = new Intl.DateTimeFormat(LANG[lang].dateLocale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(ctx.privacyUpdated + 'T12:00:00Z'));
      return `<div class="wrap">
<div class="page-head">
${breadcrumbs(lang, [{ label: t(lang, 'nav.home'), href: link(from, lang, 'home') }, { label: t(lang, 'nav.' + key) }])}
<h1 class="chrome-text">${tx(lang, page.title)}</h1>
</div>
<div class="prose">
<p class="lead">${tx(lang, page.lead)}</p>
${page.updated ? `<p class="updated">${tx(lang, page.updated, { date: `<bdi>${esc(date)}</bdi>` })}</p>` : ''}
${page.sections.map(s => `<section data-reveal><h2>${tx(lang, s.h)}</h2><p>${tx(lang, s.p, vars)}</p></section>`).join('\n')}
</div>
</div>`;
    }

    function notFound(lang, from) {
      return `<div class="wrap nf">
<p class="big chrome-text" aria-hidden="true" dir="ltr">404</p>
<h1>${t(lang, 'error.nf_title')}</h1>
<p>${t(lang, 'error.nf_text')}</p>
<a class="btn btn-chrome" href="${link(from, lang, 'shop')}">${t(lang, 'error.nf_cta')}${icons.arrowEnd()}</a>
</div>`;
    }

    // Route -> {title, desc, body, current, page, arg}
    function page(lang, route, from) {
      const meta = k => get(lang, 'meta.' + k);
      const { page: pg, arg } = route;
      if (pg === 'home') return { current: 'home', title: meta('home_title'), desc: meta('home_desc'), body: home(lang, from) };
      if (pg === 'shop') return { current: 'shop', title: meta('shop_title'), desc: meta('shop_desc'), body: shop(lang, from) };
      if (pg === 'about' || pg === 'disclosure' || pg === 'privacy') return { current: pg, title: meta(pg + '_title'), desc: meta(pg + '_desc'), body: prose(lang, from, pg) };
      if (pg === 'product') {
        const p = ctx.products().find(x => x.id === arg);
        if (p) return { current: 'shop', title: fill(meta('product_title'), { name: p.name[lang], store: storeOf(p).name }), desc: p.description[lang], body: product(lang, from, p) };
      }
      return { current: null, title: meta('notfound_title'), desc: meta('notfound_desc'), body: notFound(lang, from), notFound: true };
    }

    return {
      CATEGORIES, LANG, STORE, P,
      esc, fill, ltr, get, tx, t, ta, isolate, money, priceHTML, pluralCount,
      link, pathOf, relPath, asset, abs, storeOf, storeLogo,
      breadcrumbs, card, header, footer, page
    };
  }

  return { create, CATEGORIES };
});
