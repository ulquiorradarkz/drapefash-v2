// Drape build. Zero dependencies.
//   node scripts/build.js
// Outputs:
//   dist/       static multi-page site (/en/... /ar/...) for any static host
//   artifact/   single-page app published to claude.ai (dashboard, stats, self-publishing catalog)
// Env:
//   SITE_URL=https://drape.example   absolute canonical/hreflang URLs in dist/ (relative if unset)
//   PRETTY_URLS=1                    dist/ links to /en/shop/ instead of /en/shop/index.html

const fs = require('fs');
const path = require('path');
const WM = require('../src/wordmark');
const Render = require('../src/render');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ART = path.join(ROOT, 'artifact');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const PRETTY = process.env.PRETTY_URLS === '1';
const PLURAL_KEYS = new Set(['shop.results']);
const THREE_JS = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

const readJSON = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const languages = readJSON('i18n/languages.json');
const products = readJSON('data/products.json');
const stores = readJSON('data/stores.json');
const dicts = Object.fromEntries(languages.map(l => [l.code, readJSON(`i18n/${l.code}.json`)]));
const LANG = Object.fromEntries(languages.map(l => [l.code, l]));
const SITE = { year: new Date().getFullYear(), privacyUpdated: '2026-10-11', contactEmail: 'privacy@drape.example' };

