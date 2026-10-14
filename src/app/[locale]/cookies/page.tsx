import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_UPDATED, LegalPage } from "@/components/store/legal-page";
import { CookieSettingsButton } from "@/components/store/consent-banner";
import { isLocale } from "@/i18n/config";
import { fmt, formatDate, getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const doc = getDictionary(locale).legal.cookies;
  return { title: doc.title, description: doc.lead, alternates: alternatesFor(locale, "/cookies") };
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return (
    <LegalPage doc={t.legal.cookies} locale={locale} updated={fmt(t.legal.updated, { date: formatDate(locale, LEGAL_UPDATED) })}>
      <CookieSettingsButton label={t.footer.cookieSettings} className="btn btn-line mt-8" />
    </LegalPage>
  );
}
