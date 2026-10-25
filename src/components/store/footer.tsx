import Image from "next/image";
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
 * The close of every page, split in two: a street photograph cropped hard by the edges on one half,
 * the site's menu set large on the other, then the disclosure (always visible), the small links and
 * the legal line.
 */
export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  const year = new Date().getFullYear();
  const small = "link-u focus-ring text-[length:var(--t-small)] text-ink";
  const menu = [
    { href: localePath(locale, "/women"), label: t.nav.women },
    { href: localePath(locale, "/men"), label: t.nav.men },
    { href: localePath(locale, "/shop"), label: t.footer.allPieces },
    { href: localePath(locale, "/picks"), label: t.footer.picks },
    { href: localePath(locale, "/contact"), label: t.footer.contact },
  ];
  return (
    <footer className="site-footer mt-[var(--section)] grid bg-paper-2 text-ink lg:min-h-[100svh] lg:grid-cols-2">
      <div className="street relative h-[50svh] overflow-hidden lg:h-auto">
        <Image src="/street/street-brick.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="scale-[1.15] object-cover object-[50%_70%]" />
      </div>

      <div className="flex flex-col px-[var(--gutter)] pb-8 pt-12 lg:ps-[clamp(32px,6vw,112px)] lg:pt-20">
        <Link href={localePath(locale)} aria-label={t.nav.logo} className="focus-ring block w-[112px]">
          <Wordmark className="w-full" />
        </Link>

        <nav aria-label={t.footer.shop} className="mt-10">
          <ul className="footer-menu space-y-1">
            {menu.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="focus-ring inline-block font-display text-[length:var(--t-head)] leading-[1] transition-[transform,color] duration-300 ease-drape hover:translate-x-3 hover:text-accent rtl:hover:-translate-x-3">
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-14 max-w-xl bg-paper p-5" role="note" aria-labelledby="ft-disclosure">
          <p id="ft-disclosure" className="t-small font-semibold">
            {t.footer.disclosureTitle}
          </p>
          <p className="mt-2 text-[length:var(--t-small)] leading-relaxed">
            {t.footer.disclosure}{" "}
            <Link href={localePath(locale, "/affiliate-disclosure")} className="font-semibold underline decoration-accent underline-offset-4 hover:text-accent">
              {t.footer.disclosureLink}
            </Link>
          </p>
        </div>

        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          <nav aria-label={t.footer.legal}>
            <p className="t-small font-semibold text-ink-2">{t.footer.legal}</p>
            <ul className="mt-3 space-y-2">
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
            <p className="t-small font-semibold text-ink-2">{t.footer.language}</p>
            <ul className="mt-3 space-y-2">
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
          <div>
            <p className="t-small font-semibold text-ink-2">{t.footer.stores}</p>
            <ul className="mt-3 space-y-2">
              {STORES.map((s) => (
                <li key={s}>
                  <Link href={`${localePath(locale, "/shop")}?store=${s}`} dir="ltr" className={small}>
                    {STORE_META[s].name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8 t-small font-semibold text-ink-2">{t.contact.handleLabel}</p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener" dir="ltr" className={`${small} mt-3 inline-flex items-center gap-2`}>
              <InstagramGlyph className="size-5" />
              {INSTAGRAM_HANDLE}
              <span className="sr-only"> ({t.contact.newTab})</span>
            </a>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-14 text-[14px] leading-relaxed text-ink-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[60ch] space-y-1">
            <p>{fmt(t.footer.copyright, { year })}</p>
            <p>{t.footer.notAffiliated}</p>
            <p>
              {t.footer.streetCredits} {t.footer.credits}
            </p>
          </div>
          <a href="#top" className="link-u focus-ring shrink-0 font-semibold text-ink">
            {t.footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
