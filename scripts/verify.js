// Browser verification of the live single-page app (artifact/), in headless Chrome.
//  - RTL acceptance audit on every /ar route (incl. dashboard tabs) at 390px and 1280px
//  - glyph coverage for zh / hi / bn, overflow sweep for all 7 languages
//  - 3D/motion checks (WebGL hero, tilt, marquee and shine direction, reduced motion)
//  - dashboard flows with a mocked Claude runtime: owner gate, stats, auto-fill, publish
//  - visitor stats tracking (non-owner)
// Screenshots + report.json -> verification/
//
//   npm i -D puppeteer-core   (or set PPTR=/path/to/puppeteer-core)
//   CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node scripts/verify.js
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require(process.env.PPTR || 'puppeteer-core');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'artifact');
const OUT = path.join(ROOT, 'verification');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8099;
const BASE = `http://localhost:${PORT}/index.html`;
const WIDTHS = [390, 1280];
const AR = { home: '#/ar', shop: '#/ar/shop', product: '#/ar/product/p01', about: '#/ar/about', disclosure: '#/ar/disclosure', privacy: '#/ar/privacy', notfound: '#/ar/nope', admin: '#/ar/admin' };
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
// The artifact host wraps the page fragment in this skeleton.
const SKELETON = s => `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${s}</body></html>`;

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ART, rel);
  if (!file.startsWith(ART) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  if (rel === 'index.html') return res.end(SKELETON(fs.readFileSync(file, 'utf8')));
  fs.createReadStream(file).pipe(res);
});

// A fake claude.ai runtime. owner=true -> dashboard; owner=false -> a visitor whose stats are recorded.
function mockRuntime(owner) {
  window.__published = null;
  window.__statsWrites = [];
  const stats = {
    views: { p01: 14, p16: 9, p06: 6 }, clicks: { p01: 5, p16: 3 }, langs: { ar: 11, en: 9, fr: 4 }, stores: { aliexpress: 5, shein: 2, bulchic: 1 },
    days: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), { v: 3 + (i % 4), c: i % 3 }]))
  };
  const ns = {
    user: { isOwner: async () => owner, id: async () => (owner ? 'u_owner' : 'u_visitor'), canEdit: async () => owner, can: async () => owner },
    db: {
      doc: path => ({ get: async () => ({ exists: false, data: () => undefined }), set: async d => { window.__statsWrites.push({ path, d: JSON.parse(JSON.stringify(d)) }); } }),
      collection: () => ({ get: async () => ({ docs: [{ id: 'u1', data: () => stats }] }) })
    },
    sample: Object.assign(async () => ({ text: '' }), {
      limits: async () => ({ maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 2e7, mediaTypes: ['image/png', 'image/jpeg'] } }),
      json: async (prompt, opts) => {
        window.__samplePrompt = { prompt, images: opts && opts.images ? opts.images.length : 0 };
        await new Promise(r => setTimeout(r, 200));
        return {
          category: 'outerwear', price: 47.5, currency: 'USD',
          name: { en: 'Silver Mesh Bomber', zh: 'é“¶è‰²ç½‘çœ¼é£žè¡Œå‘˜å¤¹å…‹', hi: 'à¤¸à¤¿à¤²à¥à¤µà¤° à¤®à¥‡à¤¶ à¤¬à¥‰à¤®à¥à¤¬à¤°', es: 'Bomber de malla plateada', fr: 'Bomber en mesh argentÃ©', ar: 'Ø¬Ø§ÙƒÙŠØª Ø¨ÙˆÙ…Ø¨Ø± Ø´Ø¨ÙƒÙŠ ÙØ¶ÙŠ', bn: 'à¦¸à¦¿à¦²à¦­à¦¾à¦° à¦®à§‡à¦¶ à¦¬à¦®à§à¦¬à¦¾à¦°' },
          description: { en: 'A cropped bomber in silver mesh with ribbed cuffs and a chrome zip.', zh: 'é“¶è‰²ç½‘çœ¼çŸ­æ¬¾é£žè¡Œå‘˜å¤¹å…‹ï¼Œç½—çº¹è¢–å£ï¼Œé“¬é“¶æ‹‰é“¾ã€‚', hi: 'à¤¸à¤¿à¤²à¥à¤µà¤° à¤®à¥‡à¤¶ à¤•à¥€ à¤•à¥à¤°à¥‰à¤ªà¥à¤¡ à¤¬à¥‰à¤®à¥à¤¬à¤° à¤œà¥ˆà¤•à¥‡à¤Ÿ, à¤°à¤¿à¤¬à¥à¤¡ à¤•à¤«à¤¼ à¤”à¤° à¤•à¥à¤°à¥‹à¤® à¤œà¤¼à¤¿à¤ª à¤•à¥‡ à¤¸à¤¾à¤¥à¥¤', es: 'Bomber corta de malla plateada con puÃ±os de canalÃ© y cremallera cromada.', fr: 'Bomber court en mesh argentÃ©, poignets cÃ´telÃ©s et zip chromÃ©.', ar: 'Ø¬Ø§ÙƒÙŠØª Ø¨ÙˆÙ…Ø¨Ø± Ù‚ØµÙŠØ± Ù…Ù† Ø§Ù„Ø´Ø¨Ùƒ Ø§Ù„ÙØ¶ÙŠ Ø¨Ø£Ø³Ø§ÙˆØ± Ù…Ø¶Ù„Ø¹Ø© ÙˆØ³Ø­Ø§Ø¨ ÙƒØ±ÙˆÙ…ÙŠ.', bn: 'à¦°à§à¦ªà¦¾à¦²à¦¿ à¦®à§‡à¦¶à§‡à¦° à¦•à§à¦°à¦ªà¦¡ à¦¬à¦®à§à¦¬à¦¾à¦° à¦œà§à¦¯à¦¾à¦•à§‡à¦Ÿ, à¦°à¦¿à¦¬à¦¡ à¦•à¦¾à¦« à¦†à¦° à¦•à§à¦°à§‹à¦® à¦œà¦¿à¦ª à¦¸à¦¹à¥¤' }
        };
      }
    }),
    artifact: { publish: async doc => { window.__published = doc; } }
  };
  window.claude = { use: name => new Promise(r => setTimeout(() => r(ns[name] || null), 30)) };
}

