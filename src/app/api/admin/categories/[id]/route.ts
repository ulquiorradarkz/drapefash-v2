import { requireAdminApi } from "@/lib/auth";
import { categoryInputSchema } from "@/lib/validation";
import { jsonError, revalidateStorefront, uniqueSlug } from "@/lib/admin-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const slug = await uniqueSlug(auth.supabase, "categories", parsed.data.slug || parsed.data.name, id);
  const { data, error } = await auth.supabase
    .from("categories")
    .update({ name: parsed.data.name, gender: parsed.data.gender, slug })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  revalidateStorefront();
  return Response.json({ category: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  // products.category_id is ON DELETE SET NULL, so products are kept (uncategorised).
  const { error, count } = await auth.supabase.from("categories").delete({ count: "exact" }).eq("id", id);
  if (error) return jsonError(error.message, 500);
  if (!count) return jsonError("Category not found", 404);
  revalidateStorefront();
  return Response.json({ ok: true });
}
