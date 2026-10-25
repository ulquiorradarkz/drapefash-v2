"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useReduced } from "@/lib/use-reduced";
import { SmartImage } from "@/components/smart-image";
import { cn } from "@/lib/utils";

export type FrameCategory = { slug: string; name: string; href: string; image: string | null; caption: string };

/**
 * One frame, its contents change: the departments are listed large on the concrete field and a single
 * 4:5 frame beside them shows a piece from each in turn. Pointing at (or focusing) a department holds
 * the frame on it; a tap on the frame moves to the next one. Under reduced motion it never turns by itself.
 */
export function CategoryFrame({ heading, categories }: { heading: string; categories: FrameCategory[] }) {
  const reduce = useReduced();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const n = categories.length;

  useEffect(() => {
    if (reduce || held || n < 2) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % n), 2600);
    return () => window.clearInterval(t);
  }, [reduce, held, n]);

  if (!n) return null;
  const current = categories[active];

  return (
    <section aria-labelledby="dept-title" className="night mt-[var(--section)]">
      <div className="page-x page-max grid gap-12 py-[clamp(96px,18vh,200px)] lg:grid-cols-12 lg:items-center lg:gap-[var(--gutter)]">
        <div className="lg:col-span-6">
          <h2 id="dept-title" className="sr-only">
            {heading}
          </h2>
          <ul onPointerLeave={() => setHeld(false)}>
            {categories.map((c, i) => (
              <li key={c.slug} data-reveal="" style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}>
                <Link
                  href={c.href}
                  onPointerEnter={() => {
                    setActive(i);
                    setHeld(true);
                  }}
                  onFocus={() => {
                    setActive(i);
                    setHeld(true);
                  }}
                  onBlur={() => setHeld(false)}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "focus-ring block py-0.5 font-display text-[length:var(--t-head)] leading-[0.95] transition-[color,transform] duration-500 ease-drape",
                    i === active ? "translate-x-3 text-ink rtl:-translate-x-3" : "text-ink/35 hover:text-ink",
                  )}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <figure className="lg:col-span-4 lg:col-start-8">
          <button
            type="button"
            onClick={() => setActive((a) => (a + 1) % n)}
            aria-label={current.name}
            className="focus-ring relative mx-auto block aspect-[4/5] w-[72vw] overflow-hidden bg-night-2 sm:w-[52vw] lg:w-full"
          >
            <AnimatePresence initial={false}>
              <motion.span
                key={current.slug}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: reduce ? 1 : 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {current.image && (
                  <SmartImage src={current.image} alt="" fill sizes="(max-width: 1024px) 72vw, 34vw" className="object-cover" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>
          <figcaption className="mt-4 min-h-[1.6em] text-center t-small text-ink lg:text-start" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={current.slug}
                className="inline-block"
                initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                transition={{ duration: 0.25 }}
              >
                <span className="font-semibold">{current.name}</span> · {current.caption}
              </motion.span>
            </AnimatePresence>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
