"use client";

import { useEffect, useRef } from "react";
import { animate, createSpring } from "animejs";
import { SlidingNumber } from "@/components/motion-primitives/sliding-number";
import { cn } from "@/lib/utils";

/**
 * The swing tag: the item ID as it hangs on a piece, punched at the top. The number slides to the
 * next ID and the tag swings on its string (an anime.js spring) whenever the piece changes.
 */
export function SwingTag({ code, lines, className }: { code: string | null; lines: string[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dir = document.documentElement.dir === "rtl" ? -1 : 1;
    const anim = animate(el, {
      rotate: [dir * 9, 0],
      ease: createSpring({ mass: 1, stiffness: 140, damping: 5 }),
    });
    return () => {
      anim.revert();
    };
  }, [code]);

  const match = code?.match(/^(.*?)(\d+)$/);
  const prefix = match ? match[1] : code;
  const digits = match ? match[2] : "";
  const value = digits ? parseInt(digits, 10) : 0;
  const zeros = digits ? "0".repeat(Math.max(0, digits.length - String(value).length)) : "";

  return (
    <div ref={ref} className={cn("swing-tag relative origin-top bg-ink px-4 pb-3.5 pt-6 text-paper", className)}>
      <span aria-hidden className="absolute start-1/2 top-2 size-2.5 -translate-x-1/2 rounded-full bg-paper rtl:translate-x-1/2" />
      {code ? (
        <div className="flex items-baseline font-display text-[length:var(--t-statement)] leading-none" dir="ltr">
          <span className="sr-only">{code}</span>
          <span aria-hidden>
            {prefix}
            {zeros}
          </span>
          <span aria-hidden className="inline-flex">
            <SlidingNumber value={value} />
          </span>
        </div>
      ) : null}
      {lines.filter(Boolean).map((l, i) => (
        <p key={i} className={cn("t-data", i === 0 && code ? "mt-2" : "mt-0.5")}>
          <bdi>{l}</bdi>
        </p>
      ))}
    </div>
  );
}
