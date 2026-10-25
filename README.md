# Drape

Affiliate fashion storefront (pinned-poster style: charcoal, off-white, sage) in seven languages, with item IDs, a 3D fitting room and an owner dashboard. Next.js 15 (App Router) · TypeScript · Tailwind 4 · Supabase · React Three Fiber.

The original static site is kept unchanged in `_old_v2/`. The first single-language Next.js storefront is archived in `_old_next_store/` (not built).

## Main features

| Area | Where |
|---|---|
| Storefront, 7 languages | `/en` `/zh` `/hi` `/es` `/fr` `/ar` `/bn` + `/shop`, `/women`, `/men`, `/category/[slug]`, `/product/[slug]`, `/contact` |
| Item IDs | `/[lang]/id/DRP-014` and the ID box open that piece; a shop search for an ID does too |
| Picks + fitting room | the star saves a piece in the visitor's browser; `/[lang]/picks` dresses a 3D mannequin with them |
| Legal | `/about`, `/affiliate-disclosure`, `/privacy`, `/cookies` (per language) + GDPR consent banner |
| Shop Now tracking | `/go/[slug]` logs a click (country, device, referrer, utm) then 302s to the affiliate link |
| Page views | `/api/pv`, only after analytics consent, no IP stored |
| Dashboard (English) | `/admin` (overview + charts), `/admin/products`, `/admin/import`, `/admin/categories`, `/admin/account` |
| Import API | `POST /api/admin/import` → AliExpress API (if keys) → JSON-LD → Open Graph/meta → embedded page data → link text |
| SEO | per-language metadata, hreflang + x-default on every page, OG images, `sitemap.xml` (all languages), `robots.txt`, Product + Breadcrumb JSON-LD |

Only `ADMIN_EMAIL` can open `/admin` or call `/api/admin/*` (middleware + server checks + Postgres RLS via `is_admin()`).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values
npx supabase link --project-ref <ref>
npx supabase db push         # schema, RLS, storage bucket, analytics function, v2 seed (as drafts), translations, item IDs
node --env-file=.env.local scripts/admin-user.mjs   # creates the admin auth user
npm run dev
```

Sign in at `/admin/login` with a magic link (sent to `ADMIN_EMAIL`), then set a password under **Account**, or from a terminal (typing is hidden):

```bash
NODE_USE_ENV_PROXY=1 node --env-file=.env.local scripts/admin-user.mjs --set-password
```

Never put the password in the code: this repository is public.
For a one-off link without email: `node --env-file=.env.local scripts/admin-user.mjs --link https://your-site`.

### Previewing draft products locally

The 24 seed products are drafts, so a fresh database shows an empty shop. To design or test with them:

```bash
DRAPE_PREVIEW_DRAFTS=1 NEXT_DIST_DIR=.next-dev npx next dev -p 3100
```

`DRAPE_PREVIEW_DRAFTS` only works in `next dev` (it reads drafts with the service-role key). `NEXT_DIST_DIR` keeps the dev build out of `.next`, so it never disturbs a `next start` server. `.claude/launch.json` holds the same setup. Behind an HTTP proxy, also set `NODE_USE_ENV_PROXY=1` so the server can reach Supabase (Node only uses `HTTPS_PROXY` with that flag).

## Languages

- Every storefront address starts with a language: `/en`, `/zh`, `/hi`, `/es`, `/fr`, `/ar`, `/bn`. A visit to an address without one (`/`, `/product/x`, old links) is redirected to the saved language (`drape_lang` cookie, set by the language menu), then the browser's language, then English.
- `<html lang dir>` is set once, in `src/app/[locale]/layout.tsx`, from `src/i18n/config.ts`. Arabic gets `dir="rtl"` there and everything mirrors through CSS logical properties. There are no left/right properties in the storefront.
- Interface text lives in `src/i18n/dictionaries/<code>.ts`. Every dictionary is typed against `en.ts`, so a missing string fails the build: no English fallback can ship.
- Fonts: Unbounded (display) + Geist (text) for Latin, Noto Sans SC, Noto Sans Devanagari, Noto Sans Bengali and Cairo (Arabic), all self-hosted by `next/font` (`src/app/fonts.ts`). Script fonts download only when a page needs their glyphs.

