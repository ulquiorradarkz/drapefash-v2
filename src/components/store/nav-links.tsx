"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ items, className }: { items: { href: string; label: string }[]; className?: string }) {
  const pathname = usePathname();
  return (
    <ul className={cn("items-center gap-5 lg:gap-7", className)}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
            className="link-u focus-ring text-[15px] text-ink transition-colors hover:text-ink-2"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
