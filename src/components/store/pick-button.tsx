"use client";

import { sparklePath } from "@/components/wordmark";
import { togglePick, usePicked } from "@/lib/picks";
import type { PickSnapshot } from "@/lib/pick-item";
import { cn } from "@/lib/utils";

/** The 4-point star, outlined or filled. */
export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="-13 -13 26 26" className={cn("block", className)} aria-hidden focusable="false">
      <path
        d={sparklePath(0, 0, 11.5)}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        style={{ transition: "fill .25s" }}
      />
    </svg>
  );
}

/**
 * Saves a piece to the visitor's picks (this browser only) or removes it.
 * `icon` sits on a product picture; `full` is the labelled button on the product page.
 */
export function PickButton({
  item,
  labels,
  variant = "icon",
  className,
}: {
  item: PickSnapshot;
  labels: { save: string; remove: string; saved: string };
  variant?: "icon" | "full";
  className?: string;
}) {
  const picked = usePicked(item.slug);
  const onClick = (e: React.MouseEvent) => {
    // Cards are links: the star must not open the product.
    e.preventDefault();
    e.stopPropagation();
    togglePick(item);
  };

  if (variant === "full") {
    return (
      <button type="button" onClick={onClick} aria-pressed={picked} className={cn("btn btn-line btn-lg", picked && "text-accent", className)}>
        <StarIcon filled={picked} className={cn("size-5 transition-transform duration-500", picked && "rotate-90")} />
        {picked ? labels.saved : labels.save}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={picked}
      aria-label={picked ? labels.remove : labels.save}
      title={picked ? labels.remove : labels.save}
      className={cn(
        "focus-ring grid size-11 place-items-center transition-[background-color,color] duration-300",
        picked ? "bg-accent text-on-accent" : "bg-paper-3 text-ink hover:bg-ink hover:text-paper-3",
        className,
      )}
    >
      <StarIcon filled={picked} className={cn("size-[18px] transition-transform duration-500", picked && "rotate-90")} />
    </button>
  );
}
