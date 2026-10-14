"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const HeroScene = dynamic(() => import("@/components/store/hero-scene"), { ssr: false });

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * A still frame of the 3D stage paints first (fast first paint), then the live WebGL stage takes over:
 *  - desktop: right after the first paint
 *  - capable phones: shortly after load
 *  - reduced motion: the stage still loads, in calm mode (it only follows the pointer)
 *  - never with Save-Data, slow connections, no WebGL, or low-end phones: they keep the still frame
 * Override for testing with ?hero=3d or ?hero=static.
 */
export function HeroVisual({ className, still }: { className?: string; still: { wide: string; tall: string } }) {
  const [mode, setMode] = useState<"static" | "3d">("static");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [low, setLow] = useState(false);
  const [calm, setCalm] = useState(false);
  const [reverse, setReverse] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReverse(document.documentElement.dir === "rtl");
    const force = new URLSearchParams(window.location.search).get("hero");
    if (force === "static") return;
    const nav = navigator as Nav;
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setCalm(reduceQuery.matches);
    const onReduce = (e: MediaQueryListEvent) => setCalm(e.matches);
    reduceQuery.addEventListener("change", onReduce);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const slow = !!nav.connection?.saveData || /(^|-)2g|3g/.test(nav.connection?.effectiveType ?? "");
    if (force !== "3d" && (slow || (coarse && lowEnd) || !hasWebGL())) return () => reduceQuery.removeEventListener("change", onReduce);
    setLow(coarse || lowEnd);

    let cancelled = false;
    const go = () => !cancelled && setMode("3d");
    const t = window.setTimeout(go, force === "3d" ? 0 : coarse ? 700 : 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      reduceQuery.removeEventListener("change", onReduce);
    };
  }, []);

  // Stop rendering while the hero is off-screen.
  useEffect(() => {
    if (mode !== "3d" || !wrap.current) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [mode]);

  return (
    <div ref={wrap} className={cn("relative overflow-hidden bg-void", className)} data-hero-mode={ready ? "3d" : "static"}>
      <picture>
        <source media="(max-aspect-ratio: 4/5)" srcSet={still.tall} />
        <img
          src={still.wide}
          alt=""
          fetchPriority="high"
          decoding="async"
          className={cn("hero-still absolute inset-0 size-full object-cover transition-opacity duration-1000", ready && "opacity-0")}
        />
      </picture>
      {mode === "3d" && (
        <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-1000", ready && "opacity-100")}>
          <HeroScene active={active} low={low} reverse={reverse} calm={calm} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
