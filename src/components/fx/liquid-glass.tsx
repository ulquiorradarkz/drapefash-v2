"use client";

import { useEffect, useId, useRef, useState, type ElementType, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A liquid-glass lens: the backdrop bends at the rim the way a thick drop of glass does, and is
 * frosted and brightened in the middle.
 *
 * The edge profile is ported from liquid-glass-js (github.com/dashersw/liquid-glass-js, MIT): a signed
 * distance to the rounded rectangle, a refraction that is strongest at the rim and fades to nothing
 * a bezel's width inside it. That library samples an html2canvas snapshot of the page in WebGL, which
 * cannot see a live WebGL scene or cross-origin product pictures, so here the same profile is baked
 * into a displacement map that an SVG filter applies to the live backdrop. Chromium renders that
 * filter as a backdrop filter; every other browser keeps the frosted fallback in effects.css.
 */
type Props<T extends ElementType> = {
  as?: T;
  /** Corner radius in px. 999 makes a pill. */
  radius?: number;
  /** Width of the refracting rim in px. */
  bezel?: number;
  /** How far the rim pushes the backdrop, in px. */
  strength?: number;
  /** Frost in the middle, in px of blur. */
  frost?: number;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

let chromium: boolean | null = null;
function supportsLens() {
  if (chromium !== null) return chromium;
  const ua = navigator.userAgent;
  // Backdrop filters that reference SVG filters only render in desktop and Android Chromium.
  chromium = /Chrome\/\d+/.test(ua) && !/Firefox|FxiOS|CriOS|iPhone|iPad|Macintosh.*Mobile/.test(ua);
  return chromium;
}

export function LiquidGlass<T extends ElementType = "div">({
  as,
  radius = 999,
  bezel = 16,
  strength = 34,
  frost = 3,
  className,
  children,
  ...rest
}: Props<T>) {
  // Typed as a div for the props below; the element itself may be a link or a button.
  const Tag = (as ?? "div") as "div";
  const ref = useRef<HTMLElement>(null);
  const rawId = useId();
  const id = `lg${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [map, setMap] = useState<{ href: string; w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsLens()) return;
    let frame = 0;
    let last = "";
    const draw = () => {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      const key = `${w}x${h}`;
      if (!w || !h || key === last) return;
      last = key;
      setMap({ href: displacementMap(w, h, Math.min(radius, h / 2, w / 2), bezel), w, h });
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [radius, bezel]);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      data-lens={map ? "" : undefined}
      className={cn("lg", className)}
      style={{ borderRadius: radius, ...(map ? { backdropFilter: `url(#${id})`, WebkitBackdropFilter: `url(#${id})` } : null) }}
      {...rest}
    >
      {map && (
        <svg aria-hidden focusable="false" width="0" height="0" className="absolute">
          <filter id={id} x="0" y="0" width={map.w} height={map.h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={frost} result="frost" />
            <feImage href={map.href} x="0" y="0" width={map.w} height={map.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="frost" in2="map" scale={strength} xChannelSelector="R" yChannelSelector="G" result="bent" />
            <feColorMatrix in="bent" type="saturate" values="1.7" />
          </filter>
        </svg>
      )}
      {children}
    </Tag>
  );
}

/**
 * The lens as a displacement map, drawn at half size and stretched by the filter. Red and green carry
 * the horizontal and vertical push (128 is none). Inside the bezel the push points along the surface
 * normal of the rounded rectangle and grows towards the rim on a convex curve, as through a thick lens.
 */
function displacementMap(w: number, h: number, r: number, bezel: number): string {
  const s = 0.5;
  const cw = Math.max(2, Math.round(w * s));
  const ch = Math.max(2, Math.round(h * s));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(cw, ch);
  const hx = w / 2;
  const hy = h / 2;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = (x + 0.5) / s - hx;
      const py = (y + 0.5) / s - hy;
      // Signed distance to the rounded rectangle (negative inside), as in liquid-glass-js.
      const qx = Math.abs(px) - (hx - r);
      const qy = Math.abs(py) - (hy - r);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      const d = outside + inside - r;
      // Surface normal: the gradient of the distance field.
      let nx = 0;
      let ny = 0;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1;
        nx = (qx / l) * Math.sign(px);
        ny = (qy / l) * Math.sign(py);
      } else if (qx > qy) {
        nx = Math.sign(px);
      } else {
        ny = Math.sign(py);
      }
      const depth = Math.min(Math.max(-d / bezel, 0), 1);
      const push = depth >= 1 ? 0 : Math.pow(1 - depth, 2.2);
      const i = (y * cw + x) * 4;
      img.data[i] = 128 - nx * push * 127;
      img.data[i + 1] = 128 - ny * push * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
