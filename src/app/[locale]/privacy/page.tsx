import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_UPDATED, LegalPage } from "@/components/store/legal-page";
import { isLocale } from "@/i18n/config";
import { fmt, formatDate, getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const doc = getDictionary(locale).legal.privacy;
  return { title: doc.title, description: doc.lead, alternates: alternatesFor(locale, "/privacy") };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return <LegalPage doc={t.legal.privacy} locale={locale} updated={fmt(t.legal.updated, { date: formatDate(locale, LEGAL_UPDATED) })} />;
}
