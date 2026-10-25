import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/store/legal-page";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { IMAGE_CREDITS } from "@/lib/credits";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const doc = getDictionary(locale).legal.about;
  return { title: doc.title, description: doc.lead, alternates: alternatesFor(locale, "/about") };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return (
    <LegalPage doc={t.legal.about} locale={locale}>
      <section className="mt-14 bg-paper-2 p-6" aria-labelledby="credits-title">
        <p id="credits-title" className="text-[length:var(--t-small)] leading-relaxed">
          {t.footer.credits} {t.footer.streetCredits}
        </p>
        <ul className="mt-4 space-y-2 t-data" lang="en" dir="ltr">
          {IMAGE_CREDITS.map((c) => (
            <li key={c.file}>
              <a href={c.url} target="_blank" rel="noopener" className="link-u focus-ring font-semibold text-ink">
                {c.title}
              </a>
              <span className="text-ink-2">, {c.maker}</span>
            </li>
          ))}
        </ul>
      </section>
    </LegalPage>
  );
}
