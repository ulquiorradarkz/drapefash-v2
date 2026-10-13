import "server-only";
import { createHmac } from "node:crypto";

export type AliApiProduct = {
  title: string;
  price: number | null;
  original_price: number | null;
  currency: string;
  images: string[];
  promotion_link: string | null;
  category: string | null;
};

export function aliexpressKeysConfigured(): boolean {
  return Boolean(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET);
}

export function aliexpressProductId(url: string): string | null {
  const m =
    url.match(/\/item\/(?:[^/]*[^\d/])?(\d{8,})\.html/i) ??
    url.match(/[?&](?:productId|product_id|itemId|item_id)=(\d{8,})/i) ??
    url.match(/\/(\d{10,})\.html/);
  return m ? m[1] : null;
}

function sign(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  return createHmac("sha256", secret).update(base, "utf8").digest("hex").toUpperCase();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Official AliExpress Affiliate API: aliexpress.affiliate.productdetail.get
 * https://openservice.aliexpress.com/doc/api.htm#/api?cid=21407&path=aliexpress.affiliate.productdetail.get
 */
export async function fetchAliexpressProduct(productId: string): Promise<AliApiProduct | null> {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const secret = process.env.ALIEXPRESS_APP_SECRET;
  if (!appKey || !secret) return null;

  const params: Record<string, string> = {
    app_key: appKey,
    method: "aliexpress.affiliate.productdetail.get",
    sign_method: "sha256",
    timestamp: Date.now().toString(),
    format: "json",
    v: "2.0",
    product_ids: productId,
    target_currency: "USD",
    target_language: "EN",
    country: "US",
    fields:
      "product_title,target_sale_price,target_sale_price_currency,target_original_price,product_main_image_url,product_small_image_urls,promotion_link,first_level_category_name,second_level_category_name",
  };
  if (process.env.ALIEXPRESS_TRACKING_ID) params.tracking_id = process.env.ALIEXPRESS_TRACKING_ID;
  params.sign = sign(params, secret);

  try {
    const res = await fetch("https://api-sg.aliexpress.com/sync", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const resp = json["aliexpress_affiliate_productdetail_get_response"] as
      | { resp_result?: { resp_code?: number; result?: { products?: { product?: Record<string, unknown>[] } } } }
      | undefined;
    const p = resp?.resp_result?.result?.products?.product?.[0];
    if (!p) return null;
    const small = (p["product_small_image_urls"] as { string?: string[] } | undefined)?.string ?? [];
    const main = typeof p["product_main_image_url"] === "string" ? [p["product_main_image_url"] as string] : [];
    return {
      title: String(p["product_title"] ?? "").trim(),
      price: num(p["target_sale_price"]),
      original_price: num(p["target_original_price"]),
      currency: String(p["target_sale_price_currency"] ?? "USD").toUpperCase(),
      images: [...main, ...small],
      promotion_link: typeof p["promotion_link"] === "string" ? (p["promotion_link"] as string) : null,
      category: (p["second_level_category_name"] as string) ?? (p["first_level_category_name"] as string) ?? null,
    };
  } catch (e) {
    console.error("[aliexpress-api] failed", e);
    return null;
  }
}
