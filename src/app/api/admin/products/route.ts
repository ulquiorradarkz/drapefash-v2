import { requireAdminApi } from "@/lib/auth";
import { productInputSchema } from "@/lib/validation";
import { jsonError, revalidateStorefront, uniqueSlug } from "@/lib/admin-helpers";
import { rehostImages } from "@/lib/images";
import { detectStore } from "@/lib/stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase
    .from("products")
    .select("*, category:categories(id, name, slug)")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return jsonError(error.message, 500);
  return Response.json({ products: data });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
  }
  const { rehost_images, ...input } = parsed.data;
  const supabase = auth.supabase;

  const slug = await uniqueSlug(supabase, "products", input.slug || input.title);
  const store = input.store === "other" && input.source_url ? detectStore(input.source_url) : input.store;

  const { data: created, error } = await supabase
    .from("products")
    .insert({ ...input, store, slug })
    .select("*")
    .single();
  if (error || !created) return jsonError(error?.message ?? "Could not create product", 500);

  let product = created;
  if (rehost_images && input.images.length) {
    const images = await rehostImages(supabase, created.id, input.images);
    if (images.join("|") !== input.images.join("|")) {
      const { data: updated } = await supabase.from("products").update({ images }).eq("id", created.id).select("*").single();
      if (updated) product = updated;
    }
  }

  revalidateStorefront();
  return Response.json({ product }, { status: 201 });
}
