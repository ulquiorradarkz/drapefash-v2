import type { Store } from "@/lib/types";

export const STORE_META: Record<Store, { name: string; color: string; domains: string[] }> = {
  aliexpress: {
    name: "AliExpress",
    color: "#ff4747",
    domains: ["aliexpress.com", "aliexpress.us", "aliexpress.ru", "aliexpress.ru", "alix.ae", "aliexpress-media.com"],
  },
  shein: {
    name: "SHEIN",
    color: "#e5e5e5",
    domains: ["shein.com", "shein.co.uk", "shein.top", "shein.us", "sheingsp.com", "shein.de", "shein.fr", "shein.es", "shein.it"],
  },
  bulchic: { name: "Bulchic", color: "#e0529c", domains: ["bulchic.com"] },
  other: { name: "Store", color: "#a1a1aa", domains: [] },
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

export function storeName(store: Store): string {
  return STORE_META[store]?.name ?? "Store";
}
