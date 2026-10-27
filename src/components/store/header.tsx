import Link from "next/link";
import { Search } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { LiquidGlass } from "@/components/fx/liquid-glass";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { PicksLink } from "./picks-link";

/**
 * A liquid-glass pill that floats over the page: wordmark, a few links, the ID/search box, saved
 * pieces, language. The glass is a layer behind the bar's contents, not their parent, so the mobile
 * menu (a fixed panel) is not trapped inside the lens.
 */
export function Header({ locale, t, categories }: { locale: Locale; t: Dictionary; categories: { href: string; label: string }[] }) {
  const shop = localePath(locale, "/shop");
  const picks = localePath(locale, "/picks");
  const primary = [
    { href: localePath(locale, "/women"), label: t.nav.women },
    { href: localePath(locale, "/men"), label: t.nav.men },
    { href: shop, label: t.nav.shop },
    { href: picks, label: t.nav.fitting },
    { href: localePath(locale, "/contact"), label: t.nav.contact },
  ];
  return (
    <header className="site-header sticky top-0 z-40 h-[var(--header-h)] px-[var(--gutter)] pt-2.5 text-ink">
      <div className="page-max relative h-14">
        <LiquidGlass aria-hidden radius={999} bezel={14} strength={26} frost={4} className="lg-bar absolute inset-0" />
        <div className="relative flex h-full items-center gap-3 ps-3 pe-2 sm:ps-6">
          <MobileMenu
            primary={primary}
            categories={categories}
            searchAction={shop}
            labels={{
              open: t.nav.menuOpen,
              close: t.nav.menuClose,
              categories: t.nav.categories,
              search: t.nav.searchLabel,
              searchPlaceholder: t.nav.searchPlaceholder,
              menu: t.nav.main,
            }}
          />
          <Link href={localePath(locale)} aria-label={t.nav.logo} className="focus-ring shrink-0">
            <Wordmark className="w-[86px] sm:w-[98px]" />
          </Link>
          <nav aria-label={t.nav.main} className="ms-8 hidden lg:block xl:ms-12">
            <NavLinks items={primary} className="flex" />
          </nav>
          <div className="ms-auto flex items-center gap-0.5">
            <form action={shop} role="search" className="relative hidden xl:block">
              <label htmlFor="header-q" className="sr-only">
                {t.nav.searchLabel}
              </label>
              <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ink-2" strokeWidth={1.6} aria-hidden />
              <input
                id="header-q"
                name="q"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={`${t.idSearch.placeholder} · ${t.nav.searchPlaceholder}`}
                className="field field-pill h-10 min-h-10 w-64 ps-10 text-[15px] transition-[width] duration-300 ease-drape focus:w-80"
              />
            </form>
            <Link href={shop} aria-label={t.nav.search} className="focus-ring grid size-11 place-items-center rounded-full hover:text-ink-2 xl:hidden">
              <Search className="size-5" strokeWidth={1.6} aria-hidden />
            </Link>
            <PicksLink href={picks} locale={locale} labels={{ fitting: t.nav.fitting, count: t.nav.picksCount }} />
            <LanguageSwitcher locale={locale} label={t.nav.language} />
          </div>
        </div>
      </div>
    </header>
  );
}
