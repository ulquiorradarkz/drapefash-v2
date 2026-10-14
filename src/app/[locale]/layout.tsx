import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { LOCALES, LOCALE_META, isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { listCategories } from "@/lib/data";
import { categoryName } from "@/lib/localize";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { ConsentBanner } from "@/components/store/consent-banner";
import { PageViewTracker } from "@/components/store/page-view-tracker";
import { RevealObserver } from "@/components/store/reveal-observer";
import { ScrollFx } from "@/components/store/scroll-fx";
import { PointerParallax } from "@/components/store/pointer-parallax";
import { PicksNotice } from "@/components/store/picks-link";
import { fontVariables } from "../fonts";
import "../globals.css";
import "../drape.css";
import "../effects.css";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.homeTitle, template: `%s | ${SITE_NAME}` },
    description: t.meta.siteDescription,
    applicationName: SITE_NAME,
    alternates: alternatesFor(locale, "/"),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: LOCALE_META[locale].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_META[l].ogLocale),
      url: localePath(locale),
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#e9e9e6",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout of the storefront. Language and direction are set once, here, from the language config:
 * every component below uses logical CSS and mirrors itself for right-to-left languages.
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const meta = LOCALE_META[locale];
  const categories = await listCategories();
  const categoryLinks = categories.map((c) => ({ href: localePath(locale, `/category/${c.slug}`), label: categoryName(c, locale, t) }));

  return (
    <html lang={meta.htmlLang} dir={meta.dir} className={`store ${fontVariables}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide below-the-fold content until it scrolls in. Without JavaScript nothing is hidden. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="store-body" id="top">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper-3"
        >
          {t.nav.skip}
        </a>
        <Header locale={locale} t={t} categories={categoryLinks} />
        <main id="main" className="overflow-x-clip">
          {children}
        </main>
        <Footer locale={locale} t={t} />
        <ConsentBanner locale={locale} labels={t.consent} />
        <PageViewTracker />
        <RevealObserver />
        <ScrollFx />
        <PointerParallax />
        <PicksNotice
          href={localePath(locale, "/picks")}
          labels={{ added: t.picks.added, removed: t.picks.removed, open: t.nav.fitting }}
        />
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
