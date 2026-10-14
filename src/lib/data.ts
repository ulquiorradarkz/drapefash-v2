import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import type { Locale } from "@/i18n/config";
import { STORES, type Category, type Gender, type ProductWithCategory, type Store } from "@/lib/types";
import { codeCandidates } from "@/lib/code";

const PRODUCT_COLUMNS =
  "id, slug, title, description, price, currency, original_price, images, category_id, store, source_url, affiliate_url, gender, is_published, is_featured, created_at, updated_at";

/**
 * Columns added by later migrations: `translations` (20261013000003) and `code` (20261014000001).
 * Until a migration is applied we leave its column out instead of failing, and remember that
 * for this process.
 */
let translationsColumn = true;
let codeColumn = true;

function productSelect(): string {
  const extra = codeColumn ? ", code" : "";
  return translationsColumn
    ? `${PRODUCT_COLUMNS}${extra}, translations, category:categories(id, name, slug, translations)`
    : `${PRODUCT_COLUMNS}${extra}, category:categories(id, name, slug)`;
}

function categorySelect(): string {
  return translationsColumn ? "id, name, slug, gender, sort_order, translations" : "id, name, slug, gender, sort_order";
}

type Result = { data: unknown; error: { message: string } | null };

/** True when the error says this column is missing (the migration that adds it has not run). */
function missingColumn(message: string, column: string): boolean {
  return new RegExp(`\\b${column}\\b`, "i").test(message) && /does not exist|schema cache|could not find/i.test(message);
}

async function query(run: () => PromiseLike<Result>): Promise<unknown> {
  let { data, error } = await run();
  // Parallel queries can fail before the first one flips a flag, so every one of them retries.
  for (let attempt = 0; error && attempt < 2; attempt++) {
    // Another query may already have flipped the flag: retry whenever the error names the column.
    if (/translations/i.test(error.message)) translationsColumn = false;
    else if (missingColumn(error.message, "code")) codeColumn = false;
    else break;
    ({ data, error } = await run());
  }
  if (error) throw error;
  return data;
}

/**
 * Local preview of draft products: run `next dev` with DRAPE_PREVIEW_DRAFTS=1.
 * Uses the service role and skips the published filter. Never active in production.
 */
const PREVIEW_DRAFTS = process.env.NODE_ENV === "development" && process.env.DRAPE_PREVIEW_DRAFTS === "1";

function db(): SupabaseClient {
  return (PREVIEW_DRAFTS && createServiceSupabase()) || createPublicSupabase();
}

/**
 * Dev preview only: before the code migration runs, give the seed drafts the IDs that
 * migration will give them (p01.svg → DRP-001), so the item-ID screens can be designed.
 */
function previewCode(p: ProductWithCategory): string | null {
  if (!PREVIEW_DRAFTS || codeColumn) return p.code ?? null;
  const m = /^\/legacy\/products\/p(\d+)\.svg$/.exec(p.images?.[0] ?? "");
  return m ? `DRP-${m[1].padStart(3, "0")}` : null;
}

function normalize(rows: unknown): ProductWithCategory[] {
  return ((rows ?? []) as ProductWithCategory[]).map((p) => ({
    ...p,
    code: p.code ?? previewCode(p),
    price: p.price === null ? null : Number(p.price),
    original_price: p.original_price === null ? null : Number(p.original_price),
    category: Array.isArray(p.category) ? (p.category[0] ?? null) : p.category,
  }));
}

export type SortKey = "featured" | "new" | "price-asc" | "price-desc";
export const SORT_KEYS: SortKey[] = ["featured", "new", "price-asc", "price-desc"];

export type ListOptions = {
  gender?: Gender;
  categoryId?: string;
  store?: Store;
  featured?: boolean;
  maxPrice?: number;
  query?: string;
  /** Also search the product text written in this language. */
  locale?: Locale;
  sort?: SortKey;
  limit?: number;
  excludeId?: string;
};

