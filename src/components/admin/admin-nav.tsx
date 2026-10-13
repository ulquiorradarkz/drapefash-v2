"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ExternalLink, FolderTree, KeyRound, LinkIcon, LogOut, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/import", label: "Import", icon: LinkIcon },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/account", label: "Account", icon: KeyRound },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <aside className="sticky top-0 z-30 border-b border-white/10 bg-[#0c0c12]/95 backdrop-blur md:h-dvh md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:px-5 md:py-6">
        <Link href="/admin" className="chrome-wordmark text-2xl md:text-3xl" data-text="Drape">
          Drape
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground md:mt-2 md:flex"
        >
          View store <ExternalLink className="size-3" />
        </a>
        <form action="/auth/signout" method="post" className="md:hidden">
          <button className="inline-flex items-center gap-1 text-xs text-muted-foreground" type="submit" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
      <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
              active(href) && "bg-white/10 text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="hidden px-5 md:absolute md:bottom-6 md:block md:w-full">
        <p className="truncate text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <form action="/auth/signout" method="post" className="mt-2">
          <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" type="submit">
            <LogOut className="size-4" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
