import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/format";

export async function uniqueSlug(
  supabase: SupabaseClient,
  table: "products" | "categories",
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "item";
  const { data } = await supabase.from(table).select("id, slug").like("slug", `${root}%`).limit(500);
  const taken = new Set((data ?? []).filter((r) => r.id !== excludeId).map((r) => r.slug as string));
  if (!taken.has(root)) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Refresh every storefront page after an admin change (ISR). */
export function revalidateStorefront() {
  revalidatePath("/", "layout");
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}
