import { createHash } from "node:crypto";
import { getProductBySlug } from "@/lib/data";
import { assertPublicUrl } from "@/lib/import/fetch";
import { createServiceSupabase } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/env";
import { labelsToPng, segment } from "@/lib/fitting/segment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 8_000_000;

/**
 * The clothing mask of a product's first picture, for the fitting room (a grey PNG of class numbers).
 * Worked out once per picture, then kept in Storage under a name derived from the picture's address.
 * 204 when there is nothing to segment (drawings and local files: the fitting room cuts those out itself).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,140}$/.test(slug)) return new Response(null, { status: 400 });
  const product = await getProductBySlug(slug);
  if (!product) return new Response(null, { status: 404 });
  const src = product.images[0];
  if (!src || !/^https?:\/\//i.test(src) || /\.svg(\?|#|$)/i.test(src)) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "public, max-age=3600" } });
  }

  const key = `fitting/v1/${createHash("sha256").update(src).digest("hex").slice(0, 32)}.png`;
  const stored = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
  try {
    const hit = await fetch(stored, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (hit.ok) return png(Buffer.from(await hit.arrayBuffer()));
  } catch {
    /* not stored yet, or Storage is slow: work it out */
  }

  try {
    const url = await assertPublicUrl(src);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DrapeFittingRoom/1.0)", Accept: "image/avif,image/webp,image/*" },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!res.ok || !type.startsWith("image/")) throw new Error(`picture answered ${res.status} ${type}`);
    const picture = Buffer.from(await res.arrayBuffer());
    if (picture.byteLength > MAX_IMAGE_BYTES) throw new Error("picture too large");
    const out = await labelsToPng(await segment(picture));
    const service = createServiceSupabase();
    if (service) {
      const { error } = await service.storage.from(BUCKET).upload(key, out, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
      if (error) console.warn("[fitting] mask not stored", slug, error.message);
    }
    return png(out);
  } catch (e) {
    console.error("[fitting] mask failed", slug, e instanceof Error ? e.message : e);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

function png(body: Buffer) {
  // The URL carries a key of the picture's address (?v=), so it can be cached for a long time.
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400" },
  });
}
