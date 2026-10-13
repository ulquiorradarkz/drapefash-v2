/* Drape client script.
 * Static pages (dist/): progressive enhancement of server-rendered HTML.
 * Single-page app (artifact/): hash router (#/ar/shop), dashboard, stats, self-publishing catalog.
 * Shared: language memory, switcher, carousel, shop filters, 3D hero, 3D tilt, scroll motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var LANG_KEY = 'drape-lang';
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var strings = {};
  var isRTL = function () { return root.dir === 'rtl'; };

  function storeLang(lang) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage blocked */ } }
  function fill(tpl, vars) { return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; }); }
  function fmtPrice(n, cur) {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
    catch (e) { return (cur || 'USD') + ' ' + n; }
  }
  function ltr(text) { return '<bdi dir="ltr">' + text + '</bdi>'; }

  /* ================= Global listeners (installed once) ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-set-lang]') : null;
    if (t) storeLang(t.getAttribute('data-set-lang'));
    var sw = document.querySelector('.lang-switch[open]');
    if (sw && !sw.contains(e.target)) sw.open = false;
  });
  document.addEventListener('keydown', function (e) {
    var sw = document.querySelector('.lang-switch[open]');
    if (e.key === 'Escape' && sw) { sw.open = false; sw.querySelector('summary').focus(); }
  });
  function imgFail(img) {
    if (img.dataset.failed || img.closest('.admin')) return;
    img.dataset.failed = '1';
    var box = document.createElement('div');
    box.className = 'img-fallback';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', img.alt || strings.imgError || '');
    box.textContent = strings.imgError || '';
    img.replaceWith(box);
  }
  document.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') imgFail(e.target); }, true);

  /* ================= Enhancements ================= */
  function carousels(scope) {
    scope.querySelectorAll('[data-carousel]').forEach(function (wrap) {
      var track = wrap.querySelector('.carousel');
      var prev = wrap.querySelector('[data-prev]');
      var next = wrap.querySelector('[data-next]');
      if (!track || !prev || !next) return;
      function step(sign) {
        // scrollLeft is negative in RTL, so "forward" is a negative delta there.
        track.scrollBy({ left: track.clientWidth * 0.85 * sign * (isRTL() ? -1 : 1), behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      function update() {
        var pos = Math.abs(track.scrollLeft);
        prev.disabled = pos <= 2;
        next.disabled = pos + track.clientWidth >= track.scrollWidth - 2;
      }
      prev.addEventListener('click', function () { step(-1); });
      next.addEventListener('click', function () { step(1); });
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  function filters(scope, token, onApply) {
    var form = scope.querySelector('#filter-form');
    var grid = scope.querySelector('#grid');
    if (!form || !grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var search = form.querySelector('#f-search');
    var range = form.querySelector('#f-price');
    var out = form.querySelector('#f-price-out');
    var sort = scope.querySelector('#f-sort');
    var count = scope.querySelector('#results-count');
    var empty = scope.querySelector('#empty');
    var panel = scope.querySelector('.filters-panel');
    var plural = new Intl.PluralRules(root.lang);
    var wide = window.matchMedia('(min-width: 960px)');
    function syncPanel() { if (panel && wide.matches) panel.open = true; }
    syncPanel();
    if (wide.addEventListener) wide.addEventListener('change', syncPanel);

    function apply() {
      var q = (search.value || '').trim().toLowerCase();
      var cat = (form.querySelector('input[name="cat"]:checked') || {}).value || 'all';
      var shops = Array.prototype.map.call(form.querySelectorAll('input[name="store"]:checked'), function (i) { return i.value; });
      var max = Number(range.value);
      out.innerHTML = fill(strings.priceValue, { price: ltr(fmtPrice(max)) });
      range.setAttribute('aria-valuetext', out.textContent);
      var shown = 0;
      cards.forEach(function (c) {
        var ok = (cat === 'all' || c.dataset.category === cat) &&
          (!shops.length || shops.indexOf(c.dataset.store) !== -1) &&
          Number(c.dataset.price) <= max &&
          (!q || c.dataset.search.indexOf(q) !== -1);
        c.hidden = !ok;
        if (ok) shown++;
      });
      var mode = sort.value;
      cards.slice().sort(function (a, b) {
        if (mode === 'low') return a.dataset.price - b.dataset.price || a.dataset.order - b.dataset.order;
        if (mode === 'high') return b.dataset.price - a.dataset.price || a.dataset.order - b.dataset.order;
        return a.dataset.order - b.dataset.order;
      }).forEach(function (c) { grid.appendChild(c); });
      var forms = strings.results || {};
      count.innerHTML = fill(forms[plural.select(shown)] || forms.other || '', { n: ltr(String(shown)) });
      empty.hidden = shown !== 0;
      grid.hidden = shown === 0;
      if (onApply) onApply();
    }
    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    sort.addEventListener('change', apply);
    scope.querySelectorAll('[data-reset]').forEach(function (b) {
      b.addEventListener('click', function () { form.reset(); range.value = range.max; sort.value = 'featured'; apply(); });
    });
    function select(tok) {
      tok = String(tok || '').replace(/[^a-z0-9-]/g, '');
      if (!tok) return;
      var r = form.querySelector('input[name="cat"][value="' + tok + '"]');
      if (r) r.checked = true;
      var s = form.querySelector('input[name="store"][value="' + tok + '"]');
      if (s) s.checked = true;
    }
    select(token);
    apply();
    return { select: function (tok) { form.reset(); range.value = range.max; select(tok); apply(); } };
  }

  // 3D tilt + glare that follows the pointer (fine pointers only, full motion only).
  function tilt(scope) {
    if (!finePointer || reduceMotion) return;
    scope.querySelectorAll('[data-tilt]').forEach(function (el) {
      var raf = 0;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.x) / r.width - 0.5;
        var py = (e.clientY - r.y) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
          el.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
          el.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
          el.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
        });
      });
      el.addEventListener('pointerleave', function () {
        cancelAnimationFrame(raf);
        ['--rx', '--ry', '--gx', '--gy'].forEach(function (p) { el.style.removeProperty(p); });
      });
    });
  }

  // Scroll motion: content is always visible; it only glides into place.
  function reveal(scope) {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var els = scope.querySelectorAll('[data-reveal], .section-head, .store-tile, .cat-tile, .grid .card');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('revealed'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el, i) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('reveal');
      el.style.setProperty('--delay', (i % 4) * 60 + 'ms');
      io.observe(el);
    });
  }

  // Hero parallax for the floating product tiles.
  function heroParallax(scope) {
    var hero = scope.querySelector('.hero');
    var stage = scope.querySelector('.hero-stage');
    if (!hero || !stage || !finePointer || reduceMotion) return;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      stage.style.setProperty('--px', ((e.clientX - r.x) / r.width - 0.5).toFixed(3));
      stage.style.setProperty('--py', ((e.clientY - r.y) / r.height - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', function () { stage.style.removeProperty('--px'); stage.style.removeProperty('--py'); });
  }

  /* ---- 3D hero: a chrome 4-point star with orbiting rings (three.js) ---- */
  var hero3dHandle = null;
  function hero3d(scope) {
    if (hero3dHandle) { hero3dHandle.stop(); hero3dHandle = null; }
    var canvas = scope.querySelector('.hero-3d');
    var THREE = window.THREE;
    if (!canvas || !THREE) return;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); }
    catch (e) { return; } // no WebGL: the CSS tiles remain
    canvas.classList.add('on');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    // Chrome look without an environment map: a painted matcap (silver -> ice blue -> violet).
    var mc = document.createElement('canvas');
    mc.width = mc.height = 256;
    var g = mc.getContext('2d');
    var grad = g.createRadialGradient(96, 86, 8, 128, 128, 128);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.22, '#e9eef8'); grad.addColorStop(0.45, '#9fd8ff');
    grad.addColorStop(0.68, '#c7cfdd'); grad.addColorStop(0.86, '#a78bfa'); grad.addColorStop(1, '#141826');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    g.globalAlpha = 0.5; g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(170, 180, 30, 12, -0.6, 0, Math.PI * 2); g.fill();
    var chrome = new THREE.MeshMatcapMaterial({ matcap: new THREE.CanvasTexture(mc) });

    var s = new THREE.Shape();
    s.moveTo(0, 1.7);
    s.quadraticCurveTo(0.2, 0.2, 1.7, 0);
    s.quadraticCurveTo(0.2, -0.2, 0, -1.7);
    s.quadraticCurveTo(-0.2, -0.2, -1.7, 0);
    s.quadraticCurveTo(-0.2, 0.2, 0, 1.7);
    var starGeo = new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.09, bevelSegments: 8, curveSegments: 32 });
    starGeo.center();
    var group = new THREE.Group();
    var star = new THREE.Mesh(starGeo, chrome);
    group.add(star);
    var ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.04, 16, 160), chrome);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.025, 16, 160), chrome);
    ring1.rotation.x = 1.15; ring2.rotation.x = 1.45; ring2.rotation.y = 0.5;
    group.add(ring1, ring2);
    var orbs = [];
    for (var i = 0; i < 7; i++) {
      var o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 + (i % 3) * 0.04, 3), chrome);
      o.userData = { a: (i / 7) * Math.PI * 2, r: 2.45 + (i % 2) * 0.4, sp: 0.35 + (i % 3) * 0.12 };
      orbs.push(o); group.add(o);
    }
    scene.add(group);

    var px = 0, py = 0, tx = 0, ty = 0, raf = 0, running = true, visible = true;
    var dir = isRTL() ? -1 : 1; // spin and orbit reverse in RTL
    function size() {
      var w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function frame(t) {
      t = (t || 0) / 1000;
      px += (tx - px) * 0.06; py += (ty - py) * 0.06;
      star.rotation.y = t * 0.6 * dir;
      star.rotation.z = Math.sin(t * 0.5) * 0.15;
      ring1.rotation.z = t * 0.25 * dir;
      ring2.rotation.z = -t * 0.18 * dir;
      orbs.forEach(function (o) {
        var a = o.userData.a + t * o.userData.sp * dir;
        o.position.set(Math.cos(a) * o.userData.r, Math.sin(a * 1.3) * 0.5, Math.sin(a) * o.userData.r * 0.4);
      });
      group.rotation.x = py * 0.5;
      group.rotation.y = px * 0.7;
      group.position.y = Math.sin(t * 0.9) * 0.12;
      renderer.render(scene, camera);
    }
    function loop(t) { if (!running) return; if (visible) frame(t); raf = requestAnimationFrame(loop); }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { size(); if (reduceMotion) frame(1800); }) : null;
    if (ro) ro.observe(canvas);
    size();
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }) : null;
    if (io) io.observe(canvas);
    function onMove(e) { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; }
    if (reduceMotion) frame(1800);
    else { window.addEventListener('pointermove', onMove); raf = requestAnimationFrame(loop); }
    hero3dHandle = {
      stop: function () {
        running = false; cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onMove);
        if (ro) ro.disconnect(); if (io) io.disconnect();
        renderer.dispose();
      }
    };
  }

  function enhance(scope, token, onFilter) {
    carousels(scope);
    var f = filters(scope, token, onFilter);
    tilt(scope);
    reveal(scope);
    heroParallax(scope);
    hero3d(scope);
    scope.querySelectorAll('img').forEach(function (img) { if (img.complete && img.naturalWidth === 0 && img.src) imgFail(img); });
    return f;
  }

  /* ================= Static pages ================= */
  var dataEl = document.getElementById('drape-data');
  if (!dataEl) {
    try { strings = JSON.parse(document.getElementById('i18n').textContent); } catch (e) { strings = {}; }
    var f = enhance(document, decodeURIComponent((location.hash || '').slice(1)));
    if (f) window.addEventListener('hashchange', function () { f.select(decodeURIComponent(location.hash.slice(1))); });
    return;
  }

  /* ================= Single-page app ================= */
  var DATA = JSON.parse(dataEl.textContent);
  var products = DATA.products.slice();
  var codes = DATA.languages.map(function (l) { return l.code; });
  var LANG = {};
  DATA.languages.forEach(function (l) { LANG[l.code] = l; });
  var caps = { db: null, user: null, isOwner: false, uid: null, ready: false };
  var R = window.DrapeRender.create({
    mode: 'spa', languages: DATA.languages, dicts: DATA.dicts, stores: DATA.stores,
    products: function () { return products; },
    showAdmin: function () { return caps.isOwner; },
    year: DATA.site.year, privacyUpdated: DATA.site.privacyUpdated, contactEmail: DATA.site.contactEmail
  });
  var app = document.getElementById('app');
  var lastKey = null;

  function stringsFor(lang) {
    var forms = R.get(lang, 'shop.results');
    var res = {};
    Object.keys(forms).forEach(function (k) { res[k] = R.isolate(lang, R.esc(forms[k])); });
    return { results: res, priceValue: R.isolate(lang, R.esc(R.get(lang, 'shop.price_value'))), imgError: R.get(lang, 'error.img') };
  }
  function defaultLang() {
    try { var saved = localStorage.getItem(LANG_KEY); if (codes.indexOf(saved) > -1) return saved; } catch (e) { /* ignore */ }
    var prefs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < prefs.length; i++) { var c = String(prefs[i]).toLowerCase().split('-')[0]; if (codes.indexOf(c) > -1) return c; }
    return 'en';
  }
  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (codes.indexOf(parts[0]) === -1) return null;
    return { lang: parts[0], page: parts[1] || 'home', arg: parts.slice(2).join('/') || null };
  }
  function routeHash(lang, r) { return '#/' + lang + (r.page === 'home' ? '' : '/' + r.page) + (r.arg ? '/' + r.arg : ''); }
  function setMeta(name, value) {
    var m = document.head.querySelector('meta[name="' + name + '"]');
    if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); }
    m.content = value;
  }

  function render() {
    var r = parseRoute();
    if (!r) { location.replace('#/' + defaultLang()); return; }
    var L = LANG[r.lang];
    // Global direction and language, from the language config.
    root.lang = L.htmlLang; root.dir = L.dir; root.setAttribute('data-lang', L.code);
    strings = stringsFor(r.lang);
    var pg;
    if (r.page === 'admin') pg = { current: 'admin', title: R.get(r.lang, 'admin.title') + ' | Drape', desc: R.get(r.lang, 'admin.title'), body: '<div class="wrap admin" id="admin-root"></div>' };
    else pg = R.page(r.lang, r, '');
    document.title = pg.title;
    setMeta('description', pg.desc);
    document.head.querySelectorAll('link[data-hreflang]').forEach(function (l) { l.remove(); });
    var alternates = {};
    DATA.languages.forEach(function (x) {
      alternates[x.code] = routeHash(x.code, r);
      var l = document.createElement('link');
      l.rel = 'alternate'; l.hreflang = x.htmlLang; l.href = alternates[x.code]; l.setAttribute('data-hreflang', '');
      document.head.appendChild(l);
    });
    var xd = document.createElement('link');
    xd.rel = 'alternate'; xd.hreflang = 'x-default'; xd.href = '#/'; xd.setAttribute('data-hreflang', '');
    document.head.appendChild(xd);

    var key = r.lang + '/' + r.page + '/' + (r.page === 'shop' ? '' : r.arg || '');
    app.innerHTML = '<a class="skip" href="#main" data-skip>' + R.t(r.lang, 'nav.skip') + '</a>' +
      R.header(r.lang, '', pg.current, alternates) +
      '<main id="main" tabindex="-1">' + pg.body + '</main>' +
      R.footer(r.lang, '', alternates);
    enhance(app, r.page === 'shop' ? r.arg : null);
    if (r.page === 'admin' && window.DrapeAdmin) window.DrapeAdmin.mount(document.getElementById('admin-root'), adminApi(r.lang));
    if (key !== lastKey) {
      if (lastKey !== null) { window.scrollTo(0, 0); var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true }); }
      if (r.page === 'product' && !pg.notFound) Stats.bump('views', r.arg, r.lang);
    }
    lastKey = key;
  }

  app.addEventListener('click', function (e) {
    var skip = e.target.closest('[data-skip]');
    if (skip) { e.preventDefault(); document.getElementById('main').focus(); return; }
    var a = e.target.closest('a.aff');
    if (a) { var r = parseRoute(); Stats.bump('clicks', a.getAttribute('data-pid'), r ? r.lang : '', a.getAttribute('data-store')); }
  });
  window.addEventListener('hashchange', render);

  /* ---- Stats: each viewer keeps one counters document (stats/<their id>) ---- */
  var Stats = (function () {
    var ref = null, data = null, queue = [], timer = 0, writing = false, again = false, off = false;
    function today() { return new Date().toISOString().slice(0, 10); }
    function apply(ev) {
      var d = data;
      d[ev.kind][ev.pid] = (d[ev.kind][ev.pid] || 0) + 1;
      var day = d.days[today()] || (d.days[today()] = { v: 0, c: 0 });
      if (ev.kind === 'views') { day.v++; if (ev.lang) d.langs[ev.lang] = (d.langs[ev.lang] || 0) + 1; }
      else { day.c++; if (ev.store) d.stores[ev.store] = (d.stores[ev.store] || 0) + 1; }
      var keys = Object.keys(d.days).sort();
      while (keys.length > 90) delete d.days[keys.shift()];
    }
    function flush() {
      if (off || !ref) return;
      if (writing) { again = true; return; }
      writing = true;
      data.updated = new Date().toISOString();
      ref.set(data).catch(function (e) {
        if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted' || e.code === 'quota_exceeded')) off = true;
      }).then(function () { writing = false; if (again) { again = false; schedule(); } });
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(flush, 1500); }
    return {
      start: function (db, uid) {
        if (!db || !uid) { off = true; return; }
        ref = db.doc('stats/' + uid);
        ref.get().then(function (snap) {
          data = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : {};
          ['views', 'clicks', 'langs', 'stores', 'days'].forEach(function (k) { if (!data[k] || typeof data[k] !== 'object') data[k] = {}; });
          queue.forEach(apply); if (queue.length) schedule(); queue = [];
        }).catch(function () { off = true; });
      },
      stop: function () { off = true; queue = []; },
      bump: function (kind, pid, lang, store) {
        if (off || !pid) return;
        var ev = { kind: kind, pid: pid, lang: lang, store: store };
        if (!data) { if (queue.length < 50) queue.push(ev); return; }
        apply(ev); schedule();
      }
    };
  })();

  /* ---- Self-publishing: the catalog lives in the page itself ---- */
  var RESET = ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';
  function publishCatalog(list) {
    return window.claude.use('artifact').then(function (art) {
      if (!art) throw { code: 'unavailable' };
      var data = Object.assign({}, DATA, { products: list });
      var shell = window.DRAPE_SHELL;
      var frag = shell.head + '<script id="drape-data" type="application/json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</scr' + 'ipt>' + shell.tail;
      var doc = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' + RESET + '</style></head><body>' + frag + '</body></html>';
      try { sessionStorage.setItem('drape-return', location.hash); } catch (e) { /* ignore */ }
      return art.publish(doc).then(function () { products = list.slice(); });
    });
  }

  function adminApi(lang) {
    return {
      lang: lang, R: R, data: DATA, caps: caps,
      products: function () { return products; },
      publish: publishCatalog,
      use: function (name) { return window.claude && window.claude.use ? window.claude.use(name) : Promise.resolve(null); },
      rerender: render
    };
  }

  /* ---- Boot ---- */
  try { var back = sessionStorage.getItem('drape-return'); if (back) { sessionStorage.removeItem('drape-return'); if (!location.hash) location.replace(back); } } catch (e) { /* ignore */ }
  var hasRuntime = !!(window.claude && typeof window.claude.use === 'function');
  caps.runtime = hasRuntime;
  if (!hasRuntime) { caps.ready = true; Stats.stop(); }
  render();
  if (!hasRuntime) return;
  Promise.all([window.claude.use('user'), window.claude.use('db')]).then(function (res) {
    caps.user = res[0]; caps.db = res[1];
    if (!caps.user) return [false, null];
    return Promise.all([caps.user.isOwner(), caps.user.id()]);
  }).then(function (r) {
    caps.isOwner = !!r[0]; caps.uid = r[1]; caps.ready = true;
    if (caps.isOwner) Stats.stop(); // the owner's own browsing is not counted
    else Stats.start(caps.db, caps.uid);
    var route = parseRoute();
    if (caps.isOwner || (route && route.page === 'admin')) render();
  }).catch(function () { caps.ready = true; Stats.stop(); });
})();
