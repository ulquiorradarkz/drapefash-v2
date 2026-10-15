import { requireAdminApi } from "@/lib/auth";
import { productInputSchema } from "@/lib/validation";
import {
  DUPLICATE_CODE_MESSAGE,
  NO_CODE_COLUMN_WARNING,
  isDuplicateCode,
  isMissingCodeColumn,
  jsonError,
  nextFreeCode,
  revalidateStorefront,
  uniqueSlug,
} from "@/lib/admin-helpers";
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
  const store = input.store === "other" ? detectStore(input.source_url || input.affiliate_url) : input.store;

  // Every piece gets an item ID: the one typed in the form, or the next free DRP number.
  const code = input.code ?? (await nextFreeCode(supabase));
  const row: Record<string, unknown> = { ...input, store, slug, code };
  if (!code) delete row.code;
  const warnings: string[] = [];
  let { data: created, error } = await supabase.from("products").insert(row).select("*").single();
  for (let attempt = 0; error && attempt < 2; attempt++) {
    // A database without the latest migrations: save the rest, tell the owner.
    if ("translations" in row && /translations/i.test(error.message)) {
      delete row.translations;
      warnings.push("Saved without translations: run the latest database migration to store names in other languages.");
    } else if ("code" in row && isMissingCodeColumn(error)) {
      delete row.code;
      warnings.push(NO_CODE_COLUMN_WARNING);
    } else break;
    ({ data: created, error } = await supabase.from("products").insert(row).select("*").single());
  }
  if (isDuplicateCode(error)) return jsonError(DUPLICATE_CODE_MESSAGE, 409);
  if (error || !created) return jsonError(error?.message ?? "Could not create product", 500);
  const warning = warnings.length ? warnings.join(" ") : undefined;

  let product = created;
  if (rehost_images && input.images.length) {
    const images = await rehostImages(supabase, created.id, input.images);
    if (images.join("|") !== input.images.join("|")) {
      const { data: updated } = await supabase.from("products").update({ images }).eq("id", created.id).select("*").single();
      if (updated) product = updated;
    }
  }

  revalidateStorefront();
  return Response.json({ product, warning }, { status: 201 });
}
