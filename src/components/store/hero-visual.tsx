"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
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
 * Static render first (fast LCP). The WebGL scene is lazy-loaded:
 *  - never with prefers-reduced-motion, Save-Data, slow connections, no WebGL, or low-end touch devices
 *  - desktop: after the browser is idle
 *  - capable phones: after the first interaction (keeps Lighthouse mobile & first paint light)
 * Override for testing with ?hero=3d or ?hero=static.
 */
export function HeroVisual({ className }: { className?: string }) {
  const [mode, setMode] = useState<"static" | "3d">("static");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [low, setLow] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const force = new URLSearchParams(window.location.search).get("hero");
    if (force === "static") return;
    const nav = navigator as Nav;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const slow = !!nav.connection?.saveData || /(^|-)2g|3g/.test(nav.connection?.effectiveType ?? "");
    if (force !== "3d" && (reduce || slow || (coarse && lowEnd) || !hasWebGL())) return;
    setLow(coarse || lowEnd);

    let cancelled = false;
    const go = () => !cancelled && setMode("3d");
    if (force === "3d") {
      go();
      return;
    }
    if (coarse) {
      const events = ["pointerdown", "touchstart", "scroll", "keydown"] as const;
      const handler = () => {
        events.forEach((e) => window.removeEventListener(e, handler));
        go();
      };
      events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
      return () => {
        cancelled = true;
        events.forEach((e) => window.removeEventListener(e, handler));
      };
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(go, { timeout: 2500 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const t = window.setTimeout(go, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  // Pause rendering when the hero is off-screen.
  useEffect(() => {
    if (mode !== "3d" || !wrap.current) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [mode]);

  return (
    <div
      ref={wrap}
      className={cn("relative aspect-square [mask-image:radial-gradient(closest-side,#000_62%,transparent_100%)]", className)}
      data-hero-mode={ready ? "3d" : "static"}
    >
      <Image
        src="/hero/chrome-fallback.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 720px"
        className={cn("object-cover transition-opacity duration-1000", ready && "opacity-0")}
      />
      {mode === "3d" && (
        <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-1000", ready && "opacity-100")}>
          <HeroScene active={active} low={low} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
