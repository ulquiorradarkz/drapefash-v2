import { ImageResponse } from "next/og";
import { OgWordmark } from "@/components/og-wordmark";

export const alt = "Drape";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Same picture for every language: the black wordmark on paper and the three store names (brand names are not translated). */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: "#e9e9e6",
          backgroundImage: "linear-gradient(rgba(11,11,14,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(11,11,14,0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          color: "#0b0b0e",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
          <span>[ AliExpress · SHEIN · Bulchic ]</span>
          <span style={{ color: "#7a2e31" }}>DRP / SS26</span>
        </div>
        <OgWordmark width={1072} />
      </div>
    ),
    size,
  );
}
