"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useReduced } from "@/lib/use-reduced";
import { animate, createSpring, splitText, stagger } from "animejs";

/** `image` is the still (and the video's poster); `video` an optional muted loop shown in its place. */
export type VerbPanel = { verb: string; text: string; image: string; video?: string; link?: { href: string; label: string } };

/**
 * How it works, one verb at a time: full-screen street photographs, each holding a single verb in the
 * middle of the screen while its picture passes behind it, then pushed out by the next verb.
 * The letters of each verb are thrown up into place by anime.js as its panel arrives.
 */
export function Verbs({ panels, label }: { panels: VerbPanel[]; label: string }) {
  return (
    <section aria-label={label} className="mt-[var(--section)]">
      <ol>
        {panels.map((p, i) => (
          <Panel key={p.verb} panel={p} priority={i === 0} />
        ))}
      </ol>
    </section>
  );
}

function Panel({ panel, priority }: { panel: VerbPanel; priority: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const reduce = useReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);

  useEffect(() => {
    const panelEl = ref.current;
    const el = word.current;
    if (!panelEl || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only Latin words are split into letters: splitting joins in Arabic or Devanagari would break the script.
    const latin = /^[\p{Script=Latin}'’-]+$/u.test(panel.verb);
    const split = latin ? splitText(el, { chars: true }) : null;
    const targets = split ? split.chars : [el];
    el.style.opacity = "0";
    let played = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played) return;
        played = true;
        el.style.opacity = "";
        animate(targets, {
          y: ["0.9em", "0em"],
          rotate: [() => (Math.random() - 0.5) * 16, 0],
          opacity: [0, 1],
          delay: stagger(55),
          ease: createSpring({ mass: 1, stiffness: 110, damping: 11 }),
        });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(panelEl);
    return () => {
      io.disconnect();
      el.style.opacity = "";
      split?.revert();
    };
  }, [panel.verb]);

  return (
    <li ref={ref} className="street relative flex min-h-[max(100svh,560px)] flex-col overflow-clip bg-paper-2">
      <motion.div aria-hidden className="absolute inset-[-10%_0]" style={{ y }}>
        {panel.video && !reduce ? (
          <video autoPlay muted loop playsInline preload="metadata" poster={panel.image} className="street absolute inset-0 size-full object-cover">
            <source src={panel.video} type="video/webm" />
          </video>
        ) : (
          <Image src={panel.image} alt="" fill sizes="100vw" priority={priority} className="object-cover" />
        )}
      </motion.div>
      {/* The word starts in the middle of its panel, sticks in the middle of the screen, and leaves before the
          sentence at the foot of the panel arrives, so the two never overlap. */}
      <div className="relative flex-1 pt-[38svh]">
        <div className="sticky top-1/2 -translate-y-1/2 px-[var(--gutter)] text-center">
          <h2 className="t-giant leading-[0.95] text-ink max-lg:text-[24vw]">
            <span ref={word} className="inline-block">
              {panel.verb}
            </span>
          </h2>
        </div>
      </div>
      <div className="relative max-w-[36rem] bg-paper/85 p-[var(--gutter)] sm:pe-10">
        <p className="text-[length:var(--t-body)] leading-relaxed text-ink">{panel.text}</p>
        {panel.link && (
          <Link href={panel.link.href} className="link-u focus-ring mt-2 inline-block t-small font-semibold text-accent">
            {panel.link.label}
          </Link>
        )}
      </div>
    </li>
  );
}