export async function listProducts(opts: ListOptions = {}): Promise<ProductWithCategory[]> {
  if (!hasSupabase) return [];
  const term = (opts.query ?? "").replace(/[%_,()*\\"]/g, " ").trim().slice(0, 80);
  const build = (searchTranslations: boolean) => () => {
    let q = db().from("products").select(productSelect());
    if (!PREVIEW_DRAFTS) q = q.eq("is_published", true);
    if (opts.gender && opts.gender !== "unisex") q = q.in("gender", [opts.gender, "unisex"]);
    if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
    if (opts.store) q = q.eq("store", opts.store);
    if (opts.featured) q = q.eq("is_featured", true);
    if (opts.maxPrice !== undefined) q = q.lte("price", opts.maxPrice);
    if (opts.excludeId) q = q.neq("id", opts.excludeId);
    if (term) {
      const fields = [`title.ilike.%${term}%`, `description.ilike.%${term}%`];
      if (codeColumn) fields.push(`code.ilike.%${term}%`);
      if (searchTranslations && opts.locale && opts.locale !== "en") fields.push(`translations->${opts.locale}->>title.ilike.%${term}%`);
      q = q.or(fields.join(","));
    }
    switch (opts.sort ?? "featured") {
      case "new":
        q = q.order("created_at", { ascending: false });
        break;
      case "price-asc":
        q = q.order("price", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
        break;
      case "price-desc":
        q = q.order("price", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
        break;
      default:
        q = q.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
    }
    return q.limit(opts.limit ?? 48);
  };
  try {
    return normalize(await query(build(translationsColumn)));
  } catch (e) {
    if (term && translationsColumn) {
      // The JSON path filter is the only unusual part of the query; retry without it.
      try {
        return normalize(await query(build(false)));
      } catch {
        /* fall through to the logged error */
      }
    }
    console.error("[data] listProducts failed", e);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  if (!hasSupabase) return null;
  try {
    const data = await query(() => {
      let q = db().from("products").select(productSelect()).eq("slug", slug);
      if (!PREVIEW_DRAFTS) q = q.eq("is_published", true);
      return q.maybeSingle();
    });
    return data ? normalize([data])[0] : null;
  } catch (e) {
    console.error("[data] getProductBySlug failed", e);
    return null;
  }
}

/**
 * The product a visitor means when they type an item ID ("DRP-014", "drp 14", "14").
 * Null when the term is not an ID or no published product has it.
 */
export async function getProductByCode(term: string): Promise<ProductWithCategory | null> {
  if (!hasSupabase) return null;
  const candidates = codeCandidates(term);
  if (!candidates.length) return null;
  const rank = (p: ProductWithCategory) => candidates.indexOf(p.code ?? "");
  const best = (rows: ProductWithCategory[]) => rows.filter((p) => rank(p) >= 0).sort((a, b) => rank(a) - rank(b))[0] ?? null;
  if (codeColumn) {
    try {
      const data = await query(() => {
        let q = db().from("products").select(productSelect()).in("code", candidates);
        if (!PREVIEW_DRAFTS) q = q.eq("is_published", true);
        return q.limit(candidates.length);
      });
      return best(normalize(data));
    } catch (e) {
      if (codeColumn) {
        console.error("[data] getProductByCode failed", e);
        return null;
      }
      // The code column is missing: only the dev preview can still answer (see previewCode).
    }
  }
  if (!PREVIEW_DRAFTS) return null;
  return best(await listProducts({ limit: 500, sort: "new" }));
}

/** Fresh, published copies of the products a visitor saved (their picks), in the order asked. */
export async function getProductsBySlugs(slugs: string[]): Promise<ProductWithCategory[]> {
  if (!hasSupabase || !slugs.length) return [];
  try {
    const data = await query(() => {
      let q = db().from("products").select(productSelect()).in("slug", slugs.slice(0, 60));
      if (!PREVIEW_DRAFTS) q = q.eq("is_published", true);
      return q.limit(60);
    });
    const bySlug = new Map(normalize(data).map((p) => [p.slug, p]));
    return slugs.map((s) => bySlug.get(s)).filter((p): p is ProductWithCategory => !!p);
  } catch (e) {
    console.error("[data] getProductsBySlugs failed", e);
    return [];
  }
}

export async function listCategories(): Promise<Category[]> {
  if (!hasSupabase) return [];
  try {
    const data = await query(() => db().from("categories").select(categorySelect()).order("sort_order").order("name"));
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

export type CatalogStats = {
  total: number;
  byStore: Record<Store, number>;
  byCategory: Record<string, { count: number; minPrice: number | null }>;
  minPrice: number | null;
  maxPrice: number | null;
};

/** Counts for the home page: pieces per store and per category, and the price range. */
export async function getCatalogStats(): Promise<CatalogStats> {
  const empty: CatalogStats = {
    total: 0,
    byStore: Object.fromEntries(STORES.map((s) => [s, 0])) as Record<Store, number>,
    byCategory: {},
    minPrice: null,
    maxPrice: null,
  };
  if (!hasSupabase) return empty;
  try {
    let q = db().from("products").select("store, price, category_id");
    if (!PREVIEW_DRAFTS) q = q.eq("is_published", true);
    const { data, error } = await q.limit(5000);
    if (error) throw error;
    const stats = empty;
    for (const row of (data ?? []) as { store: Store; price: number | string | null; category_id: string | null }[]) {
      const price = row.price === null ? null : Number(row.price);
      stats.total += 1;
      stats.byStore[row.store] = (stats.byStore[row.store] ?? 0) + 1;
      if (row.category_id) {
        const c = (stats.byCategory[row.category_id] ??= { count: 0, minPrice: null });
        c.count += 1;
        if (price !== null) c.minPrice = c.minPrice === null ? price : Math.min(c.minPrice, price);
      }
      if (price !== null) {
        stats.minPrice = stats.minPrice === null ? price : Math.min(stats.minPrice, price);
        stats.maxPrice = stats.maxPrice === null ? price : Math.max(stats.maxPrice, price);
      }
    }
    return stats;
  } catch (e) {
    console.error("[data] getCatalogStats failed", e);
    return empty;
  }
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
