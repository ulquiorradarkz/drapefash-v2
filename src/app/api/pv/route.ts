import { after, type NextRequest } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { cleanReferrer, countryFromHeaders, deviceFromUA, isBot } from "@/lib/request-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight page-view beacon. Only called by the client after analytics consent.
 * Stores path, coarse country (edge header), device class and referrer host. No IP, no cookies, no IDs.
 */
export async function POST(request: NextRequest) {
  const consent = request.cookies.get("drape_consent")?.value;
  if (consent !== "granted") return new Response(null, { status: 204 });

  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return new Response(null, { status: 204 });

  let body: { path?: unknown; referrer?: unknown } = {};
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path.split("?")[0].slice(0, 300) : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) {
    return new Response(null, { status: 204 });
  }

  const row = {
    path,
    country: countryFromHeaders(request.headers),
    device: deviceFromUA(ua),
    referrer: cleanReferrer(typeof body.referrer === "string" ? body.referrer : null, request.nextUrl.hostname),
  };
  after(async () => {
    const service = createServiceSupabase();
    if (!service) return;
    const { error } = await service.from("page_views").insert(row);
    if (error) console.error("[pv] insert failed", error.message);
  });
  return new Response(null, { status: 204 });
}
