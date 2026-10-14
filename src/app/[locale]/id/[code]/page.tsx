import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdLookup } from "@/components/store/id-lookup";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { normalizeCode } from "@/lib/code";

type Props = { params: Promise<{ locale: string; code: string }> };

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: fmt(t.meta.idTitle, { code: normalizeCode(decode(code)) }), robots: { index: false, follow: true } };
}

/** Shareable item links for Instagram captions and stories: /en/id/DRP-014 opens that piece. */
export default async function IdPage({ params }: Props) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();
  return <IdLookup locale={locale} t={getDictionary(locale)} raw={decode(code)} />;
}
