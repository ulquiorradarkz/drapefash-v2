import { ImageResponse } from "next/og";
import { OgWordmark } from "@/components/og-wordmark";
import { getProductBySlug } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { storeName } from "@/lib/stores";
import { SITE_URL } from "@/lib/env";

export const alt = "Drape";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

async function imageData(src: string | undefined): Promise<string | null> {
  if (!src || /\.svg(\?|$)/i.test(src)) return null;
  try {
    const url = src.startsWith("http") ? src : `${SITE_URL}${src}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(jpeg|png)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Product preview card. Uses the product's base title: the image renderer only carries Latin glyphs,
 * and store titles are in the store's own language.
 */
export default async function ProductOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  const img = await imageData(p?.images[0]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1c1c1c", color: "#f1f1ef", fontFamily: "sans-serif" }}>
        <div style={{ width: 504, height: 630, display: "flex", background: "#c8c5ba" }}>
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" width={504} height={630} style={{ objectFit: "cover", width: 504, height: 630 }} />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <OgWordmark width={240} />
            {p?.code && <span style={{ fontFamily: "sans-serif", fontSize: 30, color: "#8fa68e" }}>{p.code}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.15 }}>{(p?.title ?? "Drape").slice(0, 80)}</div>
            <div style={{ marginTop: 24, display: "flex", gap: 20, alignItems: "center", fontSize: 34 }}>
              {p?.price !== null && p?.price !== undefined && <span style={{ fontWeight: 800 }}>{formatPrice(p.price, p.currency)}</span>}
              {p && <span style={{ color: "#b9bab4" }}>{storeName(p.store)}</span>}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
