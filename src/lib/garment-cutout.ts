"use client";

import { canOptimize } from "@/components/smart-image";

/**
 * Turns a product picture into a garment cut-out for the 3D mannequin, in the browser:
 * the plain background (white, grey, paper…) is flood-filled away from the edges, stray specks
 * (logos, stars, watermarks) are dropped, and the picture is cropped to the garment.
 * Photos without a plain background are kept whole, like a print pinned on the form.
 */

export type Cutout = {
  canvas: HTMLCanvasElement;
  /** width / height of the cropped garment */
  aspect: number;
  /** average colour of the garment, 0–255 */
  color: [number, number, number];
  /** false when no plain background was found */
  cut: boolean;
};

const MAX = 512;
const cache = new Map<string, Promise<Cutout>>();

/** A same-origin address for the picture, so the canvas can read its pixels. */
export function sameOriginSrc(src: string, width = 640): string {
  if (src.startsWith("/")) return src;
  if (canOptimize(src)) return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=80`;
  return src;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("/")) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

export function loadCutout(src: string): Promise<Cutout> {
  let p = cache.get(src);
  if (!p) {
    p = build(src);
    cache.set(src, p);
    p.catch(() => cache.delete(src));
  }
  return p;
}

async function build(src: string): Promise<Cutout> {
  const img = await loadImage(sameOriginSrc(src));
  const iw = img.naturalWidth || 400;
  const ih = img.naturalHeight || 500;
  const k = Math.min(1, MAX / Math.max(iw, ih));
  const w = Math.max(8, Math.round(iw * k));
  const h = Math.max(8, Math.round(ih * k));
  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const n = w * h;

  // 1. The background colour: the median of the border pixels, and how much of the border matches it.
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const med = (c: number) => {
    const v = border.map((p) => px[p * 4 + c]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const bg = [med(0), med(1), med(2)];
  const TOL = 44;
  const near = (p: number) => {
    const i = p * 4;
    if (px[i + 3] < 30) return true;
    const dr = px[i] - bg[0];
    const dg = px[i + 1] - bg[1];
    const db = px[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db < TOL * TOL;
  };
  const matching = border.filter(near).length / border.length;
  const cut = matching > 0.62;

  const clear = new Uint8Array(n);
  if (cut) {
    // 2. Flood the background in from every edge.
    const stack: number[] = [];
    for (const p of border) {
      if (!clear[p] && near(p)) {
        clear[p] = 1;
        stack.push(p);
      }
    }
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p / w) | 0;
      const visit = (q: number) => {
        if (!clear[q] && near(q)) {
          clear[q] = 1;
          stack.push(q);
        }
      };
      if (x > 0) visit(p - 1);
      if (x < w - 1) visit(p + 1);
      if (y > 0) visit(p - w);
      if (y < h - 1) visit(p + w);
    }

    // 3. Keep the garment: the large connected parts (a pair of shoes is two parts), drop specks.
    const label = new Int32Array(n).fill(-1);
    const sizes: number[] = [];
    for (let s = 0; s < n; s++) {
      if (clear[s] || label[s] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      const st = [s];
      label[s] = id;
      while (st.length) {
        const p = st.pop()!;
        size++;
        const x = p % w;
        const y = (p / w) | 0;
        const visit = (q: number) => {
          if (!clear[q] && label[q] < 0) {
            label[q] = id;
            st.push(q);
          }
        };
        if (x > 0) visit(p - 1);
        if (x < w - 1) visit(p + 1);
        if (y > 0) visit(p - w);
        if (y < h - 1) visit(p + w);
      }
      sizes.push(size);
    }
    const largest = Math.max(0, ...sizes);
    const keep = sizes.map((s) => s >= Math.max(largest * 0.08, n * 0.002));
    for (let p = 0; p < n; p++) if (!clear[p] && !keep[label[p]]) clear[p] = 1;
  }

  // 4. Alpha, a soft edge, the crop box and the average colour.
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (clear[p]) {
        px[i + 3] = 0;
        continue;
      }
      const edge = (x > 0 && clear[p - 1]) || (x < w - 1 && clear[p + 1]) || (y > 0 && clear[p - w]) || (y < h - 1 && clear[p + w]);
      if (edge) px[i + 3] = Math.min(px[i + 3], 150);
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
      count++;
    }
  }
  ctx.putImageData(data, 0, 0);
  if (x1 < x0 || y1 < y0) {
    x0 = 0;
    y0 = 0;
    x1 = w - 1;
    y1 = h - 1;
  }
  // A 2px clear margin, so clamped texture edges stay transparent.
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = document.createElement("canvas");
  out.width = cw + 4;
  out.height = ch + 4;
  out.getContext("2d")!.drawImage(work, x0, y0, cw, ch, 2, 2, cw, ch);
  const c = count || 1;
  return { canvas: out, aspect: cw / ch, color: [Math.round(r / c), Math.round(g / c), Math.round(b / c)], cut };
}
