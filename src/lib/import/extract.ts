import "server-only";
import * as cheerio from "cheerio";
import type { Category, Store } from "@/lib/types";
import { detectStore, storeName } from "@/lib/stores";
import { FetchError, fetchPage, resolveFinalUrl } from "@/lib/import/fetch";
import { aliexpressKeysConfigured, aliexpressProductId, fetchAliexpressProduct } from "@/lib/import/aliexpress-api";
import { suggestCategory, suggestGender } from "@/lib/import/suggest";

import type { ExtractMethod, ExtractResult, ExtractedProduct } from "@/lib/import/types";
export type { ExtractMethod, ExtractResult, ExtractedProduct };

type Found = {
  title?: string;
  description?: string;
  price?: number | null;
  original_price?: number | null;
  currency?: string;
  images?: string[];
  category?: string | null;
};

// ------------------------------------------------------------------ helpers

const CURRENCY_SYMBOLS: Record<string, string> = { $: "USD", "US $": "USD", "€": "EUR", "£": "GBP", "¥": "CNY", "₹": "INR", "C$": "CAD", "A$": "AUD", R$: "BRL" };

export function parsePrice(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;
  // "1.234,56" -> 1234.56 ; "1,234.56" -> 1234.56 ; "12,99" -> 12.99
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : null;
}

function currencyFrom(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  if (/^[A-Z]{3}$/.test(t)) return t;
  const code = t.match(/\b(USD|EUR|GBP|CAD|AUD|CNY|INR|BRL|MXN|SAR|AED|MAD|JPY|PLN|SEK|CHF)\b/);
  if (code) return code[1];
  for (const [sym, cur] of Object.entries(CURRENCY_SYMBOLS).sort((a, b) => b[0].length - a[0].length)) {
    if (t.includes(sym)) return cur;
  }
  return null;
}

function cleanText(s: unknown, max = 300): string {
  if (typeof s !== "string") return "";
  const $ = cheerio.load(`<div>${s}</div>`);
  return $("div").text().replace(/\s+/g, " ").trim().slice(0, max);
}

