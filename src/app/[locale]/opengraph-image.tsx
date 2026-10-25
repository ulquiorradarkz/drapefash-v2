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
          backgroundColor: "#1c1c1c",
          color: "#f1f1ef",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
          <span>AliExpress · SHEIN · Bulchic</span>
          <span style={{ color: "#8fa68e" }}>DRP / SS26</span>
        </div>
        <OgWordmark width={1072} />
      </div>
    ),
    size,
  );
}
