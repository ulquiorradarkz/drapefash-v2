import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { ProductGrid } from "@/components/store/product-grid";
import { FilterForm, PriceRange } from "@/components/store/shop/filter-form";
import { localePath, type Locale } from "@/i18n/config";
import { pluralize, type Dictionary } from "@/i18n";
import { SORT_KEYS, getCatalogStats, getProductByCode, listCategories, listProducts, type SortKey } from "@/lib/data";
import { codeCandidates } from "@/lib/code";
import { categoryName } from "@/lib/localize";
import { STORE_META } from "@/lib/stores";
import { STORES, type Gender, type Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ShopSearchParams = { q?: string; category?: string; store?: string; max?: string; sort?: string; for?: string };

type Fixed = { gender?: Exclude<Gender, "unisex">; categorySlug?: string };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

/**
 * The listing used by Shop, Women, Men and each category: filters in a sidebar on the start edge
 * (it mirrors to the right in Arabic), results in a grid. Filters are a plain GET form.
 */
export async function ShopView({
  locale,
  t,
  title,
  path,
  fixed = {},
  searchParams,
  crumbs,
}: {
  locale: Locale;
  t: Dictionary;
  title: string;
  /** Page path without the language, e.g. "/shop" or "/category/tops". */
  path: string;
  fixed?: Fixed;
  searchParams: ShopSearchParams;
  crumbs?: { href: string; label: string }[];
}) {
  const q = one(searchParams.q).slice(0, 80);
  // A search for an item ID ("DRP-014", "drp 14", "14") opens that piece directly.
  if (q && codeCandidates(q).length) {
    const byCode = await getProductByCode(q);
    if (byCode) redirect(localePath(locale, `/product/${byCode.slug}`));
  }
  const store = (STORES as readonly string[]).includes(one(searchParams.store)) ? (one(searchParams.store) as Store) : undefined;
  const sort: SortKey = (SORT_KEYS as string[]).includes(one(searchParams.sort)) ? (one(searchParams.sort) as SortKey) : "featured";
  const forParam = one(searchParams.for);
  const gender = fixed.gender ?? (forParam === "women" || forParam === "men" ? forParam : undefined);

  const [categories, stats] = await Promise.all([listCategories(), getCatalogStats()]);
  const categorySlug = fixed.categorySlug ?? one(searchParams.category);
  const category = categories.find((c) => c.slug === categorySlug);

  const priceMin = Math.max(0, Math.floor((stats.minPrice ?? 0) / 5) * 5);
  const priceMax = Math.max(priceMin + 5, Math.ceil((stats.maxPrice ?? 100) / 5) * 5);
  const maxRaw = Number(one(searchParams.max));
  const maxPrice = Number.isFinite(maxRaw) && maxRaw > 0 && maxRaw < priceMax ? maxRaw : undefined;

  const products = await listProducts({
    gender,
    categoryId: category?.id,
    store,
    maxPrice,
    query: q || undefined,
    locale,
    sort,
    limit: 120,
  });

  const action = localePath(locale, path);
  const filtered = Boolean(q || store || maxPrice !== undefined || (!fixed.categorySlug && category) || (!fixed.gender && gender) || sort !== "featured");
  const fieldLabel = "t-data t-data-up text-ink-2";
  const option = "flex min-h-10 cursor-pointer items-center gap-3 text-[length:var(--t-small)] has-[:checked]:font-semibold";
  const radio = "size-4 accent-[var(--ink)]";

  return (
    <div className="page-x page-max pt-10 sm:pt-14">
      {crumbs && (
        <nav aria-label={t.product.breadcrumb} className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-[length:var(--t-small)] text-ink-2">
            {crumbs.map((c) => (
              <li key={c.href} className="flex items-center gap-1.5">
                <Link href={c.href} className="link-u focus-ring">
                  {c.label}
                </Link>
                <ChevronRight className="icon-dir size-4" strokeWidth={1.5} aria-hidden />
              </li>
            ))}
            <li aria-current="page" className="text-ink">
              {title}
            </li>
          </ol>
        </nav>
      )}
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-[1.5px] border-ink pb-4">
        <h1 className="hero-wipe t-monument text-ink" style={{ ["--rise-delay" as string]: "0s" }}>
          {title}
        </h1>
        <p className="t-data tabular text-ink" aria-live="polite">
          [ {pluralize(locale, t.shop.results, products.length)} ]
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
        <aside aria-label={t.shop.filters}>
          <details className="group lg:hidden">
            <summary className="btn btn-line w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden">{t.shop.showFilters}</summary>
            <div className="pt-6">{filters("m")}</div>
          </details>
          <div className="hidden lg:sticky lg:top-24 lg:block">{filters("d")}</div>
        </aside>

        <section aria-label={title}>
          {products.length ? (
            <ProductGrid products={products} locale={locale} t={t} priorityCount={4} />
          ) : (
            <div className="bg-paper-3 px-6 py-16 sm:px-10" data-testid="empty-grid">
              <p className="font-display text-[clamp(34px,4vw,52px)] leading-none text-ink">{stats.total ? t.shop.emptyTitle : t.shop.emptyCatalog}</p>
              {stats.total > 0 && <p className="mt-2 max-w-[48ch] text-ink">{t.shop.emptyText}</p>}
              {filtered && (
                <Link href={action} className="btn btn-ink mt-8">
                  {t.shop.reset}
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );

  /** Rendered twice (phone drawer and desktop sidebar), so ids carry a prefix. */
  function filters(idp: string) {
    return (
      <FilterForm action={action} className="flex flex-col gap-8">
        <div>
          <label htmlFor={`q-${idp}`} className={fieldLabel}>
            {t.shop.search}
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
            <input
              id={`q-${idp}`}
              name="q"
              type="search"
              enterKeyHint="search"
              defaultValue={q}
              placeholder={t.nav.searchPlaceholder}
              className="field h-11 ps-10"
            />
          </div>
        </div>

        {!fixed.categorySlug && categories.length > 0 && (
          <fieldset>
            <legend className={fieldLabel}>{t.shop.category}</legend>
            <div className="mt-2">
              <label className={option}>
                <input type="radio" name="category" value="" defaultChecked={!category} className={radio} />
                {t.shop.allCategories}
              </label>
              {categories.map((c) => (
                <label key={c.id} className={option}>
                  <input type="radio" name="category" value={c.slug} defaultChecked={category?.id === c.id} className={radio} />
                  {categoryName(c, locale, t)}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className={fieldLabel}>{t.shop.store}</legend>
          <div className="mt-2">
            <label className={option}>
              <input type="radio" name="store" value="" defaultChecked={!store} className={radio} />
              {t.shop.allStores}
            </label>
            {STORES.filter((s) => s !== "other").map((s) => (
              <label key={s} className={option}>
                <input type="radio" name="store" value={s} defaultChecked={store === s} className={radio} />
                <span dir="ltr">{STORE_META[s].name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {!fixed.gender && (
          <fieldset>
            <legend className={fieldLabel}>{t.shop.who}</legend>
            <div className="mt-2">
              {(
                [
                  ["", t.shop.everyone],
                  ["women", t.nav.women],
                  ["men", t.nav.men],
                ] as const
              ).map(([value, label]) => (
                <label key={value || "all"} className={option}>
                  <input type="radio" name="for" value={value} defaultChecked={(gender ?? "") === value} className={radio} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {stats.maxPrice !== null && (
          <div>
            <label htmlFor={`max-${idp}`} className={fieldLabel}>
              {t.shop.maxPrice}
            </label>
            <PriceRange
              id={`max-${idp}`}
              name="max"
              min={priceMin}
              max={priceMax}
              value={maxPrice ?? priceMax}
              currency="USD"
              locale={locale}
              labels={{ anyPrice: t.shop.anyPrice, upTo: t.shop.upTo }}
            />
          </div>
        )}

        <div>
          <label htmlFor={`sort-${idp}`} className={fieldLabel}>
            {t.shop.sort}
          </label>
          <select
            id={`sort-${idp}`}
            name="sort"
            defaultValue={sort}
            className="field mt-2 h-11"
          >
            <option value="featured">{t.shop.sortFeatured}</option>
            <option value="new">{t.shop.sortNew}</option>
            <option value="price-asc">{t.shop.sortLow}</option>
            <option value="price-desc">{t.shop.sortHigh}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary">
            {t.shop.apply}
          </button>
          {filtered && (
            <Link href={action} className={cn("link-u focus-ring text-[length:var(--t-small)]")}>
              {t.shop.reset}
            </Link>
          )}
        </div>
      </FilterForm>
    );
  }
}
