"use client";

import { CLOTHING, LABEL, LABEL_STEP, maskUrl } from "@/lib/fitting/labels";
import { loadCutout, sameOriginSrc } from "@/lib/garment-cutout";

/**
 * The fabric for a 3D garment, taken from the product picture. With the clothes mask (photos of people:
 * see app/api/fitting) only the pixels of the garment itself are kept: no skin, no street, no other
 * clothes. Holes (a hand over a pocket, a bag strap) and everything around the garment are filled from
 * the nearest fabric, so the picture can be stretched over the whole draped garment.
 * Pictures on a plain background without a mask use the flood-fill cut-out instead.
 */

export type FabricKind = "top" | "dress" | "pants" | "skirt" | "shoes" | "hat" | "bag";

export type Fabric = {
  /** Opaque picture of the garment, cropped to it, filled to the edges. */
  canvas: HTMLCanvasElement;
  /** Average colour of the garment, 0–255. */
  color: [number, number, number];
  /** True when the garment came from the clothes mask. */
  masked: boolean;
  /** Trousers in a photo: leg width at the knees ÷ width at the hips (baggy > 1, straight ≈ 0.85, skinny < 0.7). */
  legRatio: number | null;
};

const MAX = 512;

const CLASSES: Record<FabricKind, number[][]> = {
  // Candidate groups in order of preference; the first one with enough pixels wins.
  top: [[LABEL.upper, LABEL.scarf], [LABEL.dress], CLOTHING],
  dress: [[LABEL.dress], [LABEL.upper, LABEL.skirt, LABEL.dress], CLOTHING],
  pants: [[LABEL.pants], [LABEL.skirt], CLOTHING],
  skirt: [[LABEL.skirt], [LABEL.pants, LABEL.dress], CLOTHING],
  shoes: [[LABEL.leftShoe, LABEL.rightShoe]],
  hat: [[LABEL.hat]],
  bag: [[LABEL.bag]],
};

const cache = new Map<string, Promise<Fabric>>();

export function loadFabric(slug: string, src: string, kind: FabricKind): Promise<Fabric> {
  const key = `${slug}|${src}|${kind}`;
  let p = cache.get(key);
  if (!p) {
    p = build(slug, src, kind);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
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

type LabelMap = { labels: Uint8Array; width: number; height: number };

async function loadLabels(slug: string, src: string): Promise<LabelMap | null> {
  try {
    const res = await fetch(maskUrl(slug, src));
    if (res.status !== 200) return null;
    const bitmap = await createImageBitmap(await res.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const c = document.createElement("canvas");
    c.width = bitmap.width;
    c.height = bitmap.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const labels = new Uint8Array(c.width * c.height);
    for (let i = 0; i < labels.length; i++) labels[i] = Math.round(px[i * 4] / LABEL_STEP);
    return { labels, width: c.width, height: c.height };
  } catch {
    return null;
  }
}

async function build(slug: string, src: string, kind: FabricKind): Promise<Fabric> {
  const [img, map] = await Promise.all([loadImage(sameOriginSrc(src, 640)), loadLabels(slug, src)]);
  if (map) {
    const fabric = fromMask(img, map, kind);
    if (fabric) return fabric;
  }
  // No mask (drawings, plain-background packshots) or nothing of this kind in it: the flood-fill cut-out.
  const cut = await loadCutout(src);
  const ctx = cut.canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = cut.canvas;
  const data = ctx.getImageData(0, 0, w, h);
  const weight = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) weight[i] = data.data[i * 4 + 3] > 200 ? 1 : 0;
  return { canvas: fill(data, weight, w, h), color: cut.color, masked: false, legRatio: null };
}

function fromMask(img: HTMLImageElement, map: LabelMap, kind: FabricKind): Fabric | null {
  const iw = img.naturalWidth || map.width;
  const ih = img.naturalHeight || map.height;
  const k = Math.min(1, MAX / Math.max(iw, ih));
  const w = Math.max(8, Math.round(iw * k));
  const h = Math.max(8, Math.round(ih * k));
  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);

  // Label of every picture pixel (nearest in the label map).
  const lab = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const my = Math.min(map.height - 1, Math.floor(((y + 0.5) / h) * map.height));
    for (let x = 0; x < w; x++) {
      const mx = Math.min(map.width - 1, Math.floor(((x + 0.5) / w) * map.width));
      lab[y * w + x] = map.labels[my * map.width + mx];
    }
  }
  const counts = new Uint32Array(32);
  for (let i = 0; i < lab.length; i++) counts[lab[i]]++;
  const group = CLASSES[kind].find((g) => g.reduce((n, c) => n + counts[c], 0) > w * h * (kind === "shoes" || kind === "hat" || kind === "bag" ? 0.004 : 0.012));
  if (!group) return null;
  const inGroup = new Uint8Array(32);
  for (const c of group) inGroup[c] = 1;

  // Garment pixels, eroded by one pixel so edge pixels mixed with the background don't tint the fabric.
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = inGroup[lab[i]];
  const core = new Uint8Array(w * h);
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!m[p]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1 && m[p - 1] && m[p + 1] && m[p - w] && m[p + w]) core[p] = 1;
    }
  }
  if (x1 < x0) return null;

  // Sparse rows at the top and bottom (a waistband edge against skin, a stray hem pixel) would tint the
  // whole edge of the garment: start and end where the garment is properly there.
  if (kind !== "shoes" && kind !== "hat" && kind !== "bag") {
    const fills: number[] = [];
    for (let y = y0; y <= y1; y++) {
      let c = 0;
      for (let x = x0; x <= x1; x++) c += m[y * w + x];
      fills.push(c);
    }
    const ref = [...fills].sort((a, b) => a - b)[Math.floor(fills.length * 0.8)] ?? 0;
    const topMin = ref * (kind === "pants" || kind === "skirt" ? 0.5 : 0.4);
    let a = 0;
    let b = fills.length - 1;
    while (a < b && fills[a] < topMin) a++;
    while (b > a && fills[b] < ref * 0.15) b--;
    if (b - a > 8) {
      y1 = y0 + b;
      y0 = y0 + a;
    }
  }

  // Crop to the garment.
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const crop = new ImageData(cw, ch);
  const weight = new Float32Array(cw * ch);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const p = (y + y0) * w + (x + x0);
      const q = y * cw + x;
      crop.data[q * 4] = data.data[p * 4];
      crop.data[q * 4 + 1] = data.data[p * 4 + 1];
      crop.data[q * 4 + 2] = data.data[p * 4 + 2];
      crop.data[q * 4 + 3] = 255;
      if (core[p]) {
        weight[q] = 1;
        r += data.data[p * 4];
        g += data.data[p * 4 + 1];
        b += data.data[p * 4 + 2];
        n++;
      }
    }
  }
  n = n || 1;

  // Trousers: how wide the legs stay towards the hem, compared with the hips.
  let legRatio: number | null = null;
  if (kind === "pants" && group.includes(LABEL.pants)) {
    const rowFill = (fy: number) => {
      const y = y0 + Math.min(ch - 1, Math.floor(fy * ch));
      let c = 0;
      for (let x = x0; x <= x1; x++) c += m[y * w + x];
      return c;
    };
    // Baggy legs are as wide at the knee as at the hips (or wider); skinny ones about half.
    let hip = 0;
    for (let f = 0.06; f <= 0.26; f += 0.02) hip = Math.max(hip, rowFill(f));
    const legs: number[] = [];
    for (let f = 0.4; f <= 0.7; f += 0.03) legs.push(rowFill(f));
    legs.sort((a, c) => a - c);
    if (hip > 0) legRatio = legs[legs.length >> 1] / hip;
  }

  return {
    canvas: fill(crop, weight, cw, ch),
    color: [Math.round(r / n), Math.round(g / n), Math.round(b / n)],
    masked: true,
    legRatio,
  };
}

