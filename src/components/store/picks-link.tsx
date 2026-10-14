"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { fmt, formatNumber, pluralize } from "@/i18n/format";
import type { Plural } from "@/i18n/types";
import { onPicksChange, usePicks } from "@/lib/picks";
import { cn } from "@/lib/utils";
import { StarIcon } from "./pick-button";

/** Header link to the fitting room, with the number of saved pieces. */
export function PicksLink({
  href,
  locale,
  labels,
  className,
}: {
  href: string;
  locale: Locale;
  labels: { fitting: string; count: Plural };
  className?: string;
}) {
  const picks = usePicks();
  const n = picks.length;
  return (
    <Link
      href={href}
      aria-label={n ? `${labels.fitting}, ${pluralize(locale, labels.count, n)}` : labels.fitting}
      className={cn("focus-ring group relative grid size-11 place-items-center hover:text-ink-2", className)}
    >
      <StarIcon filled={n > 0} className={cn("size-5 transition-transform duration-500 group-hover:rotate-90", n > 0 && "text-accent")} />
      {n > 0 && (
        <span aria-hidden className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center bg-ink px-1 font-mono text-[11px] leading-none text-paper-3 tabular">
          {formatNumber(locale, n)}
        </span>
      )}
    </Link>
  );
}

/** A short notice after a piece is saved or removed, with a way to the fitting room. */
export function PicksNotice({ href, labels }: { href: string; labels: { added: string; removed: string; open: string } }) {
  const [notice, setNotice] = useState<{ text: string; saved: boolean; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () =>
      onPicksChange(({ saved, title }) => {
        const name = title.length > 48 ? `${title.slice(0, 46)}…` : title;
        setNotice({ text: fmt(saved ? labels.added : labels.removed, { name }), saved, key: Date.now() });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setNotice(null), 4200);
      }),
    [labels.added, labels.removed],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-end sm:inset-x-auto sm:end-4 sm:bottom-4">
      {notice && (
        <div key={notice.key} className="hero-rise pointer-events-auto flex max-w-md items-center gap-3 bg-ink py-2.5 ps-3 pe-2 text-paper-3" style={{ ["--rise-delay" as string]: "0s" }}>
          <StarIcon filled={notice.saved} className="size-4 shrink-0 text-accent-soft" />
          <bdi className="min-w-0 flex-1 text-[15px] leading-snug">{notice.text}</bdi>
          {notice.saved && (
            <Link href={href} className="btn btn-paper btn-sm shrink-0">
              {labels.open}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
