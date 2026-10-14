import { isLocale } from "@/i18n/config";
import { getProductsBySlugs } from "@/lib/data";
import { toPickSnapshot } from "@/lib/pick-item";

export const runtime = "nodejs";

/**
 * Fresh copies of the pieces a visitor saved: title in their language, current price and photo.
 * GET /api/picks?slugs=a,b,c&locale=ar. Unpublished or deleted pieces are simply left out.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "en";
  const slugs = (url.searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
    .slice(0, 60);
  if (!isLocale(locale)) return Response.json({ error: "Unknown language" }, { status: 400 });
  if (!slugs.length) return Response.json({ items: [] });
  const products = await getProductsBySlugs(slugs);
  return Response.json(
    { items: products.map((p) => toPickSnapshot(p, locale)) },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
  );
}
