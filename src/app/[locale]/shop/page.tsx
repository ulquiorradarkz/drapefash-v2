import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView, type ShopSearchParams } from "@/components/store/shop/shop-view";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<ShopSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 80);
  return {
    title: query ? fmt(t.meta.searchTitle, { q: query }) : t.meta.shopTitle,
    description: t.meta.shopDesc,
    alternates: alternatesFor(locale, "/shop"),
    // Filtered and searched views are not separate pages for search engines.
    robots: query ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return <ShopView locale={locale} t={t} title={t.shop.title} path="/shop" searchParams={await searchParams} />;
}
