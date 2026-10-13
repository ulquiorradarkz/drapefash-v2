import { requireAdminApi } from "@/lib/auth";
import { categoryInputSchema, reorderSchema } from "@/lib/validation";
import { jsonError, revalidateStorefront, uniqueSlug } from "@/lib/admin-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 422);

  const supabase = auth.supabase;
  const slug = await uniqueSlug(supabase, "categories", parsed.data.slug || parsed.data.name);
  const { data: last } = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sort_order = (last?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name, gender: parsed.data.gender, slug, sort_order })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  revalidateStorefront();
  return Response.json({ category: data }, { status: 201 });
}

/** Reorder: body { ids: [...] } in the desired order. */
export async function PUT(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid order", 422);

  const results = await Promise.all(
    parsed.data.ids.map((id, index) => auth.supabase.from("categories").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return jsonError(failed.error.message, 500);
  revalidateStorefront();
  return Response.json({ ok: true });
}
