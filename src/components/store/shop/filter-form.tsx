"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";

/**
 * GET form that works without JavaScript. With JavaScript, every change applies at once
 * (no reload, scroll position kept) and the price slider shows its value while you drag.
 */
export function FilterForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  function apply() {
    const form = ref.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      const v = String(value).trim();
      if (!v) continue;
      const input = form.elements.namedItem(key);
      // The slider at its far end means "any price": leave it out of the address.
      if (input instanceof HTMLInputElement && input.type === "range" && input.value === input.max) continue;
      params.set(key, v);
    }
    const qs = params.toString();
    router.push(qs ? `${action}?${qs}` : action, { scroll: false });
  }

  // The native change event fires once per decision: a picked option, or a released slider.
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const onChange = (e: Event) => {
      const el = e.target;
      // Typing in the search box applies on Enter, not when the box loses focus.
      if (el instanceof HTMLInputElement && el.type === "search") return;
      apply();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  });

  return (
    <form
      ref={ref}
      action={action}
      method="get"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      {children}
    </form>
  );
}

/** Price slider with a live label. Its far end means "any price". */
export function PriceRange({
  id,
  name,
  min,
  max,
  value,
  currency,
  locale,
  labels,
}: {
  id: string;
  name: string;
  min: number;
  max: number;
  value: number;
  currency: string;
  locale: Locale;
  labels: { anyPrice: string; upTo: string };
}) {
  const [v, setV] = useState(value);
  const fill = ((v - min) / Math.max(1, max - min)) * 100;
  const text = v >= max ? labels.anyPrice : fmt(labels.upTo, { price: "⁦" + formatPrice(v, currency, locale) + "⁩" });
  return (
    <>
      <output htmlFor={id} className="mt-1 block text-[length:var(--t-small)] font-semibold tabular">
        {text}
      </output>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={1}
        defaultValue={value}
        onInput={(e) => setV(Number((e.target as HTMLInputElement).value))}
        aria-valuetext={text}
        className="range mt-1"
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
    </>
  );
}
