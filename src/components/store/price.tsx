import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { discountPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Price with an optional was-price, in the data face. Numbers stay left-to-right inside right-to-left text. */
export function Price({
  price,
  original,
  currency,
  locale,
  labels,
  className,
  large,
}: {
  price: number | null;
  original: number | null;
  currency: string;
  locale: Locale;
  labels: { inStore: string; off: string };
  className?: string;
  large?: boolean;
}) {
  if (price === null) return <span className={cn("t-small text-ink-2", className)}>{labels.inStore}</span>;
  const off = discountPercent(price, original);
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <bdi dir="ltr" className={cn("font-mono tabular text-ink", large ? "text-[clamp(30px,3vw,40px)] font-medium tracking-tight" : "text-[15px] font-semibold")}>
        {formatPrice(price, currency, locale)}
      </bdi>
      {off && original && (
        <>
          <s className={cn("font-mono tabular text-ink-2", large ? "text-[length:var(--t-small)]" : "text-[13px]")}>
            <bdi dir="ltr">{formatPrice(original, currency, locale)}</bdi>
          </s>
          <span className={cn("tag tag-accent", large ? "text-[13px]" : "text-[11px]")}>{fmt(labels.off, { n: off })}</span>
        </>
      )}
    </span>
  );
}
