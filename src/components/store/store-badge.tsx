import { STORE_META } from "@/lib/stores";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Store mark: the store's name in the text face, in the ink, with a small sage square before it.
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
        "inline-flex items-center gap-1.5 font-semibold leading-none text-ink",
        size === "sm" ? "text-[15px]" : "text-[16px]",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 bg-accent" />
      {store === "other" && otherLabel ? otherLabel : meta.name}
    </span>
  );
}
