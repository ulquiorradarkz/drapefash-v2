import type { Metadata } from "next";
import { LOCALES, LOCALE_META, localePath, type Locale } from "./config";

/** Canonical URL plus hreflang links to the same page in every language, and x-default (English). */
export function alternatesFor(locale: Locale, path = "/"): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[LOCALE_META[l].htmlLang] = localePath(l, path);
  languages["x-default"] = localePath("en", path);
  return { canonical: localePath(locale, path), languages };
}
