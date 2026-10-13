import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertPublicUrl } from "@/lib/import/fetch";
import { SUPABASE_URL } from "@/lib/env";

const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 8_000_000;

export function isStorageUrl(url: string): boolean {
  return !!SUPABASE_URL && url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`);
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/**
 * Copies remote product images into Supabase Storage so the storefront doesn't depend on
 * store CDNs (which may block hot-linking or expire). Any image that fails stays as-is.
 */
export async function rehostImages(supabase: SupabaseClient, productId: string, images: string[]): Promise<string[]> {
  const out: string[] = [];
  let i = 0;
  for (const src of images) {
    i++;
    if (!/^https?:\/\//i.test(src) || isStorageUrl(src)) {
      out.push(src);
      continue;
    }
    try {
      const url = await assertPublicUrl(src);
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DrapeImageFetcher/1.0)", Accept: "image/avif,image/webp,image/*" },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!res.ok || !EXT[type]) throw new Error(`bad response ${res.status} ${type}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_IMAGE_BYTES || buf.byteLength < 500) throw new Error("bad size");
      const path = `${productId}/${Date.now().toString(36)}-${i}.${EXT[type]}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true, cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      out.push(data.publicUrl);
    } catch (e) {
      console.warn("[rehost] kept original image", src, e instanceof Error ? e.message : e);
      out.push(src);
    }
  }
  return out;
}