/* ------------------------------------------------------------------ */
/* Validation: any missing string fails the build (no silent fallback) */
/* ------------------------------------------------------------------ */
function validate() {
  const errors = [];
  const placeholders = s => (s.match(/\{\w+\}/g) || []).sort().join(',');
  function walk(ref, other, lang, keyPath) {
    if (PLURAL_KEYS.has(keyPath)) {
      const needed = new Intl.PluralRules(LANG[lang].htmlLang).resolvedOptions().pluralCategories;
      if (!other || typeof other !== 'object') return errors.push(`${lang}: ${keyPath} missing`);
      needed.forEach(c => { if (!other[c] || !String(other[c]).trim()) errors.push(`${lang}: ${keyPath}.${c} missing (plural form)`); });
      return;
    }
    if (typeof ref === 'string') {
      if (typeof other !== 'string' || !other.trim()) return errors.push(`${lang}: ${keyPath} missing`);
      if (placeholders(ref) !== placeholders(other)) errors.push(`${lang}: ${keyPath} placeholders differ (${placeholders(ref)} vs ${placeholders(other)})`);
      return;
    }
    if (Array.isArray(ref)) {
      if (!Array.isArray(other) || other.length !== ref.length) return errors.push(`${lang}: ${keyPath} must have ${ref.length} items`);
      return ref.forEach((r, i) => walk(r, other[i], lang, `${keyPath}[${i}]`));
    }
    if (!other || typeof other !== 'object') return errors.push(`${lang}: ${keyPath} missing`);
    Object.keys(ref).forEach(k => walk(ref[k], other[k], lang, keyPath ? `${keyPath}.${k}` : k));
    Object.keys(other).forEach(k => { if (!(k in ref)) errors.push(`${lang}: ${keyPath ? keyPath + '.' : ''}${k} is not in en.json`); });
  }
  languages.forEach(l => walk(dicts.en, dicts[l.code], l.code, ''));

  const storeIds = new Set(stores.map(s => s.id));
  stores.forEach(s => { if (s.logo && !fs.existsSync(path.join(ROOT, 'public', s.logo))) errors.push(`store ${s.id}: logo not found at public/${s.logo}`); });
  const ids = new Set();
  products.forEach((p, i) => {
    const at = `products[${i}] (${p.id || '?'})`;
    ['id', 'store', 'category', 'price', 'currency', 'image', 'affiliate_url'].forEach(f => {
      if (p[f] === undefined || p[f] === '') errors.push(`${at}: ${f} missing`);
    });
    if (ids.has(p.id)) errors.push(`${at}: duplicate id`);
    ids.add(p.id);
    if (!/^[a-z0-9-]+$/.test(p.id || '')) errors.push(`${at}: id must be lowercase letters, digits, dashes`);
    if (!storeIds.has(p.store)) errors.push(`${at}: store must be one of ${[...storeIds].join(', ')}`);
    if (!Render.CATEGORIES.includes(p.category)) errors.push(`${at}: category must be one of ${Render.CATEGORIES.join(', ')}`);
    if (typeof p.price !== 'number' || p.price <= 0) errors.push(`${at}: price must be a positive number`);
    if (!/^https:\/\//.test(p.affiliate_url || '')) errors.push(`${at}: affiliate_url must start with https://`);
    if (p.image && !/^data:/.test(p.image) && !fs.existsSync(path.join(ROOT, 'public', p.image))) errors.push(`${at}: image not found at public/${p.image}`);
    languages.forEach(l => {
      ['name', 'description'].forEach(f => {
        if (!p[f] || typeof p[f][l.code] !== 'string' || !p[f][l.code].trim()) errors.push(`${at}: ${f}.${l.code} missing`);
      });
    });
  });
  if (errors.length) {
    console.error(`\nBuild stopped: ${errors.length} problem(s)\n  - ` + errors.join('\n  - ') + '\n');
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */
const FAMILY = {
  'Noto Sans SC': 'Noto+Sans+SC:wght@400;500;700',
  'Noto Sans Devanagari': 'Noto+Sans+Devanagari:wght@400;500;700',
  'Noto Sans Bengali': 'Noto+Sans+Bengali:wght@400;500;700',
  Cairo: 'Cairo:wght@400;600;700;800'
};
const LATIN = 'family=Unbounded:wght@500;700;800&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// L = a language: Latin + that script, other scripts only as subsets for the language names.
// L = 'all': every script in full (the single-page app switches language without reloading).
function fontLinks(L, extraText = '') {
  const pre = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n`;
  if (L === 'all') {
    const all = `https://fonts.googleapis.com/css2?${LATIN}&${Object.values(FAMILY).map(f => 'family=' + f).join('&')}&display=swap`;
    return pre + `<link rel="stylesheet" href="${esc(all)}">`;
  }
  const main = `https://fonts.googleapis.com/css2?${LATIN}${L && L.font ? '&family=' + FAMILY[L.font] : ''}&display=swap`;
  const others = languages.filter(x => x.font && (!L || x.font !== L.font));
  const text = [...new Set((languages.map(x => x.name).join('') + extraText).split(''))].join('');
  const subset = `https://fonts.googleapis.com/css2?${others.map(x => 'family=' + FAMILY[x.font].split(':')[0]).join('&')}&text=${encodeURIComponent(text)}&display=swap`;
  return pre + `<link rel="stylesheet" href="${esc(main)}">\n<link rel="stylesheet" href="${esc(subset)}">`;
}

/* ------------------------------------------------------------------ */
/* Static site (dist/)                                                 */
/* ------------------------------------------------------------------ */
function buildStatic() {
  const R = Render.create({ mode: 'static', languages, dicts, stores, products: () => products, siteUrl: SITE_URL, pretty: PRETTY, ...SITE });
  const href = (from, to) => R.abs(to) || R.relPath(from, to);
  const routes = [{ page: 'home' }, { page: 'shop' }, { page: 'about' }, { page: 'disclosure' }, { page: 'privacy' }, { page: 'notfound' }]
    .concat(products.map(p => ({ page: 'product', arg: p.id })));
  let count = 0;

  for (const L of languages) {
    const lang = L.code;
    for (const route of routes) {
      const from = R.pathOf(lang, route.page, route.arg);
      const pg = R.page(lang, route, from);
      const alternates = Object.fromEntries(languages.map(x => [x.code, R.relPath(from, R.pathOf(x.code, route.page, route.arg))]));
      const hreflang = languages.map(x => `<link rel="alternate" hreflang="${x.htmlLang}" href="${href(from, R.pathOf(x.code, route.page, route.arg))}">`).join('\n') +
        `\n<link rel="alternate" hreflang="x-default" href="${href(from, 'index.html')}">`;
      const client = {
        results: Object.fromEntries(Object.entries(R.get(lang, 'shop.results')).map(([k, v]) => [k, R.isolate(lang, R.esc(v))])),
        priceValue: R.isolate(lang, R.esc(R.get(lang, 'shop.price_value'))),
        imgError: R.get(lang, 'error.img'),
        currency: 'USD'
      };
      const html = `<!doctype html>
<html lang="${L.htmlLang}" dir="${L.dir}" data-lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pg.title)}</title>
<meta name="description" content="${esc(pg.desc)}">
${R.abs(from) ? `<link rel="canonical" href="${R.abs(from)}">\n` : ''}${hreflang}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Drape">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.desc)}">
<meta property="og:locale" content="${L.ogLocale}">
${languages.filter(x => x.code !== lang).map(x => `<meta property="og:locale:alternate" content="${x.ogLocale}">`).join('\n')}
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#05060A">
<link rel="icon" type="image/svg+xml" href="${R.relPath(from, 'assets/favicon.svg')}">
${fontLinks(L)}
<link rel="stylesheet" href="${R.relPath(from, 'assets/styles.css')}">
</head>
<body>
<a class="skip" href="#main">${R.t(lang, 'nav.skip')}</a>
${R.header(lang, from, pg.current, alternates)}
<main id="main" tabindex="-1">
${pg.body}
</main>
${R.footer(lang, from, alternates)}
<script type="application/json" id="i18n">${JSON.stringify(client).replace(/</g, '\\u003c')}</script>
${route.page === 'home' ? `<script src="${THREE_JS}" defer></script>\n` : ''}<script src="${R.relPath(from, 'assets/app.js')}" defer></script>
</body>
</html>
`;
      write(DIST, from, html);
      count++;
    }
  }

  // Root: x-default language picker + redirect.
  const chooseAll = languages.map(l => R.get(l.code, 'root.choose'));
  write(DIST, 'index.html', `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Drape</title>
<meta name="description" content="${esc(chooseAll.join(' · '))}">
${languages.map(x => `<link rel="alternate" hreflang="${x.htmlLang}" href="${href('index.html', R.pathOf(x.code, 'home'))}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${href('index.html', 'index.html')}">
<meta name="theme-color" content="#05060A">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
${fontLinks(null, chooseAll.join(''))}
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<main class="picker">
<span aria-hidden="true">${WM.wordmark('wm-r')}</span>
<ul class="picker-list">
${languages.map(l => `<li><a href="${R.relPath('index.html', R.pathOf(l.code, 'home'))}" hreflang="${l.htmlLang}" lang="${l.htmlLang}" dir="${l.dir}" data-set-lang="${l.code}"><strong>${l.name}</strong><span>${esc(R.get(l.code, 'root.choose'))}</span></a></li>`).join('\n')}
</ul>
</main>
<script>
(function () {
  var codes = ${JSON.stringify(languages.map(l => l.code))};
  var pick = null;
  try { var saved = localStorage.getItem('drape-lang'); if (codes.indexOf(saved) > -1) pick = saved; } catch (e) {}
  if (!pick) {
    var prefs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < prefs.length && !pick; i++) { var c = String(prefs[i]).toLowerCase().split('-')[0]; if (codes.indexOf(c) > -1) pick = c; }
  }
  document.querySelectorAll('[data-set-lang]').forEach(function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('drape-lang', a.getAttribute('data-set-lang')); } catch (e) {} });
  });
  if (pick) location.replace(pick + '/index.html');
})();
</script>
</body>
</html>
`);
  return count + 1;
}

/* ------------------------------------------------------------------ */
/* Single-page app (artifact/)                                         */
/* ------------------------------------------------------------------ */
// The page is a fragment: the artifact host wraps it in its own <html> skeleton.
// The app sets <html lang dir> itself from the language config on every route.
// SHELL_HEAD + data <script> + SHELL_TAIL is also what the dashboard republishes.
function buildArtifact() {
  const chooseAll = languages.map(l => dicts[l.code].root.choose);
  const head = `<title>Drape</title>
