import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactPanel } from "@/components/store/contact-panel";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.meta.contactTitle, description: t.meta.contactDesc, alternates: alternatesFor(locale, "/contact") };
}

/** Contact: just the Instagram logo; it opens the owner's profile. */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return <ContactPanel t={t} as="h1" className="min-h-[calc(100svh-var(--header-h)-8rem)]" />;
}
