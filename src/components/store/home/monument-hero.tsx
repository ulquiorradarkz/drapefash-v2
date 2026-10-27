"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { SmartImage } from "@/components/smart-image";
import { LiquidGlass } from "@/components/fx/liquid-glass";
import { LiquidWordmark } from "@/components/fx/liquid-wordmark";
import { ShaderField } from "@/components/fx/shader-field";
import { useReduced } from "@/lib/use-reduced";
import type { HomePiece } from "./types";

type Labels = { line: string; cta: string; open: string };

/**
 * The name as a monument, poured in liquid chrome. The ground is a moving shader field in cobalt,
 * black and chrome; one framed piece from the edit stands at the start edge and changes every few
 * seconds, its ID on a glass tag; the item-ID box (the thing people arrive with from Instagram) sits
 * on a glass panel; and DRAPE runs along the foot, crossing the frame. As the screen leaves, the
 * name settles a few percent smaller.
 */
export function MonumentHero({ pieces, labels, shopHref, idForm }: { pieces: HomePiece[]; labels: Labels; shopHref: string; idForm: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReduced();
  const [active, setActive] = useState(0);
  const n = pieces.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.93]);
  const drift = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "8%"]);

  useEffect(() => {
    if (reduce || n < 2) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % n), 3400);
    return () => window.clearInterval(t);
  }, [reduce, n]);

  const piece = pieces[active];

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="monument relative isolate -mt-[var(--header-h)] flex flex-col overflow-hidden pb-10 pt-[var(--header-h)] lg:block lg:h-[100svh] lg:min-h-[700px] lg:pb-0 lg:pt-0"
    >
      <ShaderField colours={["#1f2de6", "#07080c", "#7d8699"]} />

      {/* The framed piece: the top of the screen on a phone, the start edge on a desktop. */}
      <div className="relative mx-3 mt-3 h-[58svh] min-h-[360px] overflow-hidden rounded-[var(--radius-frame)] bg-paper-2 lg:absolute lg:bottom-[var(--gutter)] lg:start-[var(--gutter)] lg:top-[calc(var(--header-h)+10px)] lg:m-0 lg:h-auto lg:w-[40%]">
        <motion.div className="absolute inset-[-6%_0]" style={{ y: drift }}>
          <AnimatePresence initial={false}>
            {piece?.image && (
              <motion.div
                key={piece.id}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: reduce ? 1 : 1.07 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <SmartImage src={piece.image} alt={piece.title} fill priority sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover object-[50%_30%]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {piece && (
          <LiquidGlass
            as={Link}
            href={piece.href}
            radius={999}
            bezel={14}
            strength={28}
            className="lg-tag focus-ring absolute bottom-4 start-4 z-10 inline-flex min-h-12 items-center gap-3 px-5 t-small font-semibold text-ink"
          >
            <span className="sr-only">{labels.open}: </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={piece.id}
                className="inline-flex items-center gap-3"
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: 0.3 }}
              >
                {piece.code && <span dir="ltr">{piece.code}</span>}
                {piece.price && (
                  <span dir="ltr" className="tabular font-medium">
                    {piece.price}
                  </span>
                )}
                <span className="sr-only">{piece.title}</span>
              </motion.span>
            </AnimatePresence>
          </LiquidGlass>
        )}
      </div>

      {/* The monument: crosses the frame's lower edge and ends flush with the end margin. */}
      <motion.h1
        id="hero-title"
        style={{ scale }}
        className="monument-name relative z-10 mx-[var(--gutter)] -mt-[5vw] origin-bottom lg:absolute lg:bottom-[clamp(20px,4.5vh,44px)] lg:end-[var(--gutter)] lg:m-0 lg:origin-bottom-right"
      >
        <span className="sr-only">Drape</span>
        <LiquidWordmark className="hero-wipe w-full lg:w-[var(--monument-w)]" />
      </motion.h1>

      {/* The sentence, the ID box and the one action, centred on the right half's own axis. */}
      <div className="relative z-10 mt-8 px-[var(--gutter)] lg:absolute lg:start-[calc(40%+2*var(--gutter))] lg:end-[var(--gutter)] lg:top-[calc(var(--header-h)+clamp(24px,7vh,80px))] lg:mt-0 lg:flex lg:justify-center lg:px-0">
        <div className="w-full max-w-[34rem]">
          <p className="hero-rise max-w-[26ch] text-[length:var(--t-statement)] font-medium leading-[1.3] text-ink" style={{ ["--rise-delay" as string]: "0.2s" }}>
            {labels.line}
          </p>
          <LiquidGlass
            radius={22}
            bezel={18}
            strength={30}
            className="lg-panel hero-rise mt-6 p-4 sm:p-5"
            style={{ ["--rise-delay" as string]: "0.35s" }}
          >
            {idForm}
          </LiquidGlass>
          <Link href={shopHref} className="btn btn-primary btn-lg hero-rise mt-5" style={{ ["--rise-delay" as string]: "0.5s" }}>
            {labels.cta}
            <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
