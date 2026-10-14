"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SmartImage } from "@/components/smart-image";
import { StoreBadge } from "@/components/store/store-badge";
import { ShopNowButton } from "@/components/store/shop-now-button";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ShowcaseItem = {
  slug: string;
  store: Store;
  title: string;
  description: string;
  image: string | null;
  imageAlt: string;
  price: string | null;
  href: string;
  shopLabel: string;
  newTabText: string;
};

/**
 * One piece from each store. On wide screens the square picture stays pinned while the three
 * stories scroll past, and swaps to the piece being read. On phones each story carries its own picture.
 */
export function StoreShowcase({
  heading,
  items,
  detailsLabel,
  otherLabel,
}: {
  heading: string;
  items: ShowcaseItem[];
  detailsLabel: string;
  otherLabel: string;
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  return (
    <section aria-labelledby="showcase-title" className="page-x mt-[var(--section)]">
      <h2 id="showcase-title" className="t-head chrome-text max-w-[20ch]" data-reveal="">
        {heading}
      </h2>
      <div className="mt-10 grid md:mt-4 md:grid-cols-2 md:gap-x-[clamp(24px,5vw,80px)]">
        <div className="relative hidden md:block">
          <div className="glass chrome-edge glow-ice sticky top-[calc(5rem+6svh)] aspect-square w-full overflow-hidden rounded-[2rem] p-2">
            <div className="relative size-full overflow-hidden rounded-[1.6rem] bg-surface">
            {items.map((it, i) =>
              it.image ? (
                <SmartImage
                  key={it.slug}
                  src={it.image}
                  alt={i === active ? it.imageAlt : ""}
                  fill
                  sizes="50vw"
                  className={cn(
                    "object-cover transition-[opacity,transform] duration-700 ease-drape",
                    i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
                  )}
                />
              ) : null,
            )}
            </div>
          </div>
        </div>
        <div>
          {items.map((it, i) => (
            <article
              key={it.slug}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-index={i}
              className="flex flex-col justify-center py-12 md:min-h-[86svh] md:py-0"
            >
              <Link href={it.href} tabIndex={-1} aria-hidden className="frame-zoom glass chrome-edge relative mb-8 block aspect-square overflow-hidden rounded-[1.6rem] bg-surface md:hidden">
                {it.image && <SmartImage src={it.image} alt={it.imageAlt} fill sizes="100vw" className="object-cover" />}
              </Link>
              <h3 className="t-head chrome-text max-w-[16ch]" data-reveal="">
                <Link href={it.href} className="focus-ring">
                  <bdi>{it.title}</bdi>
                </Link>
              </h3>
              {it.description && (
                <p className="mt-6 max-w-[38ch] text-[length:var(--t-body)] leading-relaxed text-ink" data-reveal="" style={{ ["--reveal-delay" as string]: "80ms" }}>
                  <bdi>{it.description}</bdi>
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-4" data-reveal="" style={{ ["--reveal-delay" as string]: "140ms" }}>
                <StoreBadge store={it.store} size="md" otherLabel={otherLabel} />
                {it.price && (
                  <bdi dir="ltr" className="tabular font-display text-[length:var(--t-statement)] font-bold">
                    {it.price}
                  </bdi>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3" data-reveal="" style={{ ["--reveal-delay" as string]: "200ms" }}>
                <ShopNowButton slug={it.slug} label={it.shopLabel} newTabText={it.newTabText} variant="solid" />
                <Link href={it.href} className="btn btn-glass">
                  {detailsLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
