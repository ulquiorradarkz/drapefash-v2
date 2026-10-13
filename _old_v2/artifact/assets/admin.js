/* Drape dashboard (single-page app only, owner only).
 * Overview: statistics aggregated from stats/<viewer id> documents (db capability).
 * Products: edit, delete, toggle "home page"; every change republishes the page (artifact capability).
 * Add: paste a store link -> store detected; drop/paste a photo; Claude (sample capability) writes
 *      the name and description in all 7 languages, picks the category, and reads a visible price. */
(function () {
  'use strict';
  var CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'MAD', 'DZD', 'EGP', 'INR', 'BDT', 'CNY'];
  var tab = 'overview';
  try { tab = sessionStorage.getItem('drape-admin-tab') || 'overview'; } catch (e) { /* ignore */ }
  var draft = null;     // the add/edit form state survives re-renders
  var statsCache = null;

  function mount(el, api) {
    if (!el) return;
    var lang = api.lang, R = api.R, data = api.data, caps = api.caps;
    var LANGS = data.languages;
    var t = function (k, v) { return R.t(lang, 'admin.' + k, v); };
    var ta = function (k, v) { return R.ta(lang, 'admin.' + k, v); };
    var esc = R.esc;
    var isRTL = document.documentElement.dir === 'rtl';
    var STORE = R.STORE;

    function notice(msg) { el.innerHTML = '<div class="page-head"><h1 class="chrome-text">' + t('title') + '</h1></div><p class="notice admin-notice">' + msg + '</p>'; }
    if (!caps.ready) return notice(t('loading'));
    if (!caps.runtime) return notice(t('need_claude'));
    if (!caps.isOwner) return notice(t('owner_only'));

    var I = window.DrapeIcons;
    var tabs = [['overview', I.chart(), t('tab_overview')], ['products', I.list(), t('tab_products')], ['add', I.plus(), t('tab_add')]];
    el.innerHTML =
      '<div class="page-head admin-head"><h1 class="chrome-text">' + t('title') + '</h1></div>' +
      '<div class="admin-tabs" role="tablist">' + tabs.map(function (x) {
        return '<button type="button" role="tab" id="tab-' + x[0] + '" aria-controls="panel" aria-selected="' + (tab === x[0]) + '" data-tab="' + x[0] + '">' + x[1] + '<span>' + x[2] + '</span></button>';
      }).join('') + '</div>' +
      '<section class="admin-panel" id="panel" role="tabpanel" aria-labelledby="tab-' + tab + '"></section>';
    var panel = el.querySelector('#panel');
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-tab')); });
    });
    function go(name) {
      tab = name;
      try { sessionStorage.setItem('drape-admin-tab', name); } catch (e) { /* ignore */ }
      mount(el, api);
    }

    if (tab === 'products') renderProducts();
    else if (tab === 'add') renderForm();
    else renderOverview();

    /* ======================= Overview ======================= */
    function renderOverview() {
      panel.innerHTML = '<p class="admin-status">' + t('loading') + '</p>';
      var p = statsCache ? Promise.resolve(statsCache) : (caps.db ? caps.db.collection('stats').get().then(aggregate) : Promise.resolve(aggregate({ docs: [] })));
      p.then(function (s) { statsCache = s; drawOverview(s); })
        .catch(function () { drawOverview(aggregate({ docs: [] })); });
    }
    function aggregate(snap) {
      var s = { views: {}, clicks: {}, langs: {}, stores: {}, days: {}, totalV: 0, totalC: 0 };
      snap.docs.forEach(function (d) {
        var x = d.data() || {};
        ['views', 'clicks', 'langs', 'stores'].forEach(function (k) {
          Object.keys(x[k] || {}).forEach(function (id) { s[k][id] = (s[k][id] || 0) + (Number(x[k][id]) || 0); });
        });
        Object.keys(x.days || {}).forEach(function (day) {
          var a = s.days[day] || (s.days[day] = { v: 0, c: 0 });
          a.v += Number(x.days[day].v) || 0; a.c += Number(x.days[day].c) || 0;
        });
      });
      Object.keys(s.views).forEach(function (k) { s.totalV += s.views[k]; });
      Object.keys(s.clicks).forEach(function (k) { s.totalC += s.clicks[k]; });
      return s;
    }
    function num(n) { return '<bdi dir="ltr">' + Number(n).toLocaleString('en-US') + '</bdi>'; }
    function drawOverview(s) {
      var list = api.products();
      var ctr = s.totalV ? Math.round((s.totalC / s.totalV) * 1000) / 10 + '%' : '–';
      var kpis = [['kpi_products', num(list.length)], ['kpi_views', num(s.totalV)], ['kpi_clicks', num(s.totalC)], ['kpi_ctr', '<bdi dir="ltr">' + ctr + '</bdi>']];
      var html = '<div class="kpis">' + kpis.map(function (k) { return '<div class="kpi"><span>' + t(k[0]) + '</span><strong>' + k[1] + '</strong></div>'; }).join('') + '</div>';
      html += '<div class="admin-grid">';
      html += '<section class="admin-card admin-chart"><h2>' + t('chart_title') + '</h2>' + chart(s) +
        '<p class="legend"><span class="sw sw-v"></span>' + t('legend_views') + '<span class="sw sw-c"></span>' + t('legend_clicks') + '</p></section>';
      var top = list.slice().sort(function (a, b) { return (s.clicks[b.id] || 0) - (s.clicks[a.id] || 0) || (s.views[b.id] || 0) - (s.views[a.id] || 0); }).slice(0, 6);
      html += '<section class="admin-card"><h2>' + t('top_title') + '</h2>' + (s.totalV + s.totalC === 0 ? '<p class="muted">' + t('no_stats') + '</p>' :
        '<ol class="top-list">' + top.map(function (p) {
          return '<li><img src="' + esc(R.asset('', p.image)) + '" alt="" width="40" height="50"><span class="tl-name">' + esc(p.name[lang]) + '</span><span class="tl-num" title="' + ta('col_views') + '">' + num(s.views[p.id] || 0) + '</span><span class="tl-num tl-c" title="' + ta('col_clicks') + '">' + num(s.clicks[p.id] || 0) + '</span></li>';
        }).join('') + '</ol>') + '</section>';
      html += '<section class="admin-card"><h2>' + t('by_store') + '</h2>' + bars(data.stores.map(function (st) { return [R.storeLogo('', st, 'store-logo store-logo-sm'), s.stores[st.id] || 0]; })) + '</section>';
      html += '<section class="admin-card"><h2>' + t('by_lang') + '</h2>' + bars(LANGS.map(function (l) { return ['<span lang="' + l.htmlLang + '" dir="' + l.dir + '">' + l.name + '</span>', s.langs[l.code] || 0]; })) + '</section>';
      html += '</div><p class="admin-note">' + I.info() + '<span>' + t('stats_note') + '</span></p>';
      panel.innerHTML = html;
    }
    function bars(rows) {
      var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
      return '<ul class="hbars">' + rows.map(function (r) {
        return '<li><span class="hb-label">' + r[0] + '</span><span class="hb-track"><span class="hb-fill" style="inline-size:' + Math.round((r[1] / max) * 100) + '%"></span></span><span class="hb-num">' + num(r[1]) + '</span></li>';
      }).join('') + '</ul>';
    }
    function chart(s) {
      var days = [];
      for (var i = 13; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5); days.push(d.toISOString().slice(0, 10)); }
      var max = Math.max.apply(null, days.map(function (d) { var x = s.days[d] || {}; return Math.max(x.v || 0, x.c || 0); }).concat([1]));
      var W = 700, H = 220, padB = 28, padT = 12, slot = W / 14, bw = slot * 0.3;
      var g = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + ta('chart_title') + '">';
      [0.5, 1].forEach(function (f) { var y = padT + (H - padB - padT) * (1 - f); g += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="grid-line"/>'; });
      days.forEach(function (d, i) {
        var x0 = (isRTL ? 13 - i : i) * slot + slot * 0.18; // time runs with reading direction
        var v = (s.days[d] || {}).v || 0, c = (s.days[d] || {}).c || 0;
        var hv = (H - padB - padT) * v / max, hc = (H - padB - padT) * c / max;
        g += '<rect class="bar-v" x="' + x0 + '" y="' + (H - padB - hv) + '" width="' + bw + '" height="' + Math.max(hv, 1) + '" rx="3"/>';
        g += '<rect class="bar-c" x="' + (x0 + bw + 3) + '" y="' + (H - padB - hc) + '" width="' + bw + '" height="' + Math.max(hc, 1) + '" rx="3"/>';
        g += '<text x="' + (x0 + bw) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.slice(8) + '</text>';
      });
      return g + '</svg>';
    }

    /* ======================= Products ======================= */
    function renderProducts() {
      var list = api.products();
      if (!list.length) { panel.innerHTML = '<p class="muted">' + t('empty_products') + '</p>'; return; }
      panel.innerHTML = '<p class="admin-note">' + I.info() + '<span>' + t('publish_note') + '</span></p><p class="admin-status" id="pstatus" aria-live="polite"></p>' +
        '<ul class="prod-list">' + list.map(function (p) {
          var st = STORE[p.store] || { name: p.store };
          return '<li class="prod-row" data-id="' + esc(p.id) + '">' +
            '<img src="' + esc(R.asset('', p.image)) + '" alt="" width="56" height="70">' +
            '<div class="pr-main"><strong>' + esc(p.name[lang]) + '</strong><span class="pr-meta">' + R.storeLogo('', st, 'store-logo store-logo-sm') + '<span>' + R.t(lang, 'cat.' + p.category) + '</span>' + R.priceHTML(p) + '</span></div>' +
            '<label class="opt pr-feat"><input type="checkbox" data-feat' + (p.featured ? ' checked' : '') + '><span>' + t('col_featured') + '</span></label>' +
            '<div class="pr-actions"><button type="button" class="mini-btn" data-edit>' + I.pencil() + '<span>' + t('edit') + '</span></button>' +
            '<button type="button" class="mini-btn danger" data-del>' + I.trash() + '<span>' + t('delete') + '</span></button></div>' +
            '<div class="pr-confirm" hidden><span>' + t('confirm_delete') + '</span><button type="button" class="mini-btn danger" data-yes>' + t('yes_delete') + '</button><button type="button" class="mini-btn" data-no>' + t('cancel') + '</button></div>' +
            '</li>';
        }).join('') + '</ul>';
      var status = panel.querySelector('#pstatus');
      function publish(next) {
        status.textContent = t('saving');
        panel.querySelectorAll('button, input').forEach(function (b) { b.disabled = true; });
        api.publish(next).then(function () { status.textContent = t('saved'); statsCache = null; api.rerender(); })
          .catch(function () { status.textContent = t('save_error'); panel.querySelectorAll('button, input').forEach(function (b) { b.disabled = false; }); });
      }
      panel.querySelectorAll('.prod-row').forEach(function (row) {
        var id = row.getAttribute('data-id');
        row.querySelector('[data-edit]').addEventListener('click', function () {
          var p = api.products().find(function (x) { return x.id === id; });
          draft = JSON.parse(JSON.stringify(p)); draft.editing = true;
          go('add');
        });
        var confirm = row.querySelector('.pr-confirm');
        row.querySelector('[data-del]').addEventListener('click', function () { confirm.hidden = false; confirm.querySelector('[data-no]').focus(); });
        confirm.querySelector('[data-no]').addEventListener('click', function () { confirm.hidden = true; });
        confirm.querySelector('[data-yes]').addEventListener('click', function () {
          publish(api.products().filter(function (x) { return x.id !== id; }));
        });
        row.querySelector('[data-feat]').addEventListener('change', function (e) {
          var on = e.target.checked;
          publish(api.products().map(function (x) { return x.id === id ? Object.assign({}, x, { featured: on }) : x; }));
        });
      });
    }

    /* ======================= Add / edit ======================= */
    function blank() {
      var d = { id: '', store: '', category: '', price: '', currency: 'USD', image: '', affiliate_url: '', featured: false, name: {}, description: {} };
      LANGS.forEach(function (l) { d.name[l.code] = ''; d.description[l.code] = ''; });
      return d;
    }
    function detectStore(url) {
      try {
        var h = new URL(url).hostname.toLowerCase();
        for (var i = 0; i < data.stores.length; i++) {
          var s = data.stores[i];
          if (s.domains.some(function (d) { return h === d || h.slice(-(d.length + 1)) === '.' + d; })) return s.id;
        }
      } catch (e) { /* not a URL yet */ }
      return '';
    }
    function linkWords(url) {
      try {
        var segs = new URL(url).pathname.split('/').map(decodeURIComponent).filter(function (s) { return /[a-z]{3}/i.test(s); });
        var best = segs.sort(function (a, b) { return b.length - a.length; })[0] || '';
        return best.replace(/-p-\d+.*$/i, '').replace(/\.html?$/i, '').replace(/[-_+]+/g, ' ').replace(/\b\d{5,}\b/g, '').trim().slice(0, 120);
      } catch (e) { return ''; }
    }
    function compress(file) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          var max = 900, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * k); c.height = Math.round(h * k);
          var g = c.getContext('2d');
          g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          var q = 0.85, out = c.toDataURL('image/jpeg', q);
          while (out.length > 220000 && q > 0.45) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
          URL.revokeObjectURL(url);
          resolve(out);
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
        img.src = url;
      });
    }

    function renderForm() {
      if (!draft) draft = blank();
      var d = draft;
      var storeOpts = data.stores.map(function (s) { return '<option value="' + s.id + '"' + (d.store === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('');
      var catOpts = R.CATEGORIES.map(function (c) { return '<option value="' + c + '"' + (d.category === c ? ' selected' : '') + '>' + R.t(lang, 'cat.' + c) + '</option>'; }).join('');
      var curOpts = CURRENCIES.map(function (c) { return '<option' + (d.currency === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
      var langBlocks = LANGS.map(function (l) {
        return '<fieldset class="lang-block" lang="' + l.htmlLang + '" dir="' + l.dir + '"><legend>' + l.name + ' <span class="code" dir="ltr">' + l.code.toUpperCase() + '</span></legend>' +
          '<label class="field-label" for="n-' + l.code + '" lang="' + document.documentElement.lang + '" dir="' + document.documentElement.dir + '">' + t('name') + '</label>' +
          '<input class="input plain" id="n-' + l.code + '" data-name="' + l.code + '" value="' + esc(d.name[l.code] || '') + '" maxlength="80">' +
          '<label class="field-label" for="d-' + l.code + '" lang="' + document.documentElement.lang + '" dir="' + document.documentElement.dir + '">' + t('description') + '</label>' +
          '<textarea class="input plain" id="d-' + l.code + '" data-desc="' + l.code + '" rows="2" maxlength="300">' + esc(d.description[l.code] || '') + '</textarea></fieldset>';
      }).join('');
      panel.innerHTML =
        '<form class="add-form" id="add-form" novalidate>' +
        '<p class="admin-note">' + I.info() + '<span>' + t('extract_note') + '</span></p>' +
        '<div class="add-grid">' +
        '<div class="add-col">' +
        '<div class="field"><label class="field-label" for="a-link">' + t('link') + '</label><input class="input plain" id="a-link" type="url" inputmode="url" dir="ltr" placeholder="https://" value="' + esc(d.affiliate_url) + '"><small class="hint">' + t('link_hint') + '</small>' +
        '<div class="store-detect" id="a-store-row"></div></div>' +
        '<div class="field"><span class="field-label" id="a-photo-label">' + t('photo') + '</span>' +
        '<div class="dropzone" id="a-drop" tabindex="0" role="button" aria-labelledby="a-photo-label">' +
        (d.image ? '<img src="' + esc(R.asset('', d.image)) + '" alt="" id="a-preview">' : I.image()) +
        '<span>' + t('photo_choose') + '</span></div><input type="file" id="a-file" accept="image/*" hidden><small class="hint">' + t('photo_hint') + '</small></div>' +
        '<div class="field-row">' +
        '<div class="field"><label class="field-label" for="a-price">' + t('price') + '</label><input class="input plain" id="a-price" type="number" min="0" step="0.01" dir="ltr" value="' + esc(d.price) + '"></div>' +
        '<div class="field"><label class="field-label" for="a-cur">' + t('currency') + '</label><span class="select"><select id="a-cur" dir="ltr">' + curOpts + '</select>' + I.chevronDown() + '</span></div>' +
        '</div>' +
        '<div class="field"><label class="field-label" for="a-cat">' + t('category') + '</label><span class="select"><select id="a-cat"><option value=""></option>' + catOpts + '</select>' + I.chevronDown() + '</span></div>' +
        '<label class="opt"><input type="checkbox" id="a-feat"' + (d.featured ? ' checked' : '') + '><span>' + t('featured') + '</span></label>' +
        '<div class="autofill"><button type="button" class="btn btn-ghost" id="a-auto">' + I.magic() + t('autofill') + '</button><p class="admin-status" id="a-auto-status" aria-live="polite"></p></div>' +
        '</div>' +
        '<div class="add-col"><h2 class="add-h">' + t('names_title') + '</h2>' + langBlocks + '</div>' +
        '</div>' +
        '<div class="save-bar"><p class="admin-status" id="a-status" aria-live="polite"></p><small class="hint">' + t('publish_note') + '</small>' +
        '<button type="submit" class="btn btn-chrome" id="a-save">' + t('save') + '</button></div>' +
        '</form>';

      var form = panel.querySelector('#add-form');
      var link = form.querySelector('#a-link');
      var storeRow = form.querySelector('#a-store-row');
      var drop = form.querySelector('#a-drop');
      var file = form.querySelector('#a-file');

      function showStore() {
        var detected = detectStore(link.value);
        if (detected) d.store = detected;
        var s = STORE[d.store];
        if (detected && s) storeRow.innerHTML = '<span class="chip">' + R.storeLogo('', s, 'store-logo store-logo-sm') + t('store_detected', { store: R.ltr(esc(s.name)) }) + '</span>';
        else if (link.value.trim()) {
          storeRow.innerHTML = '<label class="field-label" for="a-store">' + t('store_unknown') + '</label><span class="select"><select id="a-store"><option value=""></option>' + storeOpts + '</select>' + I.chevronDown() + '</span>';
          storeRow.querySelector('#a-store').addEventListener('change', function (e) { d.store = e.target.value; });
        } else storeRow.innerHTML = '';
      }
      link.addEventListener('input', function () { d.affiliate_url = link.value.trim(); showStore(); });
      showStore();

      function takeFile(f) {
        if (!f || !/^image\//.test(f.type)) return;
        d._blob = f;
        compress(f).then(function (url) {
          d.image = url;
          drop.innerHTML = '<img src="' + url + '" alt="" id="a-preview"><span>' + t('photo_choose') + '</span>';
        }).catch(function () { /* unreadable image: keep the drop zone */ });
      }
      drop.addEventListener('click', function () { file.click(); });
      drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
      file.addEventListener('change', function () { takeFile(file.files[0]); });
      drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
      drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); takeFile(e.dataTransfer.files[0]); });
      form.addEventListener('paste', function (e) {
        var items = (e.clipboardData && e.clipboardData.files) || [];
        if (items.length && /^image\//.test(items[0].type)) { e.preventDefault(); takeFile(items[0]); }
      });

      form.querySelector('#a-price').addEventListener('input', function (e) { d.price = e.target.value; });
      form.querySelector('#a-cur').addEventListener('change', function (e) { d.currency = e.target.value; });
      form.querySelector('#a-cat').addEventListener('change', function (e) { d.category = e.target.value; });
      form.querySelector('#a-feat').addEventListener('change', function (e) { d.featured = e.target.checked; });
      form.querySelectorAll('[data-name]').forEach(function (i) { i.addEventListener('input', function () { d.name[i.getAttribute('data-name')] = i.value; }); });
      form.querySelectorAll('[data-desc]').forEach(function (i) { i.addEventListener('input', function () { d.description[i.getAttribute('data-desc')] = i.value; }); });

      /* ---- Claude auto-fill ---- */
      var autoBtn = form.querySelector('#a-auto');
      var autoStatus = form.querySelector('#a-auto-status');
      api.use('sample').then(function (sample) {
        if (!sample) { autoBtn.disabled = true; autoStatus.textContent = t('autofill_unavailable'); return; }
        autoBtn.addEventListener('click', function () {
          autoBtn.disabled = true;
          autoStatus.textContent = t('autofill_busy');
          var s = STORE[d.store];
          var prompt = [
            'You are filling in a product listing for Drape, an affiliate shop for cyber Y2K streetwear.',
            'Store: ' + (s ? s.name : 'unknown') + '. Product link: ' + (d.affiliate_url || 'none') + '. Words from the link: "' + linkWords(d.affiliate_url) + '".',
            d._blob ? 'The attached image is the product photo or a screenshot of the product page.' : 'There is no image; use the link words.',
            'Reply with only one JSON object, no other text:',
            '{"category": one of "tops","bottoms","outerwear","footwear","accessories",',
            ' "price": number or null (only if a price is clearly visible in the image),',
            ' "currency": ISO 4217 code or null,',
            ' "name": {"en","zh","hi","es","fr","ar","bn"},',
            ' "description": {"en","zh","hi","es","fr","ar","bn"}}',
            'Names: 2 to 5 words, the kind of garment plus its standout detail; no store name, no sizes, no marketing filler.',
            'Descriptions: one sentence, 12 to 20 words, concrete (material, cut, details you can see).',
            'zh = Simplified Chinese, hi = Hindi in Devanagari, bn = Bengali, ar = Modern Standard Arabic, es = Spanish, fr = French. Use Latin digits (0-9) in every language.'
          ].join('\n');
          var opts = {};
          var go2 = function (withImage) {
            if (withImage) opts.images = [d._blob];
            return sample.json(prompt, opts);
          };
          sample.limits().catch(function () { return {}; }).then(function (lim) {
            return go2(!!(d._blob && lim && lim.images));
          }).then(function (out) {
            if (!out || typeof out !== 'object') throw { code: 'invalid_json' };
            if (R.CATEGORIES.indexOf(out.category) > -1) d.category = out.category;
            if (typeof out.price === 'number' && out.price > 0 && !String(d.price).trim()) { d.price = out.price; if (out.currency && CURRENCIES.indexOf(out.currency) > -1) d.currency = out.currency; }
            LANGS.forEach(function (l) {
              if (out.name && typeof out.name[l.code] === 'string') d.name[l.code] = out.name[l.code].trim();
              if (out.description && typeof out.description[l.code] === 'string') d.description[l.code] = out.description[l.code].trim();
            });
            renderForm();
            panel.querySelector('#a-auto-status').textContent = t('autofill_done');
          }).catch(function (e) {
            autoBtn.disabled = false;
            autoStatus.textContent = e && (e.code === 'not_granted' || e.code === 'sampling_disabled') ? t('autofill_unavailable') : t('autofill_error');
          });
        });
      });

      /* ---- Save = republish the page with the new catalog ---- */
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = form.querySelector('#a-status');
        var price = Number(d.price);
        var complete = /^https:\/\//.test(d.affiliate_url) && d.store && d.image && price > 0 && d.category &&
          LANGS.every(function (l) { return (d.name[l.code] || '').trim() && (d.description[l.code] || '').trim(); });
        if (!complete) { status.textContent = t('missing'); return; }
        var item = {
          id: d.editing ? d.id : 'u' + Date.now().toString(36),
          store: d.store, category: d.category, price: price, currency: d.currency, image: d.image,
          affiliate_url: d.affiliate_url, featured: !!d.featured,
          name: Object.assign({}, d.name), description: Object.assign({}, d.description)
        };
        var list = api.products();
        var next = d.editing ? list.map(function (x) { return x.id === item.id ? item : x; }) : [item].concat(list);
        status.textContent = t('saving');
        form.querySelector('#a-save').disabled = true;
        api.publish(next).then(function () {
          draft = null; status.textContent = t('saved');
        }).catch(function () {
          status.textContent = t('save_error');
          form.querySelector('#a-save').disabled = false;
        });
      });
    }
  }

  window.DrapeAdmin = { mount: mount };
})();