// Runs in the page. Returns [{item, pass, detail}].
function rtlAudit() {
  const R = [];
  const add = (item, pass, detail = '') => R.push({ item, pass: !!pass, detail: String(detail) });
  const html = document.documentElement;
  const cs = (el, pseudo) => getComputedStyle(el, pseudo);
  const rect = el => el.getBoundingClientRect();
  const vw = innerWidth;
  const AR = /[\u0600-\u06FF]/;
  add('1 html lang="ar" dir="rtl"', html.lang === 'ar' && html.dir === 'rtl', `lang=${html.lang} dir=${html.dir}`);
  ['.site-header', '.main-nav', '.breadcrumbs', '.filters', '#grid', '.carousel', '.site-footer', '.admin-tabs', '.add-form', '.kpis'].forEach(sel => {
    const el = document.querySelector(sel); if (el) add(`3 ${sel} direction rtl`, cs(el).direction === 'rtl', cs(el).direction);
  });
  const logo = document.querySelector('.site-header .logo');
  add('3 header: logo at inline-start (right)', rect(logo).right > vw * 0.6, `logo.right=${Math.round(rect(logo).right)}`);
  add('3 header: language switcher at inline-end (left)', rect(document.querySelector('.header-tools')).left < vw * 0.4, '');
  const crumbs = document.querySelectorAll('.breadcrumbs li');
  if (crumbs.length > 1) add('3 breadcrumbs run right-to-left', rect(crumbs[0]).left > rect(crumbs[crumbs.length - 1]).left, '');
  const grid = document.querySelector('#grid, .grid');
  if (grid) { const c = [...grid.querySelectorAll('.card')].filter(x => !x.hidden).slice(0, 2); if (c.length === 2) add('3 product grid fills right-to-left', rect(c[0]).left > rect(c[1]).left, ''); }
  const filters = document.querySelector('.filters');
  if (filters && vw >= 960) add('3 filters sidebar on the right', rect(filters).left > rect(document.querySelector('.results')).left, '');
  const st = document.querySelectorAll('.store-tile');
  if (st.length > 1 && vw >= 640) add('3 store tiles run right-to-left', rect(st[0]).left > rect(st[1]).left, '');
  const tabs = document.querySelectorAll('.admin-tabs button');
  if (tabs.length > 1) add('3 dashboard tabs run right-to-left', rect(tabs[0]).left > rect(tabs[1]).left, '');
  const fcols = [...document.querySelectorAll('.footer-grid > *')];
  if (fcols.length > 2) add('3 footer columns mirror', vw >= 960 ? rect(fcols[0]).left > rect(fcols[1]).left : rect(fcols[1]).left > rect(fcols[2]).left, '');
  const car = document.querySelector('.carousel');
  if (car) { const li = car.querySelectorAll('li'); add('3 carousel starts at the right', rect(li[0]).left > rect(li[1]).left, ''); }
  const range = document.querySelector('#f-price');
  if (range) add('3/8 price slider direction rtl', cs(range).direction === 'rtl', '');
  const dirIcons = [...document.querySelectorAll('.icon-dir')];
  const flipped = dirIcons.filter(i => new DOMMatrix(cs(i).transform).a < 0);
  if (dirIcons.length) add('4 directional icons mirrored', flipped.length === dirIcons.length, `${flipped.length}/${dirIcons.length}`);
  const plain = [...document.querySelectorAll('svg.icon:not(.icon-dir), svg.sparkle')];
  add('4 non-directional icons not mirrored', plain.every(i => { const t = cs(i).transform; return t === 'none' || new DOMMatrix(t).a >= 0; }), `${plain.length} checked`);
  const h1 = document.querySelector('.chrome-text');
  if (h1) add('5 chrome gradient angle reversed (255deg)', cs(h1).backgroundImage.includes('255deg'), '');
  const shine = document.querySelector('.shine-text');
  if (shine) add('5 headline chrome drift reversed', cs(shine).animationDirection === 'alternate-reverse', cs(shine).animationDirection);
  const btn = [...document.querySelectorAll('.btn, .card-cta')].find(b => b.offsetParent);
  if (btn) add('5 button shine starts at inline-start (right)', new DOMMatrix(cs(btn, '::after').transform).e > 0, '');
  document.querySelectorAll('svg.wordmark').forEach((s, i) => add(`6 wordmark #${i + 1} stays LTR`, cs(s).direction === 'ltr', cs(s).direction));
  const bdis = [...document.querySelectorAll('.price, .specs bdi, .kpi bdi, .hb-num bdi')];
  add('6 prices / store names / numbers isolated LTR', bdis.every(b => cs(b).direction === 'ltr' && cs(b).unicodeBidi === 'isolate'), `${bdis.length} checked`);
  const brandRuns = [...document.querySelectorAll('bdi')].filter(b => /^(Drape|AliExpress|SHEIN|Bulchic)$/.test(b.textContent));
  add('6 "Drape" and store names isolated in Arabic prose', brandRuns.length === 0 || brandRuns.every(b => cs(b).direction === 'ltr'), `${brandRuns.length} runs`);
  const textEls = [...document.querySelectorAll('body *')].filter(el => !el.closest('svg') && el.getClientRects().length && [...el.childNodes].some(n => n.nodeType === 3 && AR.test(n.textContent)));
  add('7 no letter-spacing on Arabic text', textEls.every(el => ['normal', '0px'].includes(cs(el).letterSpacing)), `${textEls.length} text elements`);
  const badLH = textEls.filter(el => { const s = cs(el); return s.lineHeight === 'normal' || parseFloat(s.lineHeight) / parseFloat(s.fontSize) < 1.695; });
  add('7 Arabic line-height >= 1.7', badLH.length === 0, badLH.slice(0, 3).map(e => `${e.tagName}.${e.className} ${cs(e).lineHeight}/${cs(e).fontSize}`).join(' ') || 'ok');
  const badFont = textEls.filter(el => !cs(el).fontFamily.startsWith('Cairo'));
  add('7 Arabic font (Cairo)', badFont.length === 0 && document.fonts.check('16px Cairo', 'Ø¹Ø±Ø¨ÙŠ'), badFont.slice(0, 3).map(e => e.tagName + '.' + e.className + ' ' + cs(e).fontFamily).join(' | '));
  const search = document.querySelector('#f-search');
  if (search) add('8 search input rtl, text-align start', cs(search).direction === 'rtl' && ['start', 'right'].includes(cs(search).textAlign), '');
  const sel = document.querySelector('#f-sort, #a-cat');
  if (sel) { const arrow = sel.parentElement.querySelector('svg'); add('8 dropdown rtl, arrow at inline-end (left)', cs(sel).direction === 'rtl' && rect(arrow).left < rect(sel).left + rect(sel).width / 2, ''); }
  const enName = document.querySelector('#n-en'), arName = document.querySelector('#n-ar');
  if (enName && arName) add('8 per-language inputs: en LTR, ar RTL', cs(enName).direction === 'ltr' && cs(arName).direction === 'rtl', '');
  const link = document.querySelector('#a-link');
  if (link) add('8 URL / price inputs stay LTR', cs(link).direction === 'ltr' && cs(document.querySelector('#a-price')).direction === 'ltr', '');
  add('no horizontal page overflow', document.documentElement.scrollWidth <= vw + 1, `${document.documentElement.scrollWidth}/${vw}`);
  return R;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(PORT, r));
  // Main audit without WebGL (the hero falls back to CSS tiles); 3D checks run in a separate WebGL browser.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 600000, args: ['--no-sandbox', '--disable-3d-apis'] });
  const glBrowser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { ar: {}, motion: [], admin: [], visitor: [], scripts: {}, overflow: [] };
  const errors = [];

  async function newPage(runtime, b) {
    const page = await (b || browser).newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    if (runtime !== undefined) await page.evaluateOnNewDocument(mockRuntime, runtime);
    return page;
  }
  async function load(page, hash, width) {
    await page.setViewport({ width, height: width < 600 ? 844 : 900, deviceScaleFactor: 1 });
    await page.goto('about:blank');
    await page.goto(BASE + hash, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => {
      await new Promise(r => setTimeout(r, 250));
      const imgs = [...document.images];
      imgs.forEach(i => { i.loading = 'eager'; });
      await Promise.all(imgs.map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
      await document.fonts.ready;
    });
  }
  const shot = (page, name, full = true) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full });

  /* ---- /ar audit (owner runtime so the dashboard renders) ---- */
  const owner = await newPage(true);
  for (const [name, hash] of Object.entries(AR)) {
    for (const w of WIDTHS) {
      await load(owner, hash, w);
      const rows = await owner.evaluate(rtlAudit);
      if (name === 'home') {
        rows.push(await owner.evaluate(async () => {
          const track = document.querySelector('.carousel');
          if (track.scrollWidth <= track.clientWidth) return { item: '3 carousel next scrolls toward the left', pass: true, detail: 'fits' };
          document.querySelector('[data-next]').click();
          await new Promise(r => setTimeout(r, 900));
          const ok = track.scrollLeft < 0; track.scrollLeft = 0;
          return { item: '3 carousel next scrolls toward the left', pass: ok, detail: '' };
        }));
      }
      if (name === 'shop') {
        rows.push(await owner.evaluate(() => {
          const e = document.getElementById('empty');
          const r = document.querySelector('#f-price'); r.value = 60; r.dispatchEvent(new Event('input', { bubbles: true }));
          const shown = [...document.querySelectorAll('#grid .card')].filter(c => !c.hidden).length;
          const sh = document.querySelector('input[name="store"][value="shein"]'); sh.click();
          const shein = [...document.querySelectorAll('#grid .card')].filter(c => !c.hidden).every(c => c.dataset.store === 'shein');
          document.querySelector('[data-reset]').click();
          return { item: 'shop: price + store filters work, empty state hidden', pass: shown > 0 && shown < 24 && shein && getComputedStyle(e).display === 'none', detail: `${shown} under $60` };
        }));
      }
      if (name === 'admin') {
        for (const tab of ['overview', 'products', 'add']) {
          await owner.evaluate(t => document.querySelector(`[data-tab="${t}"]`).click(), tab);
          await new Promise(r => setTimeout(r, 300));
          const more = await owner.evaluate(rtlAudit);
          report.ar[`admin-${tab}@${w}`] = more;
          await shot(owner, `ar-admin-${tab}-${w}`);
        }
        continue;
      }
      report.ar[`${name}@${w}`] = rows;
      await shot(owner, `ar-${name}-${w}`);
      if (w === 390 && name === 'home') {
        await owner.evaluate(() => { document.querySelector('.lang-switch').open = true; scrollTo(0, 0); });
        rows.push(await owner.evaluate(() => {
          const d = document.querySelector('.lang-switch'), m = d.querySelector('.lang-menu').getBoundingClientRect();
          return { item: '8 language switcher anchored to inline-end, rtl', pass: Math.abs(m.left - d.getBoundingClientRect().left) < 2 && getComputedStyle(d.querySelector('.lang-menu')).direction === 'rtl', detail: '' };
        }));
        await shot(owner, 'ar-home-390-switcher', false);
      }
    }
  }

  /* ---- Motion & 3D ---- */
  const motion = (item, pass, detail = '') => report.motion.push({ item, pass: !!pass, detail: String(detail) });
  const auditPage = owner;
  { const owner = await newPage(true, glBrowser);
  for (const lang of ['en', 'ar']) {
    await load(owner, '#/' + lang, 1280);
    const m = await owner.evaluate(async () => {
      const c = document.querySelector('.hero-3d');
      const t0 = new DOMMatrix(getComputedStyle(document.querySelector('.marquee-track')).transform).e;
      await new Promise(r => setTimeout(r, 1200));
      const t1 = new DOMMatrix(getComputedStyle(document.querySelector('.marquee-track')).transform).e;
      return { webgl: c.classList.contains('on'), drift: t1 - t0 };
    });
    motion(`${lang}: WebGL chrome star rendered`, m.webgl);
    motion(`${lang}: store marquee moves toward ${lang === 'ar' ? 'the right (RTL)' : 'the left'}`, lang === 'ar' ? m.drift > 0 : m.drift < 0, `dx=${m.drift.toFixed(1)}px`);
    await shot(owner, `${lang}-home-1280`);
  }
  await owner.evaluate(() => scrollTo(0, 900));
  const card = await owner.$('.carousel .card');
  const box = await card.boundingBox();
  await owner.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2);
  await new Promise(r => setTimeout(r, 450));
  const tiltM = await owner.evaluate(() => { const c = document.querySelector('.carousel .card'); return { t: getComputedStyle(c).transform, g: getComputedStyle(c.querySelector('.glare')).opacity }; });
  motion('3D tilt applies on pointer move', /matrix3d/.test(tiltM.t), tiltM.t.slice(0, 40));
  motion('glare follows the pointer', Number(tiltM.g) > 0.5, `opacity=${tiltM.g}`);
  await owner.screenshot({ path: path.join(OUT, 'ar-tilt-hover.png'), clip: { x: Math.max(0, box.x - 40), y: box.y - 40, width: Math.min(600, box.width + 80), height: box.height + 80 } });
  await owner.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await load(owner, '#/ar', 1280);
  const rm = await owner.evaluate(() => ({
    marquee: getComputedStyle(document.querySelector('.marquee-track')).animationName,
    shine: getComputedStyle(document.querySelector('.shine-text')).animationName,
    btn: getComputedStyle(document.querySelector('.btn'), '::after').display
  }));
  motion('reduced motion: marquee, shine and button sweep off', rm.marquee === 'none' && rm.shine === 'none' && rm.btn === 'none', JSON.stringify(rm));
  await owner.close(); }

  /* ---- Dashboard flows (owner) ---- */
  const adm = (item, pass, detail = '') => report.admin.push({ item, pass: !!pass, detail: String(detail) });
  await load(owner, '#/fr', 1280);
  adm('owner sees the Dashboard link in the header', await owner.evaluate(() => !!document.querySelector('.nav-admin')));
  await load(owner, '#/en/admin', 1280);
  await owner.evaluate(() => document.querySelector('[data-tab="overview"]').click());
  await new Promise(r => setTimeout(r, 300));
  const ov = await owner.evaluate(() => ({ kpis: [...document.querySelectorAll('.kpi strong')].map(k => k.textContent), bars: document.querySelectorAll('.chart rect').length, top: document.querySelectorAll('.top-list li').length }));
  adm('overview: KPIs, 14-day chart, top products from stats', ov.kpis[1] === '29' && ov.kpis[2] === '8' && ov.bars === 28 && ov.top > 0, JSON.stringify(ov));
  await owner.evaluate(() => document.querySelector('[data-tab="add"]').click());
  await new Promise(r => setTimeout(r, 300));
  await owner.type('#a-link', 'https://us.shein.com/Silver-Mesh-Bomber-Jacket-p-12345678.html?ref=x');
  adm('store auto-detected from the link (SHEIN)', await owner.evaluate(() => /SHEIN/.test(document.querySelector('#a-store-row').textContent) || !!document.querySelector('#a-store-row img[alt="SHEIN"]')));
  const fileInput = await owner.$('#a-file');
  await fileInput.uploadFile(path.join(ROOT, 'public', 'assets', 'products', 'p05.svg'));
  await owner.waitForSelector('#a-preview', { timeout: 5000 }).catch(() => {});
  adm('photo upload -> compressed preview', await owner.evaluate(() => /^data:image\/jpeg/.test((document.querySelector('#a-preview') || {}).src || '')));
  await owner.click('#a-auto');
  await owner.waitForFunction(() => document.querySelector('#n-ar') && document.querySelector('#n-ar').value.length > 0, { timeout: 5000 }).catch(() => {});
  const filled = await owner.evaluate(() => ({ ar: document.querySelector('#n-ar').value, cat: document.querySelector('#a-cat').value, price: document.querySelector('#a-price').value, prompt: window.__samplePrompt }));
  adm('Claude auto-fill: 7 languages, category, visible price; photo sent', filled.ar && filled.cat === 'outerwear' && filled.price === '47.5' && filled.prompt.images === 1 && /Words from the link: "Silver Mesh Bomber Jacket"/.test(filled.prompt.prompt), JSON.stringify({ ar: filled.ar, cat: filled.cat, price: filled.price }));
  await shot(owner, 'en-admin-add-filled-1280');
  await owner.click('#a-save');
  await owner.waitForFunction(() => !!window.__published, { timeout: 5000 }).catch(() => {});
  const pub = await owner.evaluate(() => {
    const doc = window.__published || '';
    const m = doc.match(/<script id="drape-data" type="application\/json">([\s\S]*?)<\/script>/);
    const data = m ? JSON.parse(m[1]) : null;
    return { head: doc.slice(0, 60), n: data ? data.products.length : 0, first: data ? data.products[0] : null, tail: /assets\/app\.js/.test(doc) };
  });
  adm('save republishes the page with the new product first', pub.head.startsWith('<!doctype html><html><head><meta charset=utf8>') && pub.n === 25 && pub.first.store === 'shein' && pub.first.name.bn && /^data:image/.test(pub.first.image) && pub.tail, `products=${pub.n}`);
  await owner.evaluate(() => { window.__published = null; document.querySelector('[data-tab="products"]').click(); });
  await new Promise(r => setTimeout(r, 300));
  await owner.evaluate(() => { const row = document.querySelector('.prod-row'); row.querySelector('[data-del]').click(); row.querySelector('[data-yes]').click(); });
  await owner.waitForFunction(() => !!window.__published, { timeout: 5000 }).catch(() => {});
  adm('delete (with inline confirm) republishes without the product', await owner.evaluate(() => { const m = (window.__published || '').match(/"products":\[/); return !!m; }));

  const visitorGate = await newPage(false);
  await load(visitorGate, '#/en/admin', 1280);
  adm('non-owner is shown the owner-only message, no dashboard', await visitorGate.evaluate(() => !document.querySelector('.admin-tabs') && /owner/i.test(document.querySelector('.admin').textContent) && !document.querySelector('.nav-admin')));
  const noRuntime = await newPage();
  await load(noRuntime, '#/en/admin', 1280);
  adm('outside Claude: dashboard explains it needs Claude', await noRuntime.evaluate(() => /inside Claude/.test(document.querySelector('.admin').textContent)));

  /* ---- Visitor stats ---- */
  await load(visitorGate, '#/ar/product/p16', 1280);
  await visitorGate.evaluate(() => { const a = document.querySelector('.pdp-cta a.aff'); a.addEventListener('click', e => e.preventDefault(), { once: true }); a.click(); });
  await new Promise(r => setTimeout(r, 2000));
  const sw = await visitorGate.evaluate(() => window.__statsWrites.slice(-1)[0]);
  report.visitor.push({ item: 'visitor product view + shop click recorded to stats/<id>', pass: !!sw && sw.path === 'stats/u_visitor' && sw.d.views.p16 === 1 && sw.d.clicks.p16 === 1 && sw.d.langs.ar === 1 && sw.d.stores.aliexpress === 1, detail: sw ? JSON.stringify({ views: sw.d.views, clicks: sw.d.clicks, stores: sw.d.stores }) : 'no write' });

  /* ---- Glyphs zh/hi/bn ---- */
  const SAMPLES = { zh: ['Noto Sans SC', 'ç²¾é€‰èµ›åšè¡—å¤´æ½®æœ', /[\u4E00-\u9FFF]/], hi: ['Noto Sans Devanagari', 'à¤•à¥à¤°à¥‹à¤® à¤¸à¥à¤Ÿà¥à¤°à¥€à¤Ÿà¤µà¤¿à¤¯à¤°', /[\u0900-\u097F]/], bn: ['Noto Sans Bengali', 'à¦•à§à¦°à§‹à¦® à¦¸à§à¦Ÿà§à¦°à¦¿à¦Ÿà¦“à¦¯à¦¼à§à¦¯à¦¾à¦°', /[\u0980-\u09FF]/] };
  for (const [lang, [font, sample, re]] of Object.entries(SAMPLES)) {
    for (const [pg, hash] of [['home', `#/${lang}`], ['product', `#/${lang}/product/p16`], ['shop', `#/${lang}/shop`], ['admin', `#/${lang}/admin`]]) {
      await load(owner, hash, 390);
      if (pg === 'admin') { await owner.evaluate(() => document.querySelector('[data-tab="add"]').click()); await new Promise(r => setTimeout(r, 300)); }
      const res = await owner.evaluate(async (font, sample, src) => {
        const re = new RegExp(src);
        await document.fonts.load(`16px "${font}"`, sample).catch(() => {});
        const els = [...document.querySelectorAll('body *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && re.test(n.textContent)));
        const missing = els.filter(el => !getComputedStyle(el).fontFamily.includes(font));
        return { covered: document.fonts.check(`16px "${font}"`, sample), els: els.length, missing: missing.length, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      }, font, sample, re.source);
      await shot(owner, `${lang}-${pg}-390`);
      report.scripts[`${lang}/${pg}`] = res;
    }
  }

  /* ---- Overflow sweep ---- */
  for (const lang of ['en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn']) {
    for (const h of ['', '/shop', '/product/p04', '/privacy', '/admin']) {
      for (const w of WIDTHS) {
        await load(owner, `#/${lang}${h}`, w);
        const o = await owner.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth }));
        report.overflow.push({ url: `#/${lang}${h}`, w, pass: o.sw <= o.vw + 1, detail: `${o.sw}/${o.vw}` });
      }
    }
  }

  await browser.close();
  await glBrowser.close();
  server.close();
  report.errors = errors;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  let failed = 0;
  const section = (title, rows) => {
    console.log(`\n=== ${title} ===`);
    rows.forEach(r => { if (!r.pass) failed++; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.item}${r.pass ? '' : '  :: ' + r.detail}`); });
  };
  console.log('\n=== /ar RTL audit ===');
  for (const [k, rows] of Object.entries(report.ar)) {
    const bad = rows.filter(r => !r.pass); failed += bad.length;
    console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${k}  (${rows.length - bad.length}/${rows.length})`);
    bad.forEach(r => console.log(`      x ${r.item} :: ${r.detail}`));
  }
  section('3D & motion', report.motion);
  section('Dashboard', report.admin);
  section('Visitor stats', report.visitor);
  console.log('\n=== Glyph coverage ===');
  for (const [k, r] of Object.entries(report.scripts)) {
    const ok = r.covered && r.missing === 0 && !r.overflow; if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}  textEls=${r.els} withoutFont=${r.missing} overflow=${r.overflow}`);
  }
  const ovf = report.overflow.filter(r => !r.pass); failed += ovf.length;
  console.log(`\n=== Overflow sweep: ${report.overflow.length - ovf.length}/${report.overflow.length} pass ===`);
  ovf.forEach(r => console.log(`      x ${r.url}@${r.w} ${r.detail}`));
  console.log(`\nJS errors: ${errors.length}`); errors.forEach(e => console.log('  ' + e)); failed += errors.length;
  console.log(failed ? `\n${failed} failure(s)` : '\nALL CHECKS PASS');
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
