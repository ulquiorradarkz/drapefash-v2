import { ImageResponse } from "next/og";

export const alt = "Drape: chrome-cut fashion finds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#08080c",
          backgroundImage: "linear-gradient(135deg, #0e2a33 0%, #08080c 45%, #08080c 60%, #2a1f4a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 250,
            fontWeight: 900,
            letterSpacing: "-0.06em",
            backgroundImage: "linear-gradient(180deg, #ffffff 0%, #e8ebf0 25%, #8d95a3 48%, #2b2f38 50%, #c6ccd6 54%, #ffffff 75%, #9aa1ad 100%)",
            backgroundClip: "text",
            color: "transparent",
            lineHeight: 1,
          }}
        >
          Drape
        </div>
        <div style={{ marginTop: 24, fontSize: 36, color: "rgba(255,255,255,0.75)" }}>Chrome-cut fashion finds · AliExpress · SHEIN · Bulchic</div>
      </div>
    ),
    size,
  );
}