/** Drops store suffixes such as " - AliExpress 200000345" or " | SHEIN USA". */
function cleanTitle(t: string): string {
  return t
    .replace(/\s*[-|–]\s*(AliExpress|SHEIN|Shein|Bulchic)[^|–-]*$/i, "")
    .replace(/^(AliExpress|SHEIN)\s*[-|:]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export function normalizeImage(src: string, base: string): string | null {
  if (!src || src.startsWith("data:")) return null;
  let s = src.trim();
  if (s.startsWith("//")) s = `https:${s}`;
  try {
    const u = new URL(s, base);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.protocol = "https:";
    let out = u.toString();
    // AliExpress thumbnails: xxx.jpg_220x220.jpg / xxx.jpg_640x640q75.jpg_.webp -> xxx.jpg
    out = out.replace(/(\.(?:jpe?g|png|webp))_\d+x\d+[^/]*$/i, "$1").replace(/(\.(?:jpe?g|png))_\.webp$/i, "$1");
    // SHEIN thumbnails: _thumbnail_405x552 -> full size
    out = out.replace(/_thumbnail_\d+x(\d+)?/i, "");
    return out;
  } catch {
    return null;
  }
}

function uniqImages(list: (string | null | undefined)[], base: string, max = 10): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (!raw) continue;
    const n = normalizeImage(raw, base);
    if (!n || seen.has(n)) continue;
    if (/sprite|logo|icon|placeholder|blank\.gif|1x1|pixel/i.test(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

// ------------------------------------------------------------------ JSON-LD

type LdNode = Record<string, unknown>;

function collectLdNodes(json: unknown, out: LdNode[] = []): LdNode[] {
  if (Array.isArray(json)) json.forEach((j) => collectLdNodes(j, out));
  else if (json && typeof json === "object") {
    const node = json as LdNode;
    out.push(node);
    if (node["@graph"]) collectLdNodes(node["@graph"], out);
    if (node["mainEntity"]) collectLdNodes(node["mainEntity"], out);
    if (node["itemListElement"]) collectLdNodes(node["itemListElement"], out);
  }
  return out;
}

function isType(node: LdNode, type: string): boolean {
  return asArray(node["@type"] as string | string[]).some((t) => String(t).toLowerCase() === type.toLowerCase());
}

function fromJsonLd($: cheerio.CheerioAPI, base: string): Found | null {
  const nodes: LdNode[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      collectLdNodes(JSON.parse(raw), nodes);
    } catch {
      try {
        collectLdNodes(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " ")), nodes);
      } catch {
        /* ignore broken blocks */
      }
    }
  });
  const product = nodes.find((n) => isType(n, "Product") || isType(n, "ProductGroup"));
  if (!product) return null;

  const offers = asArray(product["offers"] as LdNode | LdNode[]).flatMap((o) =>
    isType(o, "AggregateOffer") && o["offers"] ? asArray(o["offers"] as LdNode | LdNode[]).concat(o) : [o],
  );
  let price: number | null = null;
  let original: number | null = null;
  let currency: string | null = null;
  for (const o of offers) {
    const spec = asArray(o["priceSpecification"] as LdNode | LdNode[])[0];
    const p = parsePrice(o["price"] ?? o["lowPrice"] ?? spec?.["price"]);
    if (p !== null && (price === null || p < price)) {
      price = p;
      currency = currencyFrom(String(o["priceCurrency"] ?? spec?.["priceCurrency"] ?? "")) ?? currency;
    }
    const hp = parsePrice(o["highPrice"]);
    if (hp && price && hp > price) original = hp;
  }
  // ProductGroup variants
  if (price === null && product["hasVariant"]) {
    for (const v of asArray(product["hasVariant"] as LdNode | LdNode[])) {
      const o = asArray(v["offers"] as LdNode | LdNode[])[0];
      const p = parsePrice(o?.["price"]);
      if (p !== null) {
        price = p;
        currency = currencyFrom(String(o?.["priceCurrency"] ?? "")) ?? currency;
        break;
      }
    }
  }
  const imgs = asArray(product["image"] as unknown).map((i) =>
    typeof i === "string" ? i : typeof i === "object" && i ? String((i as LdNode)["url"] ?? (i as LdNode)["contentUrl"] ?? "") : "",
  );
  const breadcrumb = nodes.find((n) => isType(n, "BreadcrumbList"));
  const crumbs = breadcrumb
    ? asArray(breadcrumb["itemListElement"] as LdNode | LdNode[])
        .map((li) => String(li["name"] ?? (li["item"] as LdNode | undefined)?.["name"] ?? ""))
        .join(" ")
    : "";
  return {
    title: cleanTitle(cleanText(product["name"])),
    description: cleanText(product["description"], 1200),
    price,
    original_price: original,
    currency: currency ?? undefined,
    images: uniqImages(imgs, base),
    category: [cleanText(product["category"]), crumbs].filter(Boolean).join(" ") || null,
  };
}

// ------------------------------------------------------------------ Open Graph / meta

function fromMeta($: cheerio.CheerioAPI, base: string): Found {
  const meta = (names: string[]) => {
    for (const n of names) {
      const v = $(`meta[property="${n}"]`).attr("content") ?? $(`meta[name="${n}"]`).attr("content") ?? $(`meta[itemprop="${n}"]`).attr("content");
      if (v && v.trim()) return v.trim();
    }
    return "";
  };
  const images = uniqImages(
    [
      ...$('meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[itemprop="image"]')
        .map((_, el) => $(el).attr("content") ?? "")
        .get(),
      $('link[rel="image_src"]').attr("href"),
    ],
    base,
  );
  const priceRaw = meta(["product:price:amount", "og:price:amount", "price", "twitter:data1"]);
  const currencyRaw = meta(["product:price:currency", "og:price:currency", "priceCurrency"]);
  return {
    title: cleanTitle(meta(["og:title", "twitter:title"]) || $("title").first().text()),
    description: cleanText(meta(["og:description", "description", "twitter:description"]), 1200),
    price: parsePrice(priceRaw),
    currency: currencyFrom(currencyRaw) ?? currencyFrom(priceRaw) ?? undefined,
    images,
  };
}

