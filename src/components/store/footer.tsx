import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { CookieSettingsButton } from "@/components/store/consent-banner";
import { LOCALES, LOCALE_META, localePath, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";
import { STORE_META } from "@/lib/stores";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/contact";
import { InstagramGlyph } from "@/components/store/contact-panel";

const STORES = ["aliexpress", "shein", "bulchic"] as const;

/**
 * The close of every page: the disclosure (always visible), the links, and the name again at full width.
 * Paper one tone darker, opened by the harlequin band.
 */
export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  const year = new Date().getFullYear();
  const linkCls = "link-u focus-ring text-[length:var(--t-small)] text-ink hover:text-ink-2";
  const heading = "t-data t-data-up text-ink-2";
  return (
    <footer className="mt-[var(--section)] bg-paper-2 text-ink">
      <div className="harlequin" aria-hidden />
      <div className="page-x page-max pt-[clamp(48px,6vw,96px)]">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-4">
            <div className="max-w-md bg-ink p-5 text-paper-3" role="note" aria-labelledby="ft-disclosure">
              <p id="ft-disclosure" className="font-display text-[30px] leading-none">
                {t.footer.disclosureTitle}
              </p>
              <p className="mt-3 text-[length:var(--t-small)] leading-relaxed">
                {t.footer.disclosure}{" "}
                <Link href={localePath(locale, "/affiliate-disclosure")} className="underline underline-offset-2 hover:opacity-80">
                  {t.footer.disclosureLink}
                </Link>
              </p>
            </div>
            <p className={`${heading} mt-10`}>{t.footer.stores}</p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {STORES.map((s) => (
                <li key={s}>
                  <Link href={`${localePath(locale, "/shop")}?store=${s}`} dir="ltr" className="focus-ring t-head text-ink transition-colors hover:text-ink-2">
                    {STORE_META[s].name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label={t.footer.shop} className="lg:col-span-2 lg:col-start-6">
            <p className={heading}>{t.footer.shop}</p>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href={localePath(locale, "/women")} className={linkCls}>
                  {t.nav.women}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/men")} className={linkCls}>
                  {t.nav.men}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/shop")} className={linkCls}>
                  {t.footer.allPieces}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/picks")} className={linkCls}>
                  {t.footer.picks}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/contact")} className={linkCls}>
                  {t.footer.contact}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t.footer.legal} className="lg:col-span-3">
            <p className={heading}>{t.footer.legal}</p>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href={localePath(locale, "/about")} className={linkCls}>
                  {t.legal.about.title}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/affiliate-disclosure")} className={linkCls}>
                  {t.legal.disclosure.title}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/privacy")} className={linkCls}>
                  {t.legal.privacy.title}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "/cookies")} className={linkCls}>
                  {t.legal.cookies.title}
                </Link>
              </li>
              <li>
                <CookieSettingsButton label={t.footer.cookieSettings} className={`${linkCls} text-start`} />
              </li>
            </ul>
          </nav>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
            <nav aria-label={t.footer.language}>
              <p className={heading}>{t.footer.language}</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 lg:grid-cols-1">
                {LOCALES.map((l) => (
                  <li key={l}>
                    <Link
                      href={localePath(l)}
                      hrefLang={LOCALE_META[l].htmlLang}
                      lang={LOCALE_META[l].htmlLang}
                      aria-current={l === locale ? "page" : undefined}
                      className={linkCls}
                    >
                      {LOCALE_META[l].name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <p className={heading}>{t.contact.handleLabel}</p>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener" dir="ltr" className="link-u focus-ring mt-3 inline-flex items-center gap-2 font-mono text-[15px] text-ink">
                <InstagramGlyph className="size-5" />
                {INSTAGRAM_HANDLE}
                <span className="sr-only"> ({t.contact.newTab})</span>
              </a>
            </div>
          </div>
        </div>

        <Link href={localePath(locale)} aria-label={t.nav.logo} className="focus-ring mt-[clamp(56px,8vw,128px)] block" data-reveal="wipe">
          <Wordmark className="w-full" />
        </Link>

        <div className="mt-8 flex flex-col gap-4 border-t-[1.5px] border-ink pb-10 pt-4 text-[13px] text-ink-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl space-y-1">
            <p>{fmt(t.footer.copyright, { year })}</p>
            <p>{t.footer.notAffiliated}</p>
            <p>{t.footer.credits}</p>
          </div>
          <a href="#top" className="link-u focus-ring shrink-0 font-mono text-ink">
            ↑ {t.footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
