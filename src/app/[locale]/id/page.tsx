import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdLookup } from "@/components/store/id-lookup";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).nav.findId, robots: { index: false, follow: true } };
}

/** The item-ID box submits here: /ar/id?code=DRP-014 opens that piece. */
export default async function IdQueryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { code } = await searchParams;
  return <IdLookup locale={locale} t={getDictionary(locale)} raw={(Array.isArray(code) ? code[0] : code) ?? ""} />;
}
