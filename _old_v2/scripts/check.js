// Static acceptance checks over the source CSS and the built site.
//   node scripts/check.js   (run after build)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const languages = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'languages.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'en.json'), 'utf8'));
const fails = [];
const fail = (where, msg) => fails.push(`${where}: ${msg}`);

// 1. No physical sides in CSS (comments stripped). Covers stylesheet + inline style attributes.
const PHYSICAL = /\b(left|right)\b/i;
const css = fs.readFileSync(path.join(ROOT, 'src', 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
css.split('\n').forEach((line, i) => { if (PHYSICAL.test(line)) fail(`src/styles.css:${i + 1}`, `physical direction: ${line.trim()}`); });

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f); else if (f.endsWith('.html')) pages.push(f);
  }
})(DIST);

// English UI strings that must never appear on a non-English page
// (unless that language's translation is genuinely the same word, e.g. es "Legal").
const dicts = Object.fromEntries(languages.map(l => [l.code, JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', l.code + '.json'), 'utf8'))]));
const enPairs = [];
(function collect(o, keyPath) {
  if (typeof o === 'string') { if (o.length > 3 && !/[{}]/.test(o) && !/^DRAPE/.test(o)) enPairs.push([keyPath, o]); }
  else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => collect(v, keyPath.concat(k)));
})({ nav: en.nav, home: en.home, cat: en.cat, shop: en.shop, product: en.product, footer: en.footer, error: en.error }, []);
const leakCandidates = lang => enPairs
  .filter(([kp, s]) => kp.reduce((o, k) => (o == null ? o : o[k]), dicts[lang]) !== s)
  .map(([, s]) => s);

for (const file of pages) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  if (rel === 'index.html') continue; // root picker fragment

  const lang = rel.split('/')[0];
  const L = languages.find(l => l.code === lang);
  const htmlTag = html.match(/<html[^>]*>/);
  if (!htmlTag) { fail(rel, 'no <html> tag'); continue; }
  if (!htmlTag[0].includes(`lang="${L.htmlLang}"`)) fail(rel, `lang should be ${L.htmlLang}`);
  if (!htmlTag[0].includes(`dir="${L.dir}"`)) fail(rel, `dir should be ${L.dir}`);

  // hreflang: one per language + x-default
  const alts = (html.match(/hreflang="[^"]+" href=/g) || []).length;
  if (alts !== languages.length + 1) fail(rel, `expected ${languages.length + 1} hreflang links, found ${alts}`);
  if (!html.includes('hreflang="x-default"')) fail(rel, 'missing x-default');

  // outbound links
  const ext = html.match(/<a [^>]*href="https?:\/\/[^"]*"[^>]*>/g) || [];
  ext.forEach(a => {
    if (!a.includes('target="_blank"')) fail(rel, `outbound link without target=_blank: ${a.slice(0, 80)}`);
    if (!a.includes('rel="sponsored nofollow noopener"')) fail(rel, `outbound link without rel="sponsored nofollow noopener": ${a.slice(0, 80)}`);
  });

  // inline styles must not use physical sides either
  (html.match(/style="[^"]*"/g) || []).forEach(s => { if (PHYSICAL.test(s)) fail(rel, `inline style uses physical side: ${s}`); });

  // affiliate disclosure: footer everywhere, plus a note on product pages
  if (!html.includes('class="footer-disclosure"')) fail(rel, 'footer disclosure missing');
  if (rel.includes('/product/') && !html.includes('class="disclosure-note"')) fail(rel, 'product disclosure missing');

  // images need alt attributes
  (html.match(/<img [^>]*>/g) || []).forEach(img => { if (!/ alt="/.test(img)) fail(rel, `img without alt: ${img.slice(0, 80)}`); });

  // no English UI text leaking into other languages
  if (lang !== 'en') {
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '');
    leakCandidates(lang).forEach(s => { if (text.includes('>' + s + '<') || text.includes('"' + s + '"')) fail(rel, `English string present: "${s}"`); });
  }
}

if (fails.length) {
  console.error(`FAIL: ${fails.length} problem(s)\n  - ` + fails.slice(0, 80).join('\n  - '));
  process.exit(1);
}
console.log(`PASS: ${pages.length} pages checked. No physical left/right in CSS, lang/dir/hreflang/rel/disclosure/alt all present, no English leakage.`);
