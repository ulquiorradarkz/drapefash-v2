import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView, type ShopSearchParams } from "@/components/store/shop/shop-view";
import { isLocale, localePath } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { getCategoryBySlug } from "@/lib/data";
import { categoryName } from "@/lib/localize";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<ShopSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: t.meta.notFoundTitle, robots: { index: false } };
  const name = categoryName(category, locale, t);
  return { title: name, description: fmt(t.meta.categoryDesc, { category: name }), alternates: alternatesFor(locale, `/category/${slug}`) };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <ShopView
      locale={locale}
      t={t}
      title={categoryName(category, locale, t)}
      path={`/category/${slug}`}
      fixed={{ categorySlug: slug }}
      searchParams={await searchParams}
      crumbs={[
        { href: localePath(locale), label: t.nav.home },
        { href: localePath(locale, "/shop"), label: t.nav.shop },
      ]}
    />
  );
}