### Arabic / RTL rules the code follows

1. `lang="ar" dir="rtl"` on `<html>`, from the config, not per component.
2. Logical properties only (`ms-`, `pe-`, `start-`, `inset-inline-*`, `text-start`).
3. Header, nav, filters sidebar, product grid, breadcrumbs, footer columns, the budget slider and the store showcase mirror automatically.
4. Arrows and chevrons carry `.icon-dir` / `.btn-icon` and flip; search, globe and sparkle icons don't.
5. The chrome button gradient and its hover shine reverse (`--chrome-angle`, `--shine-from/to` in `drape.css`); the 3D cloth's folds roll the other way.
6. The wordmark is an SVG and stays left-to-right; prices are `<bdi dir="ltr">`; product text from the stores is isolated in `<bdi>`.
7. Arabic text uses Cairo, no letter-spacing, line-height 1.7 or more (`drape.css`, "per-script type").
8. Inputs, selects, the price range and the language menu are RTL.

### Add a language

1. Add the code to `LOCALES` and `LOCALE_META` in `src/i18n/config.ts` (native name, `dir`, `htmlLang`, `ogLocale`, `intl`).
2. Copy `src/i18n/dictionaries/en.ts` to `<code>.ts`, type it as `Dictionary`, translate every string, and register it in `src/i18n/index.ts`. `npx tsc --noEmit` lists anything missing.
3. If the script needs its own font, add it in `src/app/fonts.ts` and to the `--font-text` / `--font-head` stacks in `src/app/drape.css`.
4. Add the code to `TRANSLATED_LOCALES` in `src/lib/types.ts` (and to the product form's `translations` object) so products can carry text in it.

## Products and categories in other languages

English text lives in the product's `title` / `description`. The other six languages live in `products.translations` (jsonb), added by `supabase/migrations/20261014205831_translations.sql`, which also fills them for the 24 seed products. In the dashboard, open a product and expand **Name and description in the other 6 languages**. An empty field shows the English text.

Category names for the six built-in categories (tops, bottoms, outerwear, footwear, accessories, dresses) are translated in the dictionaries. A category you add yourself shows its own name until it gets a `categories.translations` entry.

The storefront keeps working before that migration runs: it falls back to the English columns.

## Add a product

Dashboard → **Import**: paste the product link (AliExpress, SHEIN, Bulchic). The form fills in what can be extracted; check it, add the other-language names if you have them, then **Publish**.

## Import notes

- **AliExpress**: without API keys we read the product page. From a home connection title + photos are found (price is rendered client-side, so you type it), but from Vercel's datacenter IPs AliExpress shows a bot check, so on the live site you get an empty form until you add the API keys. With `ALIEXPRESS_APP_KEY` / `ALIEXPRESS_APP_SECRET` (+ `ALIEXPRESS_TRACKING_ID`) the official `aliexpress.affiliate.productdetail.get` API fills title, price, images and your promotion link.
- **SHEIN** answers server requests with a bot check. Drape does not bypass it: you get the title from the link and fill price/photos yourself (paste image links or upload).
- The editable form is always shown before publishing. Bulk import saves everything as drafts.

## Item IDs

Every piece has a short ID such as `DRP-014` (column `products.code`, added by `supabase/migrations/20261014205834_product_code.sql`, which also numbers the 24 seed pieces DRP-001 … DRP-024).

- **Dashboard:** the product form has an **Item ID** field. Leave it empty and the piece gets the next free number. IDs are stored in capitals and must be unique (2–24 letters, digits, dashes).
- **Visitors** type the ID in the item-ID box (home, contact, fitting room, 404) or in any search box. `DRP-014`, `drp 14`, `DRP14` and just `14` all open the piece. Shareable links: `/en/id/DRP-014` (any language).
- Put the ID in Instagram posts and stories; people who see it can find the piece in one step.
- Before the migration runs, the storefront works without IDs. In the local draft preview (`DRAPE_PREVIEW_DRAFTS=1`) the seed pieces show the IDs the migration will give them.

## Picks and the fitting room

- The star on every product card and product page saves the piece in the visitor's browser (`localStorage`, `src/lib/picks.ts`). Nothing is sent to the server; the header star shows the count.
- `/[lang]/picks` lists the saved pieces and dresses a 3D mannequin with them (`src/components/store/fitting/`). Each piece goes to a slot (head, jacket, top, dress, bottom, shoes, in hand), guessed from its category and name and changeable with **Wear as**. Pieces can also be dragged onto the mannequin. Drag (or arrow keys) turns it; women's and men's forms.
- The mannequins (`public/models/mannequin-male.glb`, `mannequin-female.glb`, about 170 KB each) are the realistic bodies from Blender's free Human Base Meshes bundle (CC0), with the faces smoothed into faceless mannequin heads, remeshed, reduced to 42k triangles and meshopt-compressed. White satin finish on a black stand in a pale studio.
- The product picture is cut out in the browser (`src/lib/garment-cutout.ts`): plain backgrounds are removed from the edges and stray specks dropped. The cut-out is then projected onto the body as a decal, so a top follows chest, shoulders and arms and trousers follow the legs; shoes are printed on each foot and a bag hangs beside the hand. Photos without a plain background are projected whole. Remote pictures go through `/_next/image` so the canvas can read them.
- "Try it on" on a product page opens `/[lang]/picks?wear=<slug>`, which saves the piece and puts it on.
- Without WebGL the look is laid out flat.

## Contact

The owner answers on Instagram (`src/lib/contact.ts`). `/[lang]/contact` is the Instagram handle set as display type, which opens the profile; the same block closes the home page, and the footer has the handle.

## Design

The pinned poster: the name holds the screen while the pieces of the edit change under it. Charcoal, off-white and one grey-sage accent, with street photographs as the world around the clothes.

- **Colours:** charcoal ground (`--paper` #1c1c1c), off-white ink, one sage accent `#8fa68e` for the action, the star, saved pieces and discounts, and one pale concrete field (`.night`) a section may flip to. No gradients, rules or shadows at rest. Tokens in `src/app/drape.css` (the token names are kept from the first storefront, so every page follows them).
- **Type:** Anton (compressed heavy capitals) for headings, Work Sans for everything else, item IDs and prices included, with tabular figures. Chinese, Devanagari, Bengali and Arabic set their headings in the heaviest cut of Noto Sans SC / Devanagari / Bengali and Cairo (`src/app/fonts.ts`).
- **Logo:** the DRAPE wordmark as an SVG drawn from Anton, with the sage 4-point star (`src/components/wordmark.tsx`). It fills with `currentColor`.
- **Home** (`src/components/store/home/`): the pinned poster hero (five pieces, one per category, each bringing a ground colour sampled from its picture, the swing tag counting through their IDs); a rail of the newest IDs; two pieces in close-up with a column card; the archive as a line-up you can type an ID or a word into (the picture follows the pointer); the departments in one frame on the concrete field; how buying works one verb at a time over street photographs; the Instagram handle as display type.
- **Pictures:** product pictures from the catalogue; street photographs from Unsplash via Lorem Picsum and one street clip from Wikimedia Commons (CC BY 3.0) in `public/street`, credited in the footer, `src/lib/credits.ts` and on the About page; the draped Met statue (CC0) on the legal pages.
- **Motion:** Motion (`motion/react`) for the pinned hero, the close-up drift, the line-up's pointer picture and filtering, the category frame and the verb photographs; anime.js for the swing tag's spring, the verbs' letters and the handle's ripple; three 21st.dev components by ibelick (motion-primitives, MIT) in `src/components/motion-primitives`: Sliding Number, Magnetic and Infinite Slider. Under reduced motion nothing moves by itself.
- **Placeholder product pictures:** `node scripts/gen-seed-art.mjs` redraws `public/legacy/products/p01–p24.svg` in this style.

The previous chrome style's components are archived in `_old_next_store/chrome-style/` (not built); the monochrome collage is in git history (branch `drape-upgrade`).

## Tests

```bash
set -a; . ./.env.local; set +a
npx playwright test          # owner flow (login → import → publish → Shop Now → click in dashboard) + screenshots at 390/1440px
node --env-file=.env.local scripts/cleanup-e2e.mjs   # remove products created by the tests
```
