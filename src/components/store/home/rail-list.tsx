"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { useReduced } from "@/lib/use-reduced";
import { SmartImage } from "@/components/smart-image";
import type { HomePiece } from "./types";

export type RailGroup = { name: string; slug: string; href: string; pieces: HomePiece[] };

type Labels = { heading: string; intro: string; finder: string; placeholder: string; noMatch: string; seeAll: string };

/** "14", "drp14", "DRP-014" → 14; anything else → null. */
function numberOf(q: string): number | null {
  const m = q.replace(/\s+/g, "").match(/^(?:drp-?)?0*(\d{1,4})$/i);
  return m ? parseInt(m[1], 10) : null;
}

function matches(p: HomePiece, q: string, num: number | null): boolean {
  if (num !== null && p.code) {
    const m = p.code.match(/(\d+)$/);
    if (m && parseInt(m[1], 10) === num) return true;
  }
  const hay = `${p.code ?? ""} ${p.title} ${p.store} ${p.category ?? ""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

/**
 * The archive as a line-up: every row at one type size, ID, name, store and price on fixed column
 * starts, grouped under the category in the accent. The live part: type the ID from an Instagram post
 * (or just its number, or a word) and the list narrows as you type; Enter opens the piece.
 * Under the pointer the hovered piece's picture follows the cursor.
 */
export function RailList({ groups, labels, idAction, shopHref }: { groups: RailGroup[]; labels: Labels; idAction: string; shopHref: string }) {
  const router = useRouter();
  const reduce = useReduced();
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<HomePiece | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });

  const term = q.trim();
  const num = numberOf(term);
  const shown = useMemo(
    () => groups.map((g) => ({ ...g, pieces: term ? g.pieces.filter((p) => matches(p, term, num)) : g.pieces })).filter((g) => g.pieces.length),
    [groups, term, num],
  );
  const hits = shown.flatMap((g) => g.pieces);

  return (
    <section
      aria-labelledby="rail-title"
      className="page-x page-max relative mt-[var(--section)]"
      onPointerMove={(e) => {
        x.set(e.clientX);
        y.set(e.clientY);
      }}
    >
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-6">
          <h2 id="rail-title" data-reveal="" className="t-head text-ink">
            {labels.heading}
          </h2>
          <p data-reveal="" className="mt-5 max-w-[48ch] text-[length:var(--t-body)] text-ink" style={{ ["--reveal-delay" as string]: "80ms" }}>
            {labels.intro}
          </p>
        </div>
        <form
          action={idAction}
          role="search"
          data-reveal=""
          style={{ ["--reveal-delay" as string]: "160ms" }}
          className="lg:col-span-5 lg:col-start-8"
          onSubmit={(e) => {
            if (hits.length === 1) {
              e.preventDefault();
              router.push(hits[0].href);
            }
          }}
        >
          <label htmlFor="rail-q" className="t-small font-semibold text-ink">
            {labels.finder}
          </label>
          <div className="mt-2 flex">
            <input
              id="rail-q"
              name="code"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={labels.placeholder}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              className="field h-14 min-w-0 flex-1 text-[20px] font-semibold"
            />
            <button type="submit" className="btn btn-primary h-14 shrink-0" aria-label={labels.finder}>
              <ArrowRight className="btn-icon size-5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </form>
      </div>

      <div className="mt-12" aria-live="polite">
        {shown.length === 0 && (
          <p className="py-10 text-[length:var(--t-statement)] text-ink-2">
            <bdi>{labels.noMatch.replace("{q}", term)}</bdi>
          </p>
        )}
        {shown.map((g) => (
          <div key={g.slug} className="relative">
            <h3 className="sticky top-[var(--header-h)] z-10 bg-paper pb-4 pt-14 text-[length:var(--t-statement)] font-semibold leading-tight text-accent">
              <Link href={g.href} className="link-u focus-ring">
                {g.name}
              </Link>
            </h3>
            <ul onPointerLeave={() => setHover(null)}>
              <AnimatePresence initial={false}>
                {g.pieces.map((p) => (
                  <motion.li
                    key={p.id}
                    layout={reduce ? false : "position"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Link
                      href={p.href}
                      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(p)}
                      onFocus={() => setHover(null)}
                      className={`focus-ring group grid grid-cols-[1fr_auto] gap-x-4 py-2 text-ink transition-[color,opacity] duration-300 lg:grid-cols-[minmax(7rem,12%)_1fr_20%_9rem] lg:items-baseline lg:py-1.5 ${hover && hover.id !== p.id ? "lg:opacity-40" : ""}`}
                    >
                      <span className="order-2 col-span-2 t-data text-ink-2 lg:order-none lg:col-span-1 lg:text-[length:var(--t-statement)] lg:font-normal lg:text-ink" dir="ltr">
                        {p.code ?? ""}
                        <span className="lg:hidden">
                          {" · "}
                          {p.store}
                          {p.price ? ` · ${p.price}` : ""}
                        </span>
                      </span>
                      <span className="col-span-2 truncate text-[20px] leading-snug transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 lg:col-span-1 lg:text-[length:var(--t-statement)]">
                        <bdi>{p.title}</bdi>
                      </span>
                      <span className="hidden truncate lg:block lg:text-[length:var(--t-statement)]">{p.store}</span>
                      <span className="hidden text-end tabular lg:block lg:text-[length:var(--t-statement)]" dir="ltr">
                        {p.price ?? ""}
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-14">
        <Link href={shopHref} className="btn btn-line btn-lg">
          {labels.seeAll}
          <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      </p>

      {/* The picture that follows the pointer. Decorative: the row already names the piece. */}
      {/* Physical left/top on purpose: it tracks the pointer's screen coordinates in every direction. */}
      <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-30 hidden lg:block" style={{ x: sx, y: sy }}>
        <AnimatePresence>
          {hover?.image && (
            <motion.div
              key="preview"
              className="relative ml-[18px] aspect-[2/3] w-[220px] -translate-y-1/2 overflow-hidden bg-paper-2"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
            >
              <SmartImage key={hover.id} src={hover.image} alt="" fill sizes="220px" className="object-cover" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
