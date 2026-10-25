"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { IdSearch } from "@/components/store/id-search";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

export type NotFoundStrings = Pick<Dictionary, "notFound" | "idSearch">;

/**
 * Text of the not-found page. Not-found pages get no route params on the server, and reading the
 * request headers there would make every cached page dynamic, so the language is read from the address here.
 */
export function NotFoundText({ strings }: { strings: Record<Locale, NotFoundStrings> }) {
  const params = useParams<{ locale?: string }>();
  const locale = isLocale(params?.locale) ? params.locale : DEFAULT_LOCALE;
  const t = strings[locale];
  return (
    <div className="relative z-10 lg:col-span-7">
      <h1 className="hero-rise max-w-[18ch] t-head text-ink" style={{ ["--rise-delay" as string]: "0.05s" }}>
        {t.notFound.title}
      </h1>
      <p className="hero-rise mt-6 max-w-[44ch] t-statement" style={{ ["--rise-delay" as string]: "0.15s" }}>
        {t.notFound.text}
      </p>
      <div className="hero-rise mt-10" style={{ ["--rise-delay" as string]: "0.25s" }}>
        <Link href={localePath(locale, "/shop")} className="btn btn-primary btn-lg">
          {t.notFound.cta}
          <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <IdSearch locale={locale} t={t} id="nf-id" className="mt-12" />
    </div>
  );
}
