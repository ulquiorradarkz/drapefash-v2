import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { CookieSettingsButton } from "@/components/store/consent-banner";
import { LOCALES, LOCALE_META, localePath, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";
import { STORE_META } from "@/lib/stores";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/contact";
import { InstagramGlyph } from "@/components/store/contact-panel";

const STORES = ["aliexpress", "shein", "bulchic"] as const;

/**
 * The close of every page, on the ice field (the ground's inverse): the invitation and the one
 * action at the start, the ways in stacked at the end, the disclosure (always visible), one row of
 * legal links and credits, and the name across the foot, larger than the screen can hold, cut by
 * the bottom edge.
 */
export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  const year = new Date().getFullYear();
  const small = "link-u focus-ring text-[length:var(--t-small)] text-ink";
  const menu = [
    { href: localePath(locale, "/women"), label: t.nav.women },
    { href: localePath(locale, "/men"), label: t.nav.men },
    { href: localePath(locale, "/picks"), label: t.footer.picks },
    { href: localePath(locale, "/contact"), label: t.footer.contact },
  ];
  return (
    <footer className="site-footer ice relative mt-[var(--section)] flex min-h-[100svh] flex-col overflow-hidden">
      <div className="page-x page-max grid w-full gap-12 pt-[clamp(56px,10vh,120px)] lg:grid-cols-12 lg:gap-[var(--gutter)]">
        <div className="lg:col-span-7" data-reveal="">
          <p className="font-display text-[length:clamp(40px,7vw,112px)] leading-[0.92] text-ink">{t.hero.cta}</p>
          <p className="mt-5 max-w-[40ch] text-[length:var(--t-body)] text-ink">{t.footer.tagline}</p>
          <Link href={localePath(locale, "/shop")} className="btn btn-primary btn-lg mt-8">
            {t.archive.seeAll}
            <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>

        <nav aria-label={t.footer.shop} className="lg:col-span-3 lg:col-start-10" data-reveal="">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 lg:flex-col">
            {menu.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="link-u focus-ring text-[length:var(--t-small)] font-semibold text-ink">
                  {m.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener" dir="ltr" className="link-u focus-ring inline-flex items-center gap-2 text-[length:var(--t-small)] font-semibold text-ink">
                <InstagramGlyph className="size-[18px]" />
                {INSTAGRAM_HANDLE}
                <span className="sr-only"> ({t.contact.newTab})</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="max-w-xl rounded-[var(--radius-frame)] bg-paper-2 p-5 lg:col-span-6" role="note" aria-labelledby="ft-disclosure">
          <p id="ft-disclosure" className="t-small font-semibold">
            {t.footer.disclosureTitle}
          </p>
          <p className="mt-2 text-[length:var(--t-small)] leading-relaxed">
            {t.footer.disclosure}{" "}
            <Link href={localePath(locale, "/affiliate-disclosure")} className="font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-4 hover:text-[var(--accent)]">
              {t.footer.disclosureLink}
            </Link>
          </p>
        </div>
      </div>

      <div className="page-x page-max mt-auto w-full pt-16">
        <div className="flex flex-col gap-6 text-[length:var(--t-small)] leading-relaxed text-ink-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <nav aria-label={t.footer.legal}>
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                <li>
                  <Link href={localePath(locale, "/about")} className={small}>
                    {t.legal.about.title}
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "/affiliate-disclosure")} className={small}>
                    {t.legal.disclosure.title}
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "/privacy")} className={small}>
                    {t.legal.privacy.title}
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "/cookies")} className={small}>
                    {t.legal.cookies.title}
                  </Link>
                </li>
                <li>
                  <CookieSettingsButton label={t.footer.cookieSettings} className={`${small} text-start`} />
                </li>
              </ul>
            </nav>
            <nav aria-label={t.footer.language}>
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                {LOCALES.map((l) => (
                  <li key={l}>
                    <Link
                      href={localePath(l)}
                      hrefLang={LOCALE_META[l].htmlLang}
                      lang={LOCALE_META[l].htmlLang}
                      aria-current={l === locale ? "page" : undefined}
                      className={small}
                    >
                      {LOCALE_META[l].name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={t.footer.stores}>
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                {STORES.map((s) => (
                  <li key={s}>
                    <Link href={`${localePath(locale, "/shop")}?store=${s}`} dir="ltr" className={small}>
                      {STORE_META[s].name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="max-w-[62ch] space-y-1 lg:text-end">
            <p>{fmt(t.footer.copyright, { year })}</p>
            <p>{t.footer.notAffiliated}</p>
            <p>
              {t.footer.streetCredits} {t.footer.credits}
            </p>
            <p>Liquid metal: Paper Shaders (Apache-2.0). Field: ShaderGradient (MIT). Glass lens after liquid-glass-js (MIT).</p>
          </div>
        </div>
      </div>

      <Link href={localePath(locale)} aria-label={t.nav.logo} className="footer-name focus-ring mt-6 block w-[118vw] max-w-none shrink-0 translate-y-[30%] ps-[var(--gutter)] text-ink lg:w-[112vw]">
        <Wordmark className="w-full" />
      </Link>
    </footer>
  );
}
