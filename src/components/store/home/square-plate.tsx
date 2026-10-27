"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { SmartImage } from "@/components/smart-image";
import { PickButton } from "@/components/store/pick-button";
import { ShopNowButton } from "@/components/store/shop-now-button";
import { useReduced } from "@/lib/use-reduced";
import { cn } from "@/lib/utils";
import type { HomePiece } from "./types";

type Labels = { heading: string; shop: string; shopOn: string; newTab: string; save: string; remove: string; saved: string; open: string };

/**
 * The featured pieces on one square plate: the picture fills the start half, the end half holds the
 * piece's ID as tabs along the top, its name and facts in the middle, and the two actions as cells
 * along the foot (Shop in ink, Save a tone off the field). A tab changes the plate.
 */
export function SquarePlate({ pieces, labels }: { pieces: HomePiece[]; labels: Labels }) {
  const reduce = useReduced();
  const [active, setActive] = useState(0);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (!pieces.length) return null;
  const piece = pieces[active];
  const fade = { initial: { opacity: 0, y: reduce ? 0 : 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section aria-labelledby={`${uid}-title`} className="page-x page-max mt-[var(--section)] grid gap-8 lg:min-h-[88svh] lg:grid-cols-2 lg:items-center lg:gap-[var(--gutter)]">
      <h2 id={`${uid}-title`} className="sr-only">
        {labels.heading}
      </h2>
      <div data-reveal="" className="relative aspect-square overflow-hidden rounded-[var(--radius-frame)] bg-paper-2 lg:mx-10">
        <AnimatePresence initial={false}>
          {piece.image && (
            <motion.div key={piece.id} className="absolute inset-0" initial={{ opacity: 0, scale: reduce ? 1 : 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <Link href={piece.href} tabIndex={-1} aria-hidden className="frame-zoom absolute inset-0 block">
                <SmartImage src={piece.image} alt="" fill sizes="(max-width: 1024px) 100vw, 46vw" className="object-cover" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-10 lg:h-[min(88svh,calc(50vw-80px))] lg:justify-between lg:py-10">
        {pieces.length > 1 && (
          <div role="tablist" aria-label={labels.heading} className="flex flex-wrap gap-x-7 gap-y-2" data-reveal="">
            {pieces.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={i === active}
                aria-current={i === active ? "true" : undefined}
                aria-controls={`${uid}-panel`}
                onClick={() => setActive(i)}
                className={cn(
                  "focus-ring min-h-11 text-[18px] font-semibold transition-colors duration-300",
                  i === active ? "link-u text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                <span dir="ltr">{p.code ?? p.category ?? p.title}</span>
              </button>
            ))}
          </div>
        )}

        <div id={`${uid}-panel`} role={pieces.length > 1 ? "tabpanel" : undefined} aria-labelledby={pieces.length > 1 ? `${uid}-tab-${active}` : undefined} className="min-h-[11rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={piece.id} {...fade}>
              <h3 className="max-w-[18ch] font-display text-[length:var(--t-head)] leading-[0.92] text-ink">
                <Link href={piece.href} className="focus-ring transition-colors hover:text-accent-soft">
                  <bdi>{piece.title}</bdi>
                </Link>
              </h3>
              <p className="mt-6 max-w-[34ch] text-[length:var(--t-body)] text-ink">
                <bdi>{[piece.category, piece.store].filter(Boolean).join(" · ")}</bdi>
                {piece.price && (
                  <>
                    {" · "}
                    <span dir="ltr" className="tabular font-semibold">
                      {piece.price}
                    </span>
                  </>
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-reveal="">
          <ShopNowButton
            slug={piece.slug}
            label={labels.shop}
            variant="ink"
            newTabText={`${labels.shopOn.replace("{store}", piece.store)}, ${labels.newTab}`}
            className="h-[60px] w-full lg:h-[72px]"
          />
          <PickButton item={piece.pick} variant="full" labels={{ save: labels.save, remove: labels.remove, saved: labels.saved }} className="h-[60px] w-full lg:h-[72px]" />
        </div>
      </div>
    </section>
  );
}
