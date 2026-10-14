/** Language setup shared by middleware (edge), server components and client components. */

export const LOCALES = ["en", "zh", "hi", "es", "fr", "ar", "bn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Remembers the visitor's language choice (set by the language switcher). */
export const LOCALE_COOKIE = "drape_lang";

type LocaleMeta = {
  /** Value for <html lang> and hreflang. */
  htmlLang: string;
  /** The language's own name, in its own script. */
  name: string;
  dir: "ltr" | "rtl";
  ogLocale: string;
  /** Intl locale for numbers, prices and dates. Western digits everywhere so prices read the same in every language. */
  intl: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { htmlLang: "en", name: "English", dir: "ltr", ogLocale: "en_US", intl: "en-US" },
  zh: { htmlLang: "zh-Hans", name: "中文", dir: "ltr", ogLocale: "zh_CN", intl: "zh-CN" },
  hi: { htmlLang: "hi", name: "हिन्दी", dir: "ltr", ogLocale: "hi_IN", intl: "hi-IN-u-nu-latn" },
  es: { htmlLang: "es", name: "Español", dir: "ltr", ogLocale: "es_ES", intl: "es-ES" },
  fr: { htmlLang: "fr", name: "Français", dir: "ltr", ogLocale: "fr_FR", intl: "fr-FR" },
  ar: { htmlLang: "ar", name: "العربية", dir: "rtl", ogLocale: "ar_AR", intl: "ar-u-nu-latn" },
  bn: { htmlLang: "bn", name: "বাংলা", dir: "ltr", ogLocale: "bn_BD", intl: "bn-BD-u-nu-latn" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Picks the best supported locale from an Accept-Language header. */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const wanted = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Path inside a locale: localePath("ar", "/shop") -> "/ar/shop", localePath("ar", "/") -> "/ar". */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Removes the leading locale segment: "/ar/shop?x=1" -> "/shop?x=1". */
export function stripLocale(pathname: string): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    const rest = "/" + parts.slice(2).join("/");
    return rest === "/" ? "/" : rest.replace(/\/$/, "");
  }
  return pathname;
}
