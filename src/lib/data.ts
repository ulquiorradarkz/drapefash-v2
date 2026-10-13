import "server-only";
import { createPublicSupabase } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import type { Category, Gender, ProductWithCategory } from "@/lib/types";

const PRODUCT_SELECT =
  "id, slug, title, description, price, currency, original_price, images, category_id, store, source_url, affiliate_url, gender, is_published, is_featured, created_at, updated_at, category:categories(id, name, slug)";

type ListOptions = {
  gender?: Gender;
  categoryId?: string;
  featured?: boolean;
  query?: string;
  limit?: number;
  excludeId?: string;
};

function normalize(rows: unknown[] | null): ProductWithCategory[] {
  return ((rows ?? []) as ProductWithCategory[]).map((p) => ({
    ...p,
    price: p.price === null ? null : Number(p.price),
    original_price: p.original_price === null ? null : Number(p.original_price),
    category: Array.isArray(p.category) ? (p.category[0] ?? null) : p.category,
  }));
}

export async function listProducts(opts: ListOptions = {}): Promise<ProductWithCategory[]> {
  if (!hasSupabase) return [];
  try {
    let q = createPublicSupabase()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 48);
    if (opts.gender && opts.gender !== "unisex") q = q.in("gender", [opts.gender, "unisex"]);
    if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
    if (opts.featured) q = q.eq("is_featured", true);
    if (opts.excludeId) q = q.neq("id", opts.excludeId);
    if (opts.query) {
      const term = opts.query.replace(/[%_,()*]/g, " ").trim().slice(0, 80);
      if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return normalize(data);
  } catch (e) {
    console.error("[data] listProducts failed", e);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  if (!hasSupabase) return null;
  try {
    const { data, error } = await createPublicSupabase()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    return data ? normalize([data])[0] : null;
  } catch (e) {
    console.error("[data] getProductBySlug failed", e);
    return null;
  }
}

export async function listCategories(): Promise<Category[]> {
  if (!hasSupabase) return [];
  try {
    const { data, error } = await createPublicSupabase()
      .from("categories")
      .select("id, name, slug, gender, sort_order")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return (data ?? []) as Category[];
  } catch (e) {
    console.error("[data] listCategories failed", e);
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const all = await listCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function listPublishedSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  if (!hasSupabase) return [];
  try {
    const { data, error } = await createPublicSupabase()
      .from("products")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
