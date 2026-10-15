import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { InferenceSession } from "onnxruntime-node";
import { LABEL_STEP } from "@/lib/fitting/labels";

/**
 * Clothes segmentation for the fitting room: which pixels of a product picture are the top, the trousers,
 * the shoes, the model's skin or the background. SegFormer-B2 fine-tuned on ATR (MIT, mattmdjaga/segformer_b2_clothes),
 * 8-bit ONNX export by Xenova, run with onnxruntime on the server. The model is downloaded once per server
 * instance and kept in the temp folder.
 */

const MODEL_URL = process.env.FITTING_MODEL_URL || "https://huggingface.co/Xenova/segformer_b2_clothes/resolve/main/onnx/model_quantized.onnx";
const MODEL_FILE = path.join(os.tmpdir(), "drape-segformer-b2-clothes-q8.onnx");
const INPUT = 512;
/** Long side of the stored label map. */
const MASK_SIZE = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

type Ort = typeof import("onnxruntime-node");
let loading: Promise<{ ort: Ort; session: InferenceSession }> | null = null;

async function modelBytes(): Promise<Uint8Array> {
  try {
    const cached = await fs.readFile(MODEL_FILE);
    if (cached.byteLength > 1_000_000) return new Uint8Array(cached);
  } catch {
    /* not downloaded yet on this instance */
  }
  const res = await fetch(MODEL_URL, { signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`segmentation model download failed (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await fs.writeFile(MODEL_FILE, bytes).catch(() => undefined);
  return bytes;
}

function model() {
  if (!loading) {
    loading = (async () => {
      const ort = await import("onnxruntime-node");
      const session = await ort.InferenceSession.create(await modelBytes(), { graphOptimizationLevel: "all" });
      return { ort, session };
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

export type Labels = { labels: Uint8Array; width: number; height: number };

/** Per-pixel clothing classes (see lib/fitting/labels.ts) at up to MASK_SIZE pixels on the long side. */
export async function segment(image: Buffer): Promise<Labels> {
  const meta = await sharp(image, { failOn: "none" }).metadata();
  // Photos taken sideways carry an orientation flag; browsers show them turned, so do we.
  const turned = (meta.orientation ?? 1) >= 5;
  const iw = (turned ? meta.height : meta.width) ?? INPUT;
  const ih = (turned ? meta.width : meta.height) ?? INPUT;
  const rgb = await sharp(image, { failOn: "none", autoOrient: true }).removeAlpha().resize(INPUT, INPUT, { fit: "fill" }).raw().toBuffer();
  const plane = INPUT * INPUT;
  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) input[c * plane + i] = (rgb[i * 3 + c] / 255 - MEAN[c]) / STD[c];
  }
  const { ort, session } = await model();
  const result = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, INPUT, INPUT]) });
  const logits = result[session.outputNames[0]];
  const [, classes, lh, lw] = logits.dims as number[];
  const L = logits.data as Float32Array;

  // Upsample the logits bilinearly to the label map (in the picture's own proportions), then take the best class.
  const k = MASK_SIZE / Math.max(iw, ih);
  const width = Math.max(1, Math.round(iw * k));
  const height = Math.max(1, Math.round(ih * k));
  const labels = new Uint8Array(width * height);
  const lplane = lw * lh;
  for (let y = 0; y < height; y++) {
    const fy = Math.min(lh - 1, Math.max(0, ((y + 0.5) / height) * lh - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(lh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(lw - 1, Math.max(0, ((x + 0.5) / width) * lw - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(lw - 1, x0 + 1);
      const tx = fx - x0;
      let best = 0;
      let bestV = -Infinity;
      for (let c = 0; c < classes; c++) {
        const o = c * lplane;
        const v =
          (L[o + y0 * lw + x0] * (1 - tx) + L[o + y0 * lw + x1] * tx) * (1 - ty) +
          (L[o + y1 * lw + x0] * (1 - tx) + L[o + y1 * lw + x1] * tx) * ty;
        if (v > bestV) {
          bestV = v;
          best = c;
        }
      }
      labels[y * width + x] = best;
    }
  }
  return { labels, width, height };
}

/** Grey PNG: class × LABEL_STEP, so small colour handling changes on the way can't flip a class. */
export function labelsToPng({ labels, width, height }: Labels): Promise<Buffer> {
  const grey = Buffer.alloc(labels.length);
  for (let i = 0; i < labels.length; i++) grey[i] = labels[i] * LABEL_STEP;
  return sharp(grey, { raw: { width, height, channels: 1 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
}
