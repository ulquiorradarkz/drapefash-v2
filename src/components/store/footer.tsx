import Link from "next/link";
import { CookieSettingsButton } from "@/components/store/consent-banner";
import { DISCLOSURE } from "@/lib/env";
import type { Category } from "@/lib/types";

export function Footer({ categories }: { categories: Category[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-white/10 bg-black/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="glass chrome-border mb-10 rounded-2xl px-5 py-4 text-sm text-white/80" role="note" aria-label="Affiliate disclosure">
          <strong className="text-white">Affiliate disclosure:</strong> {DISCLOSURE}{" "}
          <Link href="/affiliate-disclosure" className="underline underline-offset-2">
            Learn more
          </Link>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="chrome-wordmark text-4xl" data-text="Drape">
              Drape
            </p>
            <p className="mt-3 max-w-xs text-sm text-white/60">Chrome-cut fashion finds from AliExpress, SHEIN and Bulchic, picked by hand.</p>
          </div>
          <FooterCol title="Shop">
            <FooterLink href="/women">Women</FooterLink>
            <FooterLink href="/men">Men</FooterLink>
            <FooterLink href="/search">Search</FooterLink>
          </FooterCol>
          <FooterCol title="Categories">
            {categories.slice(0, 6).map((c) => (
              <FooterLink key={c.id} href={`/category/${c.slug}`}>
                {c.name}
              </FooterLink>
            ))}
          </FooterCol>
          <FooterCol title="About">
            <FooterLink href="/about">About Drape</FooterLink>
            <FooterLink href="/affiliate-disclosure">Affiliate Disclosure</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/cookies">Cookie Policy</FooterLink>
            <li>
              <CookieSettingsButton className="text-sm text-white/60 transition-colors hover:text-white" />
            </li>
          </FooterCol>
        </div>
        <p className="mt-12 text-xs text-white/40">
          © {year} Drape. Prices and availability are set by each store and may change. Drape is not affiliated with AliExpress, SHEIN or Bulchic
          beyond their affiliate programs.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">{title}</p>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-white/60 transition-colors hover:text-white">
        {children}
      </Link>
    </li>
  );
}
