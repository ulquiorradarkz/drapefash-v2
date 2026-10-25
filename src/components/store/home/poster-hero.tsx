"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useReduced } from "@/lib/use-reduced";
import { SmartImage } from "@/components/smart-image";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { SwingTag } from "@/components/store/swing-tag";
import type { HomePiece } from "./types";

const CHARCOAL = [28, 28, 28];
const EASE = [0.22, 1, 0.36, 1] as const;

/** Average colour of a loaded picture, pulled most of the way back to charcoal so text stays legible. */
function groundFrom(img: HTMLImageElement): string | null {
  try {
    const c = document.createElement("canvas");
    c.width = 12;
    c.height = 18;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
    }
    const mix = (v: number, k: number) => Math.round(v / n * 0.28 + CHARCOAL[k] * 0.72);
    return `rgb(${mix(r, 0)} ${mix(g, 1)} ${mix(b, 2)})`;
  } catch {
    // A picture from another origin taints the canvas: keep the charcoal.
    return null;
  }
}

/**
 * The pinned poster. The name holds the screen while the pieces of the edit replace each other
 * beneath it, each bringing its own ground colour; the swing tag counts through their item IDs.
 * Plain `position: sticky` and the page's own scroll, nothing hijacked.
 */
export function PosterHero({
  pieces,
  line,
  cta,
  shopHref,
  openLabel,
}: {
  pieces: HomePiece[];
  line: string;
  cta: string;
  shopHref: string;
  openLabel: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReduced();
  const n = Math.max(1, pieces.length);
  const [index, setIndex] = useState(0);
  const [grounds, setGrounds] = useState<(string | null)[]>(() => pieces.map(() => null));
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(n - 1, Math.max(0, Math.floor(v * n * 0.999)));
    setIndex((i) => (i === next ? i : next));
  });

  const onLoad = useCallback((i: number, img: HTMLImageElement) => {
    const g = groundFrom(img);
    if (g) setGrounds((prev) => prev.map((p, k) => (k === i ? g : p)));
  }, []);

  const piece = pieces[index];

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative"
      style={{ height: `calc(100svh - var(--header-h) + ${(n - 1) * 50}svh)` }}
    >
      <div className="sticky top-[var(--header-h)] h-[calc(100svh-var(--header-h))] overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={false}
          animate={{ backgroundColor: grounds[index] ?? "rgb(28 28 28)" }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
        />

        <div className="relative mx-auto flex h-full flex-col px-[var(--gutter)] lg:block lg:px-0">
          {/* The portraits: one frame, 2:3, centred, running off the bottom edge. */}
          <div className="relative order-2 -mt-[9vw] aspect-[2/3] h-[52svh] self-center lg:absolute lg:start-1/2 lg:top-[72px] lg:mt-0 lg:h-[calc(100%-72px)] lg:-translate-x-1/2 lg:rtl:translate-x-1/2">
            {pieces.map((p, i) => (
              <motion.div
                key={p.id}
                className="absolute inset-0 overflow-hidden bg-paper-2"
                initial={false}
                animate={{ clipPath: i <= index ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }}
                transition={{ duration: reduce ? 0 : 0.95, ease: EASE }}
                aria-hidden={i !== index}
              >
                {p.image && (
                  <motion.div
                    className="absolute inset-0"
                    initial={false}
                    animate={{ scale: i === index || reduce ? 1 : 1.12 }}
                    transition={{ duration: reduce ? 0 : 1.4, ease: EASE }}
                  >
                    <SmartImage
                      src={p.image}
                      alt={i === index ? p.title : ""}
                      fill
                      priority={i === 0}
                      sizes="(max-width: 1024px) 92vw, 34vw"
                      className="object-cover"
                      onLoad={(e) => onLoad(i, e.currentTarget)}
                    />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* The name, pinned over the pictures. */}
          {/* The name, pinned over the pictures. Live Anton text (the wordmark is drawn from the same face),
              blended by difference so it reads on the charcoal and on a pale picture alike. */}
          <div className="relative z-10 order-1 pt-2 mix-blend-difference lg:absolute lg:inset-x-0 lg:top-[clamp(12px,2.5vh,40px)] lg:mx-auto lg:w-[82%] lg:pt-0">
            <h1
              id="hero-title"
              lang="en"
              dir="ltr"
              // Inline so the Arabic pages' generous line height (drape.css) does not push the name down.
              style={{ lineHeight: 0.92 }}
              className="hero-wipe block text-center text-[calc((100vw-2*var(--gutter))/2.42)] uppercase text-[#f1f1ef] [font-family:var(--font-anton)] lg:text-[calc(82vw/2.42)]"
            >
              Drape
            </h1>
          </div>

          {/* Bottom start: what this is, and the piece on show. */}
          <div className="relative z-10 order-3 mt-5 max-w-[30ch] lg:absolute lg:bottom-8 lg:start-[var(--gutter)] lg:mt-0">
            <p className="hero-rise text-[length:var(--t-statement)] font-semibold leading-[1.3] text-ink">
              {line}
            </p>
            <div className="mt-4 hidden min-h-[3.2em] lg:block" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {piece && (
                  <motion.p
                    key={piece.id}
                    initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="t-small text-ink-2"
                  >
                    <bdi>{piece.title}</bdi>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom end: the swing tag of the piece on show, and the one action. */}
          <div className="relative z-10 order-4 mt-5 flex items-end justify-between gap-4 pb-6 lg:absolute lg:bottom-8 lg:end-[var(--gutter)] lg:mt-0 lg:flex-col lg:items-end lg:pb-0">
            {piece && (
              <Link href={piece.href} className="focus-ring group hidden lg:block" aria-label={`${openLabel}: ${piece.title}`}>
                <SwingTag code={piece.code} lines={[piece.store, piece.price ?? ""]} className="w-[200px] transition-colors duration-300 group-hover:bg-accent group-hover:text-on-accent" />
              </Link>
            )}
            <Magnetic intensity={0.25} range={140}>
              <Link href={shopHref} className="btn btn-primary btn-lg hero-rise" style={{ ["--rise-delay" as string]: "0.5s" }}>
                {cta}
                <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
              </Link>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}
