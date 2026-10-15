import type { Store } from "@/lib/types";

/** `color` is the store's accent on dark backgrounds (charts); `ink` is its name colour on the white store tag. */
export const STORE_META: Record<Store, { name: string; color: string; ink: string; domains: string[] }> = {
  aliexpress: {
    name: "AliExpress",
    color: "#ff4747",
    ink: "#cc2a04",
    domains: ["aliexpress.com", "aliexpress.us", "aliexpress.ru", "aliexpress.ru", "alix.ae", "aliexpress-media.com"],
  },
  shein: {
    name: "SHEIN",
    color: "#e5e5e5",
    ink: "#111111",
    domains: ["shein.com", "shein.co.uk", "shein.top", "shein.us", "sheingsp.com", "shein.de", "shein.fr", "shein.es", "shein.it"],
  },
  bulchic: { name: "Bulchic", color: "#e0529c", ink: "#b5145b", domains: ["bulchic.com"] },
  other: { name: "Store", color: "#a1a1aa", ink: "#3a4252", domains: [] },
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function detectStore(url: string): Store {
  const host = hostOf(url);
  if (!host) return "other";
  for (const store of ["aliexpress", "shein", "bulchic"] as const) {
    if (STORE_META[store].domains.some((d) => host === d || host.endsWith(`.${d}`))) return store;
  }
  // Country sub-sites such as fr.shein.com / es.aliexpress.com are covered above;
  // also catch shein regional TLDs like shein.com.mx
  if (/(^|\.)shein\.[a-z.]+$/.test(host)) return "shein";
  if (/(^|\.)aliexpress\.[a-z.]+$/.test(host)) return "aliexpress";
  return "other";
}

/**
 * A sign-in link (for example the one in the admin login email) pasted where a shop link belongs.
 * Never stored: Shop Now would send visitors to it, and opening it would use up the sign-in.
 */
export function isSignInLink(url: string): boolean {
  try {
    const u = new URL(url);
    if (/(^|\.)supabase\.(co|in)$/i.test(u.hostname) || u.pathname.includes("/auth/v1/")) return true;
    return u.searchParams.has("token") && /^(magiclink|recovery|signup|invite|email)$/i.test(u.searchParams.get("type") ?? "");
  } catch {
    return false;
  }
}

export const SIGN_IN_LINK_MESSAGE = "This is a sign-in link, not a shop link. Paste the affiliate link from the store instead.";

export function storeName(store: Store): string {
  return STORE_META[store]?.name ?? "Store";
}
