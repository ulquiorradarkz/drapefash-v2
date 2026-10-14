import Image from "next/image";
import type { ReactNode } from "react";
import { RichText } from "@/components/store/rich-text";
import { Star } from "@/components/store/collage";
import type { Locale } from "@/i18n/config";
import type { LegalDoc } from "@/i18n/types";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.ADMIN_EMAIL || "ahmedqlila99@gmail.com";
/** ISO date of the last change to the legal texts. */
export const LEGAL_UPDATED = "2026-10-13";

/**
 * About and legal pages: the title in black across the page, the text in a readable column,
 * and a draped marble attendant keeping watch beside it on wide screens.
 */
export function LegalPage({ doc, locale, updated, children }: { doc: LegalDoc; locale: Locale; updated?: string; children?: ReactNode }) {
  return (
    <article className="page-x page-max pt-12 sm:pt-20">
      <header className="border-b-[1.5px] border-ink pb-6">
        <h1 className="hero-wipe max-w-[18ch] t-monument text-ink" style={{ ["--rise-delay" as string]: "0s" }}>
          {doc.title}
        </h1>
      </header>
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:col-start-4 lg:max-w-[68ch]">
          <p className="t-statement">{doc.lead}</p>
          {updated && <p className="mt-3 t-data text-ink-2">{updated}</p>}
          <div className="prose-drape mt-4">
            {doc.sections.map((s) => (
              <section key={s.h}>
                <h2>{s.h}</h2>
                {s.p?.map((para, i) => (
                  <p key={i}>
                    <RichText text={para} locale={locale} email={CONTACT_EMAIL} />
                  </p>
                ))}
                {s.list && (
                  <ul>
                    {s.list.map((item, i) => (
                      <li key={i}>
                        <RichText text={item} locale={locale} email={CONTACT_EMAIL} />
                      </li>
                    ))}
                  </ul>
                )}
                {s.after?.map((para, i) => (
                  <p key={`after-${i}`}>
                    <RichText text={para} locale={locale} email={CONTACT_EMAIL} />
                  </p>
                ))}
              </section>
            ))}
          </div>
          {children}
        </div>
        <aside aria-hidden className="relative hidden lg:col-span-2 lg:col-start-11 lg:block">
          <div className="sticky top-28">
            <Image src="/collage/statue-attendant.webp" alt="" width={400} height={1290} sizes="12vw" className="h-auto w-full" />
            <Star className="absolute -start-6 top-[12%] w-10 text-ink" motion="turn" />
          </div>
        </aside>
      </div>
    </article>
  );
}
