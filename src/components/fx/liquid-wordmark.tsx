"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Wordmark, WORDMARK_PATH, WORDMARK_RATIO, WORDMARK_STAR, WORDMARK_VIEWBOX, sparklePath } from "@/components/wordmark";
import { useReduced } from "@/lib/use-reduced";
import { cn } from "@/lib/utils";

const LiquidMetal = dynamic(() => import("@paper-design/shaders-react").then((m) => m.LiquidMetal), { ssr: false });

/** The wordmark as a white-on-transparent picture: the mask Paper's liquid-metal shader pours itself into. */
function maskUrl(): string {
  const [x, y, w, h] = WORDMARK_VIEWBOX.split(" ").map(Number);
  const W = 2088;
  const H = Math.round(W / WORDMARK_RATIO);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}"><path d="${WORDMARK_PATH}" fill="#fff"/><path d="${sparklePath(WORDMARK_STAR.cx, WORDMARK_STAR.cy, WORDMARK_STAR.r)}" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * The name, poured in liquid metal: the same effect as Paper's liquid-logo, from their open shaders
 * (@paper-design/shaders-react, Apache-2.0). The plain wordmark sits beneath it in chrome grey, in the
 * same box, so the monument never jumps and never disappears when WebGL is missing or slow.
 */
export function LiquidWordmark({ className, tint = "#9aa3ff" }: { className?: string; tint?: string }) {
  const reduce = useReduced();
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (c.getContext("webgl2")) setSrc(maskUrl());
    } catch {
      /* no WebGL: keep the plain wordmark */
    }
  }, []);

  useEffect(() => {
    if (!src) return;
    // The shader processes the mask before its first frame; reveal it once it has had time to draw.
    const t = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(t);
  }, [src]);

  return (
    <div aria-hidden className={cn("relative", className)} style={{ aspectRatio: String(WORDMARK_RATIO) }}>
      {/* Stays underneath: if the shader never paints (no GPU, a headless browser), the name is still there. */}
      <Wordmark className="absolute inset-0 size-full text-silver" />
      {src && (
        <LiquidMetal
          image={src}
          className={cn("absolute inset-0 size-full transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          fit="contain"
          scale={1}
          speed={reduce ? 0 : 0.62}
          colorBack="#00000000"
          colorTint={tint}
          repetition={2.4}
          softness={0.18}
          shiftRed={0.32}
          shiftBlue={0.32}
          distortion={0.08}
          contour={0.5}
          angle={64}
          shape="none"
        />
      )}
    </div>
  );
}