/**
 * Push-pull fill: pixels with weight 1 keep their colour, every other pixel takes the colour of the
 * nearest fabric, blended smoothly (a weighted image pyramid, averaged down, then pulled back up).
 */
function fill(data: ImageData, weight: Float32Array, w: number, h: number): HTMLCanvasElement {
  type Level = { w: number; h: number; c: Float32Array; a: Float32Array };
  const levels: Level[] = [];
  const c0 = new Float32Array(w * h * 3);
  const a0 = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = weight[i];
    a0[i] = a;
    c0[i * 3] = (data.data[i * 4] / 255) * a;
    c0[i * 3 + 1] = (data.data[i * 4 + 1] / 255) * a;
    c0[i * 3 + 2] = (data.data[i * 4 + 2] / 255) * a;
  }
  levels.push({ w, h, c: c0, a: a0 });
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const f = levels[levels.length - 1];
    const nw = Math.max(1, Math.ceil(f.w / 2));
    const nh = Math.max(1, Math.ceil(f.h / 2));
    const c = new Float32Array(nw * nh * 3);
    const a = new Float32Array(nw * nh);
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const s = y * f.w + x;
        const d = (y >> 1) * nw + (x >> 1);
        a[d] += f.a[s];
        c[d * 3] += f.c[s * 3];
        c[d * 3 + 1] += f.c[s * 3 + 1];
        c[d * 3 + 2] += f.c[s * 3 + 2];
      }
    }
    for (let i = 0; i < nw * nh; i++) {
      if (a[i] > 1) {
        c[i * 3] /= a[i];
        c[i * 3 + 1] /= a[i];
        c[i * 3 + 2] /= a[i];
        a[i] = 1;
      }
    }
    levels.push({ w: nw, h: nh, c, a });
  }
  // Pull: each level fills what it lacks from the (bilinearly sampled) coarser level.
  for (let l = levels.length - 2; l >= 0; l--) {
    const f = levels[l];
    const g = levels[l + 1];
    for (let y = 0; y < f.h; y++) {
      const gy = Math.min(g.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const y0 = Math.floor(gy);
      const y1 = Math.min(g.h - 1, y0 + 1);
      const ty = gy - y0;
      for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        const rest = 1 - f.a[i];
        if (rest <= 0) continue;
        const gx = Math.min(g.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const x0 = Math.floor(gx);
        const x1 = Math.min(g.w - 1, x0 + 1);
        const tx = gx - x0;
        for (let ch = 0; ch < 3; ch++) {
          const v =
            (g.c[(y0 * g.w + x0) * 3 + ch] * (1 - tx) + g.c[(y0 * g.w + x1) * 3 + ch] * tx) * (1 - ty) +
            (g.c[(y1 * g.w + x0) * 3 + ch] * (1 - tx) + g.c[(y1 * g.w + x1) * 3 + ch] * tx) * ty;
          f.c[i * 3 + ch] += rest * v;
        }
        f.a[i] = 1;
      }
    }
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(w, h);
  const c = levels[0].c;
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = Math.round(Math.min(1, c[i * 3]) * 255);
    img.data[i * 4 + 1] = Math.round(Math.min(1, c[i * 3 + 1]) * 255);
    img.data[i * 4 + 2] = Math.round(Math.min(1, c[i * 3 + 2]) * 255);
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}
