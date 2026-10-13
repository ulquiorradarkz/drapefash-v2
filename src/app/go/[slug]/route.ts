import { NextResponse, after, type NextRequest } from "next/server";
import { createServiceSupabase, createPublicSupabase } from "@/lib/supabase/server";
import { cleanReferrer, clip, countryFromHeaders, deviceFromUA, isBot } from "@/lib/request-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const home = new URL("/", request.url);
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.redirect(home, 302);

  const db = createServiceSupabase() ?? createPublicSupabase();
  const { data: product } = await db
    .from("products")
    .select("id, affiliate_url, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (!product || !product.is_published || !/^https?:\/\//i.test(product.affiliate_url)) {
    return NextResponse.redirect(new URL(`/product/${slug}`, request.url), 302);
  }

  const ua = request.headers.get("user-agent");
  const sp = request.nextUrl.searchParams;
  const row = {
    product_id: product.id,
    country: countryFromHeaders(request.headers),
    device: deviceFromUA(ua),
    referrer: cleanReferrer(sp.get("ref") || request.headers.get("referer"), request.nextUrl.hostname),
    utm_source: clip(sp.get("utm_source")),
    utm_medium: clip(sp.get("utm_medium")),
    utm_campaign: clip(sp.get("utm_campaign")),
  };

  // Log after the redirect is sent so the shopper never waits on the database.
  if (!isBot(ua) && request.headers.get("purpose") !== "prefetch" && request.headers.get("sec-purpose") !== "prefetch") {
    after(async () => {
      const service = createServiceSupabase();
      if (!service) return;
      const { error } = await service.from("clicks").insert(row);
      if (error) console.error("[go] click insert failed", error.message);
    });
  }

  const res = NextResponse.redirect(product.affiliate_url, 302);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  return res;
}
