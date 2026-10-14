import { LOCALE_META, type Locale } from "./config";
import type { Plural } from "./types";

/** Replaces {name} placeholders. Unknown placeholders are left as they are. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function formatNumber(locale: Locale, n: number): string {
  return new Intl.NumberFormat(LOCALE_META[locale].intl).format(n);
}

/** Picks the right plural form for `n` and fills {n}. */
export function pluralize(locale: Locale, forms: Plural, n: number, vars: Record<string, string | number> = {}): string {
  const category = new Intl.PluralRules(LOCALE_META[locale].htmlLang).select(n);
  const template = forms[category] ?? forms.other;
  return fmt(template, { n: formatNumber(locale, n), ...vars });
}

export function formatDate(locale: Locale, isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
