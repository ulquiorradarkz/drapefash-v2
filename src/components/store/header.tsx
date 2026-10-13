import Link from "next/link";
import { Search } from "lucide-react";
import { MobileMenu } from "@/components/store/mobile-menu";
import type { Category } from "@/lib/types";

export function Header({ categories }: { categories: Category[] }) {
  return (
    <header className="sticky top-0 z-40">
      <div className="glass-blur border-b border-white/10 bg-[#08080c]/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:h-16 sm:px-6">
          <MobileMenu categories={categories} />
          <Link href="/" className="chrome-wordmark text-[1.65rem] sm:text-3xl" data-text="Drape" aria-label="Drape home">
            Drape
          </Link>
          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 text-sm md:flex">
            <NavLink href="/women">Women</NavLink>
            <NavLink href="/men">Men</NavLink>
            {categories.slice(0, 4).map((c) => (
              <NavLink key={c.id} href={`/category/${c.slug}`}>
                {c.name}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <form action="/search" className="relative hidden sm:block" role="search">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" aria-hidden />
              <input
                name="q"
                type="search"
                placeholder="Search pieces"
                aria-label="Search products"
                className="h-9 w-44 rounded-full border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none transition-[width,border-color] focus:w-60 focus:border-white/40 lg:w-56"
              />
            </form>
            <Link href="/search" className="grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10 sm:hidden" aria-label="Search">
              <Search className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full px-3 py-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
      {children}
    </Link>
  );
}
