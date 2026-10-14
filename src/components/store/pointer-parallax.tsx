"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Collage depth: every `.collage` block gets --px / --py (−1…1) from the pointer, and its
 * `.layer` children shift by their own --depth (see effects.css). Only for fine pointers;
 * it follows the visitor's hand, so it stays on under reduced motion, like a tilt.
 */
export function PointerParallax() {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      for (const el of document.querySelectorAll<HTMLElement>(".collage")) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const px = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (r.width / 2)));
        const py = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / (r.height / 2)));
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
      }
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
