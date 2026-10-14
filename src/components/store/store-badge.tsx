import { STORE_META } from "@/lib/stores";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Store mark: the store's name in its own colour, set in the data face like a filing label.
 * A stand-in for the official logo files from each affiliate program. Always left-to-right.
 */
export function StoreBadge({
  store,
  className,
  size = "sm",
  otherLabel,
}: {
  store: Store;
  className?: string;
  size?: "sm" | "md";
  /** Translated word for a store that is not one of the three (the "other" store type). */
  otherLabel?: string;
}) {
  const meta = STORE_META[store] ?? STORE_META.other;
  return (
    <span
      dir={store === "other" ? undefined : "ltr"}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-semibold uppercase leading-none tracking-[0.06em]",
        size === "sm" ? "text-[12px]" : "text-[14px]",
        className,
      )}
      style={{ color: meta.ink }}
    >
      <span aria-hidden className="size-1.5 shrink-0" style={{ background: meta.ink }} />
      {store === "other" && otherLabel ? otherLabel : meta.name}
    </span>
  );
}
