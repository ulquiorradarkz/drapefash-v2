import { requireAdminApi } from "@/lib/auth";
import { productPatchSchema } from "@/lib/validation";
import { jsonError, revalidateStorefront, uniqueSlug } from "@/lib/admin-helpers";
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

  const { data, error } = await supabase.from("products").update(update).eq("id", id).select("*").single();
  if (error) return jsonError(error.message, error.code === "PGRST116" ? 404 : 500);
  revalidateStorefront();
  return Response.json({ product: data });
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
