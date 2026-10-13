"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Category } from "@/lib/types";

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-ml-2 grid size-10 place-items-center rounded-full text-white/85 hover:bg-white/10"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-[#08080c]/97 px-5 pb-10 pt-6 backdrop-blur-xl">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {[
              ["/women", "Women"],
              ["/men", "Men"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="chrome-text font-display py-2 text-3xl font-bold">
                {label}
              </Link>
            ))}
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/40">Categories</p>
            {categories.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="py-2 text-lg text-white/80">
                {c.name}
              </Link>
            ))}
            <Link href="/search" className="mt-4 py-2 text-lg text-white/80">
              Search
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
