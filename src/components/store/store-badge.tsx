import { STORE_META } from "@/lib/stores";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StoreBadge({ store, className }: { store: Store; className?: string }) {
  const meta = STORE_META[store] ?? STORE_META.other;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm",
        className,
      )}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      {meta.name}
    </span>
  );
}