// ------------------------------------------------------------------ store page data (embedded JSON in HTML)

function matchString(html: string, re: RegExp): string | null {
  const m = html.match(re);
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return m[1];
  }
}

function fromPageData(html: string, store: Store, base: string): Found {
  if (store === "aliexpress") {
    const title = matchString(html, /"subject"\s*:\s*"((?:[^"\\]|\\.){5,400})"/);
    const imgList = html.match(/"imagePathList"\s*:\s*\[([^\]]+)\]/);
    const images = imgList ? (imgList[1].match(/"([^"]+)"/g) ?? []).map((s) => s.slice(1, -1)) : [];
    const price =
      parsePrice(matchString(html, /"formatedActivityPrice"\s*:\s*"([^"]+)"/)) ??
      parsePrice(matchString(html, /"formatedPrice"\s*:\s*"([^"]+)"/)) ??
      parsePrice(matchString(html, /"minActivityAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/)) ??
      parsePrice(matchString(html, /"minAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/));
    const currency = matchString(html, /"currencyCode"\s*:\s*"([A-Z]{3})"/);
    return { title: title ? cleanTitle(title) : undefined, images: uniqImages(images, base), price, currency: currency ?? undefined };
  }
  if (store === "shein") {
    const title = matchString(html, /"goods_name"\s*:\s*"((?:[^"\\]|\\.){5,400})"/);
    const imgs = [
      ...(html.match(/"origin_image"\s*:\s*"([^"]+)"/g) ?? []).map((s) => s.replace(/^"origin_image"\s*:\s*"/, "").replace(/"$/, "")),
      matchString(html, /"goods_img"\s*:\s*"([^"]+)"/),
    ].map((s) => (s ? s.replace(/\\\//g, "/") : s));
    const sale =
      parsePrice(matchString(html, /"salePrice"\s*:\s*\{[^}]*"amount"\s*:\s*"([\d.]+)"/)) ??
      parsePrice(matchString(html, /"sale_price"\s*:\s*\{[^}]*"amount"\s*:\s*"([\d.]+)"/));
    const retail =
      parsePrice(matchString(html, /"retailPrice"\s*:\s*\{[^}]*"amount"\s*:\s*"([\d.]+)"/)) ??
      parsePrice(matchString(html, /"retail_price"\s*:\s*\{[^}]*"amount"\s*:\s*"([\d.]+)"/));
    const currency = matchString(html, /"currency"\s*:\s*"([A-Z]{3})"/);
    return {
      title: title ? cleanTitle(title) : undefined,
      images: uniqImages(imgs, base),
      price: sale ?? retail,
      original_price: sale && retail && retail > sale ? retail : null,
      currency: currency ?? undefined,
    };
  }
  return {};
}

// ------------------------------------------------------------------ link-only fallback

/** Title guessed from the URL itself, e.g. shein.com/Floral-Print-Dress-p-123.html */
export function titleFromUrl(url: string, store: Store): string {
  try {
    const u = new URL(url);
    let seg = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
    if (store === "shein") seg = seg.replace(/-p-\d+(-cat-\d+)?\.html?$/i, "");
    else seg = seg.replace(/\.html?$/i, "");
    if (/^\d+$/.test(seg) || seg.length < 6) return "";
    const t = seg.replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
    if (!/[a-z]/i.test(t) || t.split(" ").length < 2) return "";
    return t.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 200);
  } catch {
    return "";
  }
}

/** Store-wide boilerplate that must never be used as a product title or description. */
const GENERIC_TEXT =
  /smarter shopping,? better living|women'?s (&|and) men'?s clothing,? shop online fashion|shop online fashion \| shein|^aliexpress\.com$|free shipping on (all|your) orders/i;

function isWallUrl(url: string): boolean {
  return /\/risk\/challenge|_____tmd_____|\/punish|captcha|login\.|\/login|sync_cookie/i.test(url);
}

function looksBlocked(html: string, status: number): boolean {
  if (status === 403 || status === 429 || status === 503) return true;
  return /captcha|punish|x5sec|verify you are human|challenge-platform|access denied|robot check|slide to verify|risk\/challenge/i.test(html.slice(0, 30_000)) && html.length < 200_000;
}

function merge(...parts: (Found | null | undefined)[]): Found {
  const out: Found = { images: [] };
  for (const p of parts) {
    if (!p) continue;
    if (!out.title && p.title) out.title = p.title;
    if (!out.description && p.description) out.description = p.description;
    if ((out.price === undefined || out.price === null) && p.price !== undefined && p.price !== null) {
      out.price = p.price;
      if (p.currency) out.currency = p.currency;
    }
    if (!out.original_price && p.original_price) out.original_price = p.original_price;
    if (!out.currency && p.currency) out.currency = p.currency;
    if (!out.category && p.category) out.category = p.category;
    out.images = [...(out.images ?? []), ...(p.images ?? [])];
  }
  out.images = Array.from(new Set(out.images)).slice(0, 10);
  return out;
}

// ------------------------------------------------------------------ main

export async function extractProduct(input: { url: string; affiliate_url?: string }, categories: Category[]): Promise<ExtractResult> {
  const warnings: string[] = [];
  let sourceUrl = input.url.trim();
  if (!/^https?:\/\//i.test(sourceUrl)) sourceUrl = `https://${sourceUrl}`;
  const affiliateInput = (input.affiliate_url ?? "").trim();

  let store = detectStore(sourceUrl);
  let method: ExtractMethod = "none";
  let found: Found = {};
  let pageNote = "";

  const empty = (message: string): ExtractResult => ({
    ok: false,
    quality: "failed",
    method: "none",
    message,
    warnings,
    data: {
      title: "",
      description: "",
      price: null,
      original_price: null,
      currency: "USD",
      images: [],
      store,
      source_url: /^https?:\/\//i.test(sourceUrl) ? sourceUrl : "",
      affiliate_url: affiliateInput,
      gender: "unisex",
      category_id: null,
      category_name: null,
    },
  });

  try {
    new URL(sourceUrl);
  } catch {
    return empty("That doesn't look like a valid link. Fill in the form by hand.");
  }

  try {
    // Expand short links (s.click.aliexpress.com, a.aliexpress.com, onelink.shein.com, ...)
    if (/^(s\.click|a|click)\.aliexpress\.|onelink\.shein\.|api-shein\.|\.page\.link$/i.test(new URL(sourceUrl).hostname)) {
      const expanded = await resolveFinalUrl(sourceUrl);
      if (expanded !== sourceUrl) {
        sourceUrl = expanded;
        store = detectStore(sourceUrl);
      }
    }

    // AliExpress regional hosts (aliexpress.us, es./fr. sub-sites) bounce through login/cookie redirects;
    // the global item page has the same product data.
    if (store === "aliexpress") {
      const id = aliexpressProductId(sourceUrl);
      if (id) sourceUrl = `https://www.aliexpress.com/item/${id}.html`;
    }

    // 1) AliExpress official API when keys exist
    let affiliateFromApi: string | null = null;
    if (store === "aliexpress" && aliexpressKeysConfigured()) {
      const id = aliexpressProductId(sourceUrl);
      if (id) {
        const api = await fetchAliexpressProduct(id);
        if (api && api.title) {
          method = "aliexpress-api";
          affiliateFromApi = api.promotion_link;
          found = merge({
            title: cleanTitle(api.title),
            price: api.price,
            original_price: api.original_price && api.price && api.original_price > api.price ? api.original_price : null,
            currency: api.currency,
            images: uniqImages(api.images, sourceUrl),
            category: api.category,
          });
        } else warnings.push("AliExpress API returned no data for this item; used the product page instead.");
      } else warnings.push("Couldn't find an AliExpress product id in the link; used the product page instead.");
    }

    // 2) Fetch the page: JSON-LD, then Open Graph / meta, then embedded page data
    if (method !== "aliexpress-api") {
      try {
        const page = await fetchPage(sourceUrl);
        const redirectedToWall = isWallUrl(page.url);
        // Keep the real product URL (never store a captcha / login URL as the source).
        if (!redirectedToWall && store !== "aliexpress") sourceUrl = page.url;
        if (store === "other") store = detectStore(sourceUrl);
        const $ = cheerio.load(page.html);
        const ld = fromJsonLd($, page.url);
        const og = fromMeta($, page.url);
        const pd = fromPageData(page.html, store, page.url);
        if (redirectedToWall || looksBlocked(page.html, page.status)) {
          pageNote = `${storeName(store)} answered with a bot check${page.status !== 200 ? ` (HTTP ${page.status})` : ""}, which Drape doesn't bypass.`;
          // Meta tags on a block page are useless (e.g. "Captcha"), only trust embedded product data.
          found = merge(pd);
        } else if (page.status >= 400) {
          pageNote = `The store answered with HTTP ${page.status}.`;
          found = merge(ld, pd, og);
        } else {
          found = merge(ld, pd, og);
        }
        method = ld?.title ? "json-ld" : pd.title ? "page-data" : found.title ? "open-graph" : "none";
        if (found.description && GENERIC_TEXT.test(found.description)) found.description = undefined;
        if (found.title && (GENERIC_TEXT.test(found.title) || /^(aliexpress|shein|bulchic|404|not found|page not found|captcha|login|sign in)/i.test(found.title))) {
          found.title = undefined;
          method = "none";
        }
      } catch (e) {
        pageNote = e instanceof FetchError ? e.message : "Could not read the product page.";
      }
    }

    if (affiliateFromApi && !affiliateInput) warnings.push("Affiliate link filled from the AliExpress API (your tracking ID).");

    // 3) Link-only fallback for the title
    if (!found.title) {
      const t = titleFromUrl(sourceUrl, store);
      if (t) {
        found.title = t;
        if (method === "none") method = "link-only";
        warnings.push("Title was guessed from the link. Please check it.");
      }
    }

    const text = [found.title, found.category, found.description, sourceUrl].filter(Boolean).join(" ");
    const category = suggestCategory(text, categories);
    const gender = suggestGender(text);

    const data: ExtractedProduct = {
      title: found.title ?? "",
      description: found.description ?? "",
      price: found.price ?? null,
      original_price: found.original_price ?? null,
      currency: found.currency ?? "USD",
      images: found.images ?? [],
      store,
      source_url: sourceUrl,
      affiliate_url: affiliateInput || affiliateFromApi || "",
      gender,
      category_id: category?.id ?? null,
      category_name: category?.name ?? null,
    };

    if (!data.affiliate_url) warnings.push("No affiliate link yet: paste your tracking link before publishing.");
    if (data.price === null) warnings.push("Price not found: enter it manually.");
    if (!data.images.length) warnings.push("No images found: add image links or upload photos.");

    const ok = Boolean(data.title);
    const quality: ExtractResult["quality"] = !ok ? "failed" : data.price !== null && data.images.length ? "complete" : "partial";
    const message = !ok
      ? `${pageNote || "Couldn't read product details from this page."} Fill in the form by hand.`
      : quality === "complete"
        ? `Details found via ${labelFor(method)}. Check everything and pick the category before publishing.`
        : `${pageNote ? pageNote + " " : ""}Some details were found via ${labelFor(method)}; complete the missing fields.`;

    return { ok, quality, method, message, warnings, data };
  } catch (e) {
    console.error("[import] unexpected", e);
    return empty("Something went wrong while reading this link. Fill in the form by hand.");
  }
}

function labelFor(m: ExtractMethod): string {
  switch (m) {
    case "aliexpress-api":
      return "the AliExpress Affiliate API";
    case "json-ld":
      return "the page's product data (JSON-LD)";
    case "open-graph":
      return "the page's Open Graph tags";
    case "page-data":
      return "the page's embedded product data";
    case "link-only":
      return "the link text";
    default:
      return "the page";
  }
}
