import { discountPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Price({
  price,
  original,
  currency,
  className,
  large,
}: {
  price: number | null;
  original: number | null;
  currency: string;
  className?: string;
  large?: boolean;
}) {
  if (price === null) return <span className={cn("text-sm text-white/60", className)}>See price in store</span>;
  const off = discountPercent(price, original);
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-display font-bold tabular-nums text-white", large ? "text-3xl" : "text-base")}>{formatPrice(price, currency)}</span>
      {off && original && (
        <>
          <s className={cn("tabular-nums text-white/45", large ? "text-base" : "text-xs")}>{formatPrice(original, currency)}</s>
          <span className={cn("rounded-full bg-[#ff9de2]/15 px-1.5 py-0.5 font-semibold text-[#ffc2ee]", large ? "text-sm" : "text-[10px]")}>
            −{off}%
          </span>
        </>
      )}
    </span>
  );
}
