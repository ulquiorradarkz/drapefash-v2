import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { discountPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Price with an optional was-price, tabular figures. Numbers stay left-to-right inside right-to-left text. */
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
      <bdi dir="ltr" className={cn("tabular text-ink", large ? "font-display text-[length:var(--t-head)] leading-none" : "text-[16px] font-semibold")}>
        {formatPrice(price, currency, locale)}
      </bdi>
      {off && original && (
        <>
          <s className={cn("tabular text-ink-2", large ? "text-[length:var(--t-small)]" : "text-[14px]")}>
            <bdi dir="ltr">{formatPrice(original, currency, locale)}</bdi>
          </s>
          <span className={cn("tag tag-accent", large ? "text-[14px]" : "text-[13px]")}>{fmt(labels.off, { n: off })}</span>
        </>
      )}
    </span>
  );
}
