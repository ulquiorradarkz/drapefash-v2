import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { storeName } from "@/lib/stores";
import { SITE_URL } from "@/lib/env";

export const alt = "Drape product";
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

export default async function ProductOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  const img = await imageData(p?.images[0]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#08080c", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ width: 504, height: 630, display: "flex", background: "#14141c" }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" width={504} height={630} style={{ objectFit: "cover", width: 504, height: 630 }} />
          ) : (
            <div style={{ display: "flex", margin: "auto", fontSize: 120, fontWeight: 900, color: "#c6ccd6" }}>D</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              backgroundImage: "linear-gradient(180deg,#fff 0%,#c6ccd6 45%,#2b2f38 50%,#e8ebf0 60%,#9aa1ad 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Drape
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.15 }}>{(p?.title ?? "Fashion find").slice(0, 80)}</div>
            <div style={{ marginTop: 24, display: "flex", gap: 20, alignItems: "center", fontSize: 34 }}>
              {p?.price !== null && p?.price !== undefined && <span style={{ fontWeight: 800 }}>{formatPrice(p.price, p.currency)}</span>}
              {p && <span style={{ color: "rgba(255,255,255,0.6)" }}>on {storeName(p.store)}</span>}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
