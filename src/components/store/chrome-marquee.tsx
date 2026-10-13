"use client";

import { useEffect, useRef } from "react";

const WORDS = ["Liquid silver", "Frosted glass", "Y2K chrome", "Iridescent", "Low-rise", "Cyber knit", "Mirror shine", "Holo"];

/** Endless chrome ticker. gsap (lazy-loaded) speeds it up with scroll velocity; pure CSS fallback otherwise. */
export function ChromeMarquee() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !track.current) return;
    let killed = false;
    let cleanup = () => {};
    const el = track.current;
    (async () => {
      const { gsap } = await import("gsap");
      if (killed) return;
      el.classList.remove("marquee-track");
      const tween = gsap.to(el, { xPercent: -50, duration: 32, ease: "none", repeat: -1 });
      let last = window.scrollY;
      let decay: gsap.core.Tween | null = null;
      const onScroll = () => {
        const v = Math.min(Math.abs(window.scrollY - last), 120);
        last = window.scrollY;
        tween.timeScale(1 + v / 18);
        decay?.kill();
        decay = gsap.to(tween, { timeScale: 1, duration: 0.8, ease: "power2.out" });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => {
        window.removeEventListener("scroll", onScroll);
        decay?.kill();
        tween.kill();
      };
    })();
    return () => {
      killed = true;
      cleanup();
    };
  }, []);

  const row = (
    <>
      {WORDS.map((w) => (
        <span key={w} className="flex items-center gap-8 px-4">
          <span className="chrome-text font-display text-xl font-bold uppercase tracking-tight sm:text-3xl">{w}</span>
          <span className="iris-text text-lg" aria-hidden>
            ✦
          </span>
        </span>
      ))}
    </>
  );

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-4 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]" aria-hidden>
      <div ref={track} className="marquee-track flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}
