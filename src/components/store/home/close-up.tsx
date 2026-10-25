"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useReduced } from "@/lib/use-reduced";
import { SmartImage } from "@/components/smart-image";
import { PickButton } from "@/components/store/pick-button";
import { ShopNowButton } from "@/components/store/shop-now-button";
import { cn } from "@/lib/utils";
import type { HomePiece } from "./types";

type Labels = { shop: string; shopOn: string; newTab: string; save: string; remove: string; saved: string; open: string };

/**
 * Close-up with a column card: the piece fills the screen, cropped to its detail, while a card one
 * column wide shows it whole with its ID, store, price and the Shop button. Each further piece moves
 * its card one column on, so the position carries the sequence. The close-up drifts with the scroll.
 */
export function CloseUp({ pieces, labels }: { pieces: HomePiece[]; labels: Labels }) {
  if (!pieces.length) return null;
  return (
    <div className="mt-[var(--section)]">
      {pieces.map((p, i) => (
        <Frame key={p.id} piece={p} col={i % 3} labels={labels} first={i === 0} />
      ))}
    </div>
  );
}

function Frame({ piece, col, labels, first }: { piece: HomePiece; col: number; labels: Labels; first: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "6%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1.25, 1.25, 1.25] : [1.36, 1.25, 1.18]);
  const headingId = `closeup-${piece.slug}`;
  return (
    <section ref={ref} aria-labelledby={headingId} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-paper-2">
      {piece.image && (
        <motion.div aria-hidden className="absolute inset-0" style={{ y, scale }}>
          <SmartImage src={piece.image} alt="" fill sizes="100vw" className="object-cover object-[50%_35%]" />
        </motion.div>
      )}
      <div className="page-x relative grid h-full items-end pb-0 lg:grid-cols-4 lg:items-center lg:gap-[var(--gutter)] lg:pb-0">
        <motion.article
          initial={{ opacity: 0, y: reduce ? 0 : 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "-mx-[var(--gutter)] flex min-h-[46svh] flex-col bg-ink p-5 text-paper lg:mx-0 lg:min-h-[52svh] lg:p-6",
            col === 0 && "lg:col-start-2",
            col === 1 && "lg:col-start-3",
            col === 2 && "lg:col-start-4",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {first ? (
                <h2 id={headingId} className="font-display text-[length:var(--t-statement)] leading-[1.02]">
                  <Link href={piece.href} className="focus-ring hover:text-accent-deep">
                    <bdi>{piece.title}</bdi>
                  </Link>
                </h2>
              ) : (
                <h3 id={headingId} className="font-display text-[length:var(--t-statement)] leading-[1.02]">
                  <Link href={piece.href} className="focus-ring hover:text-accent-deep">
                    <bdi>{piece.title}</bdi>
                  </Link>
                </h3>
              )}
              <p className="mt-3 t-small">
                {piece.code && (
                  <span dir="ltr" className="font-semibold">
                    {piece.code}
                    {" · "}
                  </span>
                )}
                <bdi>{[piece.category, piece.store].filter(Boolean).join(" · ")}</bdi>
              </p>
              {piece.price && (
                <p className="mt-1 t-small font-semibold tabular" dir="ltr">
                  {piece.price}
                </p>
              )}
            </div>
            {piece.image && (
              <Link href={piece.href} tabIndex={-1} aria-hidden className="relative block aspect-[2/3] w-24 shrink-0 overflow-hidden bg-paper-2 lg:hidden">
                <SmartImage src={piece.image} alt="" fill sizes="96px" className="object-cover" />
              </Link>
            )}
          </div>
          {piece.image && (
            <Link href={piece.href} tabIndex={-1} aria-hidden className="frame-zoom relative mt-5 hidden aspect-[3/2] w-full overflow-hidden bg-paper-2 lg:block">
              <SmartImage src={piece.image} alt="" fill sizes="22vw" className="object-cover" />
            </Link>
          )}
          <div className="mt-auto flex gap-2 pt-5">
            <ShopNowButton
              slug={piece.slug}
              label={labels.shop}
              newTabText={`${labels.shopOn.replace("{store}", piece.store)}, ${labels.newTab}`}
              className="flex-1"
            />
            <PickButton item={piece.pick} labels={{ save: labels.save, remove: labels.remove, saved: labels.saved }} className="size-12 bg-paper-2" />
          </div>
        </motion.article>
      </div>
    </section>
  );
}
