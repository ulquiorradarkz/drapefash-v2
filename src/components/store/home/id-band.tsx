"use client";

import Link from "next/link";
import { useReduced } from "@/lib/use-reduced";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import type { HomePiece } from "./types";

/**
 * The rail: the newest item IDs and names run past like tags on a clothes rail, slowing under the pointer.
 * Each one opens its piece. Under reduced motion it is a plain row that scrolls sideways.
 */
export function IdBand({ pieces, label }: { pieces: HomePiece[]; label: string }) {
  const reduce = useReduced();
  const items = pieces.filter((p) => p.code);
  if (items.length < 4) return null;
  const row = items.map((p) => (
    <Link key={p.id} href={p.href} className="focus-ring group flex shrink-0 items-baseline gap-3 py-5">
      <span className="font-display text-[length:var(--t-statement)] leading-none text-ink transition-colors duration-300 group-hover:text-accent" dir="ltr">
        {p.code}
      </span>
      <span className="max-w-[22ch] truncate t-small text-ink-2 transition-colors duration-300 group-hover:text-ink">
        <bdi>{p.title}</bdi>
      </span>
    </Link>
  ));
  return (
    <nav aria-label={label} className="bg-paper-2" dir="ltr">
      {reduce ? (
        <div className="no-scrollbar flex gap-12 overflow-x-auto px-[var(--gutter)]">{row}</div>
      ) : (
        <InfiniteSlider gap={56} speed={38} speedOnHover={10}>
          {row}
        </InfiniteSlider>
      )}
    </nav>
  );
}
