import { LOCALE_META, type Locale } from "@/i18n/config";

export function formatPrice(value: number | null | undefined, currency = "USD", locale: Locale = "en"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  try {
    return new Intl.NumberFormat(LOCALE_META[locale].intl, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function discountPercent(price: number | null, original: number | null): number | null {
  if (!price || !original || original <= price) return null;
  const pct = Math.round(((original - price) / original) * 100);
  return pct >= 5 ? pct : null;
}

export function slugify(input: string, max = 80): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, max).replace(/-+$/g, "") || "item";
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}
