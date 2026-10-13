# Drape

Drape is a multilingual affiliate storefront for cyber Y2K streetwear picked from **AliExpress, SHEIN and Bulchic**. It has no checkout and no stock: every "Shop" button sends the visitor to the store through your affiliate link.

- 7 languages: English, Mandarin, Hindi, Spanish, French, Arabic (full RTL) and Bengali
- Pages: Home, Shop (filters: category, store, max price; search; sort), Product detail, About, Affiliate disclosure, Privacy, 404, and a **Dashboard** for the owner
- Effects: a WebGL chrome star in the hero (three.js), 3D tilt with light glare on cards, a store-logo marquee, chrome headline shimmer, and scroll motion. Everything reverses direction in Arabic and switches off with "reduce motion".

## Two builds from one codebase

| Output | What it is | Where it runs |
|---|---|---|
| `artifact/` | Single-page app (`#/ar/shop`), with dashboard, statistics and in-page catalog | The live claude.ai link |
| `dist/` | Static multi-page site (`/ar/shop/`), with hreflang and canonical links | Any static host (Netlify, Vercel, GitHub Pages…) |

Both builds use the same templates (`src/render.js`), styles and translations.

```bash
npm run build     # validate data, then write dist/ and artifact/
npm run check     # static acceptance checks on dist/ (RTL lint, lang/dir, hreflang, rel, disclosures, alt, no English leakage)
npm run serve     # preview dist/ at http://localhost:8080
npm run verify    # headless-Chrome audit of artifact/ -> verification/ (RTL, glyphs, 3D, dashboard, stats)
```

`verify` needs `puppeteer-core` (`npm i -D puppeteer-core`) and a local Chrome. Set `CHROME=/path/to/chrome` if Chrome isn't at the default Windows path.

## The dashboard (live site)

Open the live link while signed in to claude.ai, then click **Dashboard** in the header. Only the owner sees it.

### Overview

Product count, product views, shop clicks, click rate, a 14-day chart, the most-clicked products, clicks by store and views by language.

> **What is counted:** visitors who are signed in to claude.ai and have **Contributor** access or higher. Anonymous visitors and view-only guests can't write data, so they are not counted. Your own visits are never counted. For all public traffic and your actual commissions, use your AliExpress Portals, SHEIN and Bulchic affiliate dashboards.

### Add a product

1. **Paste your affiliate link.** The store (AliExpress, SHEIN or Bulchic) is detected from the address.
2. **Add the photo:** drag it in, paste it (right-click the image on the store page, *Copy image*, then Ctrl+V), or choose a file. It's compressed automatically.
3. Click **Fill in with Claude**. Claude looks at the photo and link, then writes the name and description in all 7 languages and picks the category. If the image is a screenshot that shows the price, the price is filled in too.
4. Check the price and text, then click **Save and publish**. The site republishes itself with the new product, and everyone sees it straight away.

**Why the photo and price aren't pulled from the link:** pages hosted on claude.ai cannot download anything from other websites (store pages or their images). Fully automatic import needs a small server that calls the [AliExpress Affiliate API](https://openservice.aliexpress.com/) with your app key. That API returns the title, images, price and a tracking link. SHEIN and Bulchic don't offer public product APIs, so those would still need the photo step.

### Products

Edit, delete (with a confirm step), or toggle *Home page* (the featured carousel). Each change republishes the site.

## Where the data lives

- **Catalog (live site):** inside the page itself (`<script id="drape-data">`), so even signed-out visitors see every product. Photos added from the dashboard are stored as compressed JPEGs (about 60–200 KB each). The page limit is 16 MB, which is roughly 80–150 added products.
- **Catalog (static site):** `data/products.json`. To copy dashboard-added products into it, ask Claude to "sync the Drape catalog from the live artifact into products.json".
- **Statistics:** the artifact's shared data store, one counters document per visitor at `stats/<visitor id>`. Only the owner can read the `stats` collection.

## Adding a product by hand (static site)

Add an object to `data/products.json`:

```json
{
  "id": "p25",
  "store": "shein",
  "category": "tops",
  "price": 18.5,
  "currency": "USD",
  "image": "assets/products/p25.jpg",
  "affiliate_url": "https://onelink.shein.com/your-affiliate-link",
  "featured": false,
  "name":        { "en": "…", "zh": "…", "hi": "…", "es": "…", "fr": "…", "ar": "…", "bn": "…" },
  "description": { "en": "…", "zh": "…", "hi": "…", "es": "…", "fr": "…", "ar": "…", "bn": "…" }
}
```

- `store`: `aliexpress`, `shein` or `bulchic` (see `data/stores.json`).
- `category`: `tops` (Tops & Tees), `bottoms` (Pants & Skirts), `outerwear` (Jackets & Coats), `footwear` (Shoes), `accessories` (Bags & Extras).
- Put the image in `public/assets/products/`, then run `npm run build`. The build stops and names any missing translation, unknown store or category, duplicate id or missing image. No language ever falls back to English.

## Stores and logos

`data/stores.json` lists each store's name, the web addresses used to detect it, its colour, and its logo file. The logos in `public/assets/stores/` are **text placeholders in each store's colour**. Replace them with the official logo files from each store's affiliate program brand kit, and follow their logo-usage rules. To add a store, add an entry and a logo file, then rebuild.

The 24 seed products are samples: their links go to store search pages. Replace them with your own affiliate links (or delete them from the dashboard).

## Adding a language

1. Add it to `i18n/languages.json` (`code`, `htmlLang`, `name` in its own script, `dir`, `ogLocale`, `dateLocale`, `font`).
2. Copy `i18n/en.json` to `i18n/<code>.json` and translate every value, keeping `{placeholders}`. `shop.results` needs every plural form the language uses; the build names any that are missing.
3. Add the language to `name` and `description` of every product.
4. For a non-Latin script: add its Google Fonts family to `FAMILY` in `scripts/build.js` and an `html[data-lang="<code>"]` rule in `src/styles.css` (copy the `hi`/`bn` block). For an RTL script, copy the `ar` block: letter-spacing 0, line-height 1.7 or more.
5. `npm run build && npm run check`.

## RTL rules (enforced)

- `lang`/`dir` are set once on `<html>` from `languages.json`: at build time for `dist/`, and by the router on every route in the live app.
- `src/styles.css` uses logical properties only. `npm run check` fails on any physical left/right.
- Direction-sensitive effects read two tokens that flip under `html[dir="rtl"]`: `--dir` (button sweep, marquee, sparkle spin, tilted tiles, 3D star rotation) and `--chrome-angle` (chrome gradients).
- Arrows and chevrons use `.icon-dir` and mirror. Search, globe, check, info and sparkle icons do not.
- "Drape", store names, prices, references and numerals are wrapped in `<bdi dir="ltr">`. In Arabic prose this happens automatically.
- Arabic uses Cairo, `letter-spacing: 0 !important`, and line-height 1.7 or more. Dashboard inputs for each language carry that language's own `dir`.

## Project layout

```
data/products.json, data/stores.json   catalog + stores
i18n/languages.json, i18n/<code>.json  language config + every string
public/assets/                         favicon, product art, store logos
src/render.js                          page templates (shared by both builds)
src/app.js                             router, 3D hero, tilt, filters, stats, self-publishing
src/admin.js                           dashboard
src/styles.css                         all styles
src/wordmark.js, src/icons.js          Drape wordmark, icons
scripts/build.js, gen-images.js, check.js, verify.js
```
