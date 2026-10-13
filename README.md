# Drape

Affiliate fashion storefront (Y2K chrome style) with an owner dashboard. Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · React Three Fiber.

The original static v2 site is kept unchanged in `_old_v2/`.

## Main features

| Area | Where |
|---|---|
| Storefront | `/`, `/women`, `/men`, `/category/[slug]`, `/product/[slug]`, `/search` |
| Legal | `/about`, `/affiliate-disclosure`, `/privacy`, `/cookies` + GDPR consent banner |
| Shop Now tracking | `/go/[slug]` logs a click (country, device, referrer, utm) then 302s to the affiliate link |
| Page views | `/api/pv`, only after analytics consent, no IP stored |
| Dashboard | `/admin` (overview + charts), `/admin/products`, `/admin/import`, `/admin/categories`, `/admin/account` |
| Import API | `POST /api/admin/import` → AliExpress API (if keys) → JSON-LD → Open Graph/meta → embedded page data → link text |
| SEO | metadata, OG images, `sitemap.xml`, `robots.txt`, Product + Breadcrumb JSON-LD |

Only `ADMIN_EMAIL` can open `/admin` or call `/api/admin/*` (middleware + server checks + Postgres RLS via `is_admin()`).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values
npx supabase link --project-ref <ref>
npx supabase db push         # schema, RLS, storage bucket, analytics function, v2 seed (as drafts)
node --env-file=.env.local scripts/admin-user.mjs   # creates the admin auth user
npm run dev
```

Sign in at `/admin/login` with a magic link (sent to `ADMIN_EMAIL`), then set a password under **Account**.
For a one-off link without email: `node --env-file=.env.local scripts/admin-user.mjs --link https://your-site`.

## Import notes

- **AliExpress**: without API keys we read the product page: title and photos are usually found, the price is rendered client-side so you type it. With `ALIEXPRESS_APP_KEY` / `ALIEXPRESS_APP_SECRET` (+ `ALIEXPRESS_TRACKING_ID`) the official `aliexpress.affiliate.productdetail.get` API fills title, price, images and your promotion link. Titles come in the language of the server's region (Vercel = US = English).
- **SHEIN** answers server requests with a bot check. Drape does not bypass it: you get the title from the link and fill price/photos yourself (paste image links or upload).
- The editable form is always shown before publishing. Bulk import saves everything as drafts.

## Tests

```bash
set -a; . ./.env.local; set +a
npx playwright test          # owner flow (login → import → publish → Shop Now → click in dashboard) + screenshots at 390/1440px
node --env-file=.env.local scripts/cleanup-e2e.mjs   # remove products created by the tests
```
