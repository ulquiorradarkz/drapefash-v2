import { requireAdminApi } from "@/lib/auth";
import { jsonError } from "@/lib/admin-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Upload a photo from the admin's device into the product-images bucket. */
export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("No file", 400);
  if (!TYPES[file.type]) return jsonError("Use a JPG, PNG, WebP or AVIF image", 415);
  if (file.size > 6_000_000) return jsonError("Image is larger than 6 MB", 413);

  const path = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error } = await auth.supabase.storage
    .from("product-images")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "31536000" });
  if (error) return jsonError(error.message, 500);
  const { data } = auth.supabase.storage.from("product-images").getPublicUrl(path);
  return Response.json({ url: data.publicUrl }, { status: 201 });
}
