import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/format";
import { CODE_PREFIX, nextCode } from "@/lib/code";

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

/** Refresh every storefront page, in every language, after an admin change (ISR). */
export function revalidateStorefront() {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/", "layout");
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

/** Next free item ID (DRP-001, DRP-002 …). Null when the database has no code column yet. */
export async function nextFreeCode(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.from("products").select("code").like("code", `${CODE_PREFIX}-%`).limit(5000);
  if (error) return null;
  return nextCode((data ?? []).map((r) => r.code as string | null));
}

/** Postgres refused a second product with the same item ID. */
export function isDuplicateCode(error: { code?: string; message: string } | null): boolean {
  return !!error && (error.code === "23505" || /duplicate key/i.test(error.message)) && /code/i.test(error.message);
}

/** The code column does not exist yet (migration 20261014000001 not applied). */
export function isMissingCodeColumn(error: { message: string } | null): boolean {
  return !!error && /\bcode\b/i.test(error.message) && /does not exist|schema cache|could not find/i.test(error.message);
}

export const DUPLICATE_CODE_MESSAGE = "This item ID is already used by another piece. Pick a different one.";
export const NO_CODE_COLUMN_WARNING = "Saved without the item ID: run the latest database migration to store item IDs.";
