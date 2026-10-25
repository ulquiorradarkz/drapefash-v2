"use client";

import { useEffect, useRef } from "react";
import { animate, splitText, stagger } from "animejs";

/** The Instagram handle as display type; its letters ripple (anime.js) when the pointer or focus reaches the link. */
export function HandleWave({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const link = el?.closest("a");
    if (!el || !link || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const split = splitText(el, { chars: true });
    let running = false;
    const wave = () => {
      if (running) return;
      running = true;
      animate(split.chars, {
        y: [{ to: "-0.12em", duration: 260 }, { to: "0em", duration: 520 }],
        delay: stagger(28),
        ease: "outQuad",
        onComplete: () => {
          running = false;
        },
      });
    };
    link.addEventListener("pointerenter", wave);
    link.addEventListener("focus", wave);
    return () => {
      link.removeEventListener("pointerenter", wave);
      link.removeEventListener("focus", wave);
      split.revert();
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
