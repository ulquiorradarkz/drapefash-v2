import { notFound } from "next/navigation";
import { HeroCollage, type HeroLook } from "@/components/store/home/hero-collage";
import { IdMarquee } from "@/components/store/home/id-marquee";
import { ArchiveGrid } from "@/components/store/home/archive-grid";
import { FittingTeaser } from "@/components/store/home/fitting-teaser";
import { CategoryCovers } from "@/components/store/home/category-covers";
import { BudgetStrip, type BudgetItem } from "@/components/store/home/budget-strip";
import { HowStudy } from "@/components/store/home/how-study";
import { ContactPanel } from "@/components/store/contact-panel";
import { LOCALE_META, isLocale, localePath, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import { getCatalogStats, listCategories, listProducts, type CatalogStats } from "@/lib/data";
import { localizeProduct } from "@/lib/localize";
import { SITE_URL } from "@/lib/env";
import type { ProductWithCategory } from "@/lib/types";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [products, stats, categories, newest] = await Promise.all([
    listProducts({ limit: 60 }),
    getCatalogStats(),
    listCategories(),
    listProducts({ limit: 14, sort: "new" }),
  ]);
  const shop = localePath(locale, "/shop");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Drape",
    url: `${SITE_URL}${localePath(locale)}`,
    inLanguage: LOCALE_META[locale].htmlLang,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}${shop}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  // The first picture of each category, for its cover.
  const covers: Record<string, string> = {};
  for (const p of products) {
    if (p.category_id && p.images[0] && !covers[p.category_id]) covers[p.category_id] = p.images[0];
  }
  const latestCode = newest.find((p) => p.code)?.code ?? null;
  const looks = heroLooks(products, locale);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <HeroCollage locale={locale} t={t} latestCode={latestCode} looks={looks} />
      <IdMarquee items={newest.map((p) => ({ code: p.code ?? null, title: localizeProduct(p, locale).title }))} />
      {products.length > 0 ? (
        <>
          <ArchiveGrid products={newest} locale={locale} t={t} />
          <FittingTeaser locale={locale} t={t} />
          <CategoryCovers categories={categories} stats={stats} covers={covers} locale={locale} t={t} />
          <Budget products={products} stats={stats} locale={locale} t={t} shop={shop} />
          <HowStudy stats={stats} locale={locale} t={t} />
        </>
      ) : (
        <>
          <p className="page-x page-max mt-[var(--section)] t-statement text-ink-2">{t.shop.emptyCatalog}</p>
          <FittingTeaser locale={locale} t={t} />
          <HowStudy stats={stats} locale={locale} t={t} />
        </>
      )}
      <ContactPanel t={t} className="mt-[var(--section)]" />
    </>
  );
}

function Budget({ products, stats, locale, t, shop }: { products: ProductWithCategory[]; stats: CatalogStats; locale: Locale; t: Dictionary; shop: string }) {
  const priced = products.filter((p) => p.price !== null && p.images.length);
  if (priced.length < 3 || stats.minPrice === null || stats.maxPrice === null) return null;
  const currency = priced[0].currency;
  const items: BudgetItem[] = priced.map((raw) => {
    const p = localizeProduct(raw, locale);
    return {
      slug: p.slug,
      href: localePath(locale, `/product/${p.slug}`),
      title: p.title,
      image: p.images[0] ?? null,
      price: p.price as number,
      currency: p.currency,
      code: p.code ?? null,
    };
  });
  const sorted = items.map((i) => i.price).sort((a, b) => a - b);
  const min = Math.max(1, Math.floor(sorted[0] / 5) * 5);
  const max = Math.ceil(sorted[sorted.length - 1] / 5) * 5;
  const median = sorted[Math.floor(sorted.length / 2)];
  const start = Math.min(max, Math.ceil(median / 5) * 5);
  return <BudgetStrip locale={locale} items={items} min={min} max={max} start={start} currency={currency} shopHref={shop} labels={t.budget} />;
}

/** Two pieces for the hero frames: the first featured piece, then one from another category. */
function heroLooks(products: ProductWithCategory[], locale: Locale): HeroLook[] {
  const withImage = products.filter((p) => p.images[0]);
  const first = withImage[0];
  if (!first) return [];
  const second = withImage.find((p) => p.id !== first.id && p.category_id !== first.category_id) ?? withImage.find((p) => p.id !== first.id);
  return [first, second]
    .filter((p): p is ProductWithCategory => !!p)
    .map((raw) => {
      const p = localizeProduct(raw, locale);
      return { href: localePath(locale, `/product/${p.slug}`), image: p.images[0], title: p.title, code: p.code ?? null };
    });
}
