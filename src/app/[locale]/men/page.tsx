import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView, type ShopSearchParams } from "@/components/store/shop/shop-view";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<ShopSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.meta.menTitle, description: t.meta.menDesc, alternates: alternatesFor(locale, "/men") };
}

export default async function MenPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return <ShopView locale={locale} t={t} title={t.nav.men} path="/men" fixed={{ gender: "men" }} searchParams={await searchParams} />;
}
