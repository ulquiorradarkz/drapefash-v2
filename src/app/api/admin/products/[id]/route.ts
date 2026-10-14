import { requireAdminApi } from "@/lib/auth";
import { productPatchSchema } from "@/lib/validation";
import {
  DUPLICATE_CODE_MESSAGE,
  NO_CODE_COLUMN_WARNING,
  isDuplicateCode,
  isMissingCodeColumn,
  jsonError,
  revalidateStorefront,
  uniqueSlug,
} from "@/lib/admin-helpers";
import { rehostImages } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Invalid id", 400);

  const body = await request.json().catch(() => null);
  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
  }
  const { rehost_images, ...patch } = parsed.data;
  const supabase = auth.supabase;

  // Only send keys that were actually provided.
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (body && typeof body === "object" && k in (body as object)) update[k] = v;
  }
  if ("slug" in update || "title" in update) {
    const wanted = (update.slug as string | undefined) || "";
    if (wanted) update.slug = await uniqueSlug(supabase, "products", wanted, id);
    else delete update.slug;
  }
  if (rehost_images && Array.isArray(update.images) && update.images.length) {
    update.images = await rehostImages(supabase, id, update.images as string[]);
  }
  if (!Object.keys(update).length) return jsonError("Nothing to update", 400);

  let { data, error } = await supabase.from("products").update(update).eq("id", id).select("*").single();
  const warnings: string[] = [];
  for (let attempt = 0; error && attempt < 2; attempt++) {
    // A database without the latest migrations: save the rest, tell the owner.
    if ("translations" in update && /translations/i.test(error.message)) {
      delete update.translations;
      warnings.push("Saved without translations: run the latest database migration to store names in other languages.");
    } else if ("code" in update && isMissingCodeColumn(error)) {
      delete update.code;
      warnings.push(NO_CODE_COLUMN_WARNING);
    } else break;
    if (!Object.keys(update).length) return jsonError(warnings.join(" "), 409);
    ({ data, error } = await supabase.from("products").update(update).eq("id", id).select("*").single());
  }
  if (isDuplicateCode(error)) return jsonError(DUPLICATE_CODE_MESSAGE, 409);
  if (error) return jsonError(error.message, error.code === "PGRST116" ? 404 : 500);
  revalidateStorefront();
  return Response.json({ product: data, warning: warnings.length ? warnings.join(" ") : undefined });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Invalid id", 400);

  const supabase = auth.supabase;
  // Remove copied images from storage (best effort).
  const { data: files } = await supabase.storage.from("product-images").list(id, { limit: 100 });
  if (files?.length) {
    await supabase.storage.from("product-images").remove(files.map((f) => `${id}/${f.name}`));
  }
  const { error, count } = await supabase.from("products").delete({ count: "exact" }).eq("id", id);
  if (error) return jsonError(error.message, 500);
  if (!count) return jsonError("Product not found", 404);
  revalidateStorefront();
  return Response.json({ ok: true });
}
