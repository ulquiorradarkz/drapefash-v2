"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import type { Locale } from "@/i18n/config";
import { fmt, pluralize } from "@/i18n/format";
import type { Plural } from "@/i18n/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BudgetItem = { slug: string; href: string; title: string; image: string | null; price: number; currency: string; code: string | null };

/**
 * Set a budget and see what it buys. Every piece is one bar of a waveform, sorted by price:
 * the bars under the budget turn black and the pieces appear in the strip below.
 */
export function BudgetStrip({
  locale,
  items,
  min,
  max,
  start,
  currency,
  shopHref,
  labels,
}: {
  locale: Locale;
  items: BudgetItem[];
  min: number;
  max: number;
  start: number;
  currency: string;
  shopHref: string;
  labels: { heading: string; label: string; upTo: string; count: Plural; empty: string; seeAll: string; bars: string };
}) {
  const id = useId();
  const [budget, setBudget] = useState(start);
  const sorted = useMemo(() => [...items].sort((a, b) => a.price - b.price), [items]);
  const shown = useMemo(() => sorted.filter((i) => i.price <= budget).reverse(), [sorted, budget]);
  const priceText = formatPrice(budget, currency, locale);
  const fill = ((budget - min) / Math.max(1, max - min)) * 100;
  const top = sorted.length ? sorted[sorted.length - 1].price : 1;

  return (
    <section aria-labelledby={`${id}-h`} className="page-x page-max mt-[var(--section)]">
      <div className="grid gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-6" data-reveal="">
          <h2 id={`${id}-h`} className="t-head text-ink">
            {labels.heading}
          </h2>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
            <span className="font-display text-[clamp(44px,5vw,76px)] leading-none text-ink">{fmt(labels.upTo, { price: "⁦" + priceText + "⁩" })}</span>
            <span className="t-data text-ink-2">[ {pluralize(locale, labels.count, shown.length)} ]</span>
          </p>
        </div>
        <div className="md:col-span-5 md:col-start-8" data-reveal="" style={{ ["--reveal-delay" as string]: "90ms" }}>
          <label htmlFor={`${id}-r`} className="t-data t-data-up text-ink-2">
            {labels.label}
          </label>
          <input
            id={`${id}-r`}
            type="range"
            min={min}
            max={max}
            step={1}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            aria-valuetext={priceText}
            className="range mt-1"
            style={{ ["--fill" as string]: `${fill}%` }}
          />
          <div className="flex justify-between font-mono text-[12px] text-ink-2" dir="ltr" aria-hidden>
            <span>{formatPrice(min, currency, locale)}</span>
            <span>{formatPrice(max, currency, locale)}</span>
          </div>
        </div>
      </div>

      {/* The waveform: one bar per piece, height = price. */}
      <div role="img" aria-label={`${labels.bars}: ${pluralize(locale, labels.count, items.length)}`} className="mt-10 flex h-28 items-end gap-[3px] sm:h-36">
        {sorted.map((it) => (
          <span
            key={it.slug}
            className={cn("block flex-1 transition-[background-color,height] duration-500 ease-drape", it.price <= budget ? "bg-ink" : "bg-grey/40")}
            style={{ height: `${Math.max(6, (it.price / top) * 100)}%` }}
          />
        ))}
      </div>

      {shown.length ? (
        <ul className="strip -mx-[var(--gutter)] mt-6 flex gap-3 overflow-x-auto px-[var(--gutter)] pb-2" aria-label={labels.heading}>
          {shown.map((item) => (
            <li key={item.slug} className="w-[36vw] shrink-0 sm:w-[22vw] md:w-[13vw] md:min-w-[132px]">
              <Link href={item.href} className="frame-zoom focus-ring group block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-paper-3">
                  {item.image && <SmartImage src={item.image} alt={item.title} fill sizes="(max-width: 768px) 36vw, 14vw" className="object-cover" />}
                  {item.code && (
                    <span className="tag absolute start-0 top-0 text-[10px]" dir="ltr">
                      {item.code}
                    </span>
                  )}
                </span>
                <bdi dir="ltr" className="mt-2 block font-mono text-[13px] tabular text-ink">
                  {formatPrice(item.price, item.currency, locale)}
                </bdi>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 t-statement text-ink-2">{fmt(labels.empty, { price: priceText })}</p>
      )}

      <div className="mt-8">
        <Link href={`${shopHref}?max=${budget}`} className="btn btn-line">
          {labels.seeAll}
          <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
