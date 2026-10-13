import "server-only";

type HeaderBag = { get(name: string): string | null };

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|embedly|preview|headlesschrome|lighthouse|pingdom|monitor|curl|wget|python-requests|axios|node-fetch|go-http|whatsapp|telegram|discord|skype/i;

export function isBot(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_RE.test(ua);
}

export function deviceFromUA(ua: string | null): "mobile" | "tablet" | "desktop" {
  if (!ua) return "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return "mobile";
  return "desktop";
}

/** Country code from the edge (Vercel / Cloudflare). Never stores or derives IP addresses. */
export function countryFromHeaders(h: HeaderBag): string | null {
  const c = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? h.get("x-country-code");
  if (!c || c === "XX" || c === "T1") return null;
  return c.toUpperCase().slice(0, 2);
}

/**
 * Referrer reduced to something non-identifying: our own path for internal navigation,
 * or just the host name for external sites (no query strings).
 */
export function cleanReferrer(ref: string | null | undefined, siteHost: string | null): string | null {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const host = u.hostname.replace(/^www\./, "");
    if (siteHost && host === siteHost.replace(/^www\./, "")) return u.pathname.slice(0, 200);
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

export function clip(v: string | null | undefined, max = 100): string | null {
  if (!v) return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}
