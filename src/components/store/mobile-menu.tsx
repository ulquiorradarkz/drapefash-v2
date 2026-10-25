"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };

export function MobileMenu({
  primary,
  categories,
  labels,
  searchAction,
}: {
  primary: Item[];
  categories: Item[];
  labels: { open: string; close: string; categories: string; search: string; searchPlaceholder: string; menu: string };
  searchAction: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? labels.close : labels.open}
        className="focus-ring relative -ms-1 grid size-11 place-items-center"
      >
        <span
          aria-hidden
          className={cn(
            "absolute h-[1.5px] w-5 bg-ink transition-transform duration-300 ease-drape",
            open ? "rotate-45" : "-translate-y-[4px]",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "absolute h-[1.5px] w-5 bg-ink transition-transform duration-300 ease-drape",
            open ? "-rotate-45" : "translate-y-[4px]",
          )}
        />
      </button>
      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 overflow-y-auto bg-paper px-4 pb-12 pt-6"
      >
        <nav aria-label={labels.menu}>
          <ul className="flex flex-col">
            {primary.map((item, i) => (
              <li key={item.href} className="menu-item" style={{ "--i": i } as CSSProperties}>
                <Link href={item.href} className="focus-ring block py-1.5 t-head text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10 t-data t-data-up text-ink-2">{labels.categories}</p>
          <ul className="mt-2 flex flex-col">
            {categories.map((item, i) => (
              <li key={item.href} className="menu-item" style={{ "--i": i + primary.length } as CSSProperties}>
                <Link href={item.href} className="focus-ring block py-2.5 text-[length:var(--t-statement)]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action={searchAction} role="search" className="relative mt-10">
          <label htmlFor="mobile-q" className="sr-only">
            {labels.search}
          </label>
          <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
          <input
            id="mobile-q"
            name="q"
            type="search"
            enterKeyHint="search"
            placeholder={labels.searchPlaceholder}
            className="field h-13 ps-12"
          />
        </form>
      </div>
    </div>
  );
}