<meta name="description" content="${esc(chooseAll.join(' · '))}">
<meta name="theme-color" content="#05060A">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
${fontLinks('all')}
<link rel="stylesheet" href="assets/styles.css">
<div id="app"><noscript><p class="notice">${languages.map(l => esc(dicts[l.code].shop.noscript)).join('<br>')}</p></noscript></div>
`;
  const tail = `
<script src="${THREE_JS}" defer></script>
<script src="assets/wordmark.js" defer></script>
<script src="assets/icons.js" defer></script>
<script src="assets/render.js" defer></script>
<script src="assets/shell.js" defer></script>
<script src="assets/admin.js" defer></script>
<script src="assets/app.js" defer></script>
`;
  const data = { languages, dicts, stores, products, site: SITE };
  const dataTag = `<script id="drape-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  write(ART, 'index.html', head + dataTag + tail);
  write(ART, 'assets/shell.js', `/* Generated by scripts/build.js: the page around the data, for self-publishing. */\nwindow.DRAPE_SHELL = ${JSON.stringify({ head, tail })};\n`);
}

/* ------------------------------------------------------------------ */
function write(base, rel, content) {
  const file = path.join(base, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
function listFiles(base) {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      e.isDirectory() ? walk(f) : out.push(path.relative(base, f).split(path.sep).join('/'));
    }
  })(base);
  return out.sort();
}

validate();
for (const [base, files] of [[DIST, ['styles.css', 'app.js']], [ART, ['styles.css', 'app.js', 'admin.js', 'render.js', 'wordmark.js', 'icons.js']]]) {
  fs.rmSync(base, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'public'), base);
  files.forEach(f => fs.copyFileSync(path.join(ROOT, 'src', f), path.join(base, 'assets', f)));
}
const pages = buildStatic();
buildArtifact();
fs.writeFileSync(path.join(ROOT, 'artifact-files.json'), JSON.stringify(listFiles(ART).filter(f => f !== 'index.html'), null, 1));
fs.rmSync(path.join(ROOT, 'dist-files.json'), { force: true });
console.log(`Built dist/ (${pages} static pages) and artifact/ (single-page app, ${listFiles(ART).length} files) for ${languages.length} languages, ${products.length} products, ${stores.length} stores`);
