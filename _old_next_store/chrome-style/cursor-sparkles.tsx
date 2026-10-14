"use client";

import { useEffect, useRef } from "react";

type Spark = { x: number; y: number; vx: number; vy: number; life: number; size: number; hue: number; spin: number };

/**
 * A short trail of 4-point sparkles behind the mouse (the wordmark's sparkle). Desktop mouse only,
 * off with reduced motion, never intercepts clicks, and stops drawing when nothing is left.
 */
export function CursorSparkles() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = canvas.current;
    if (!fine || reduce || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const sparks: Spark[] = [];
    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const star = (x: number, y: number, r: number, rot: number) => {
      const k = r * 0.16;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(k, -k, r, 0);
      ctx.quadraticCurveTo(k, k, 0, r);
      ctx.quadraticCurveTo(-k, k, -r, 0);
      ctx.quadraticCurveTo(-k, -k, 0, -r);
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= 0.022;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.03;
        s.spin += 0.04;
        ctx.globalAlpha = s.life;
        ctx.fillStyle = `hsl(${s.hue} 90% 88%)`;
        star(s.x, s.y, s.size * (0.4 + s.life * 0.6), s.spin);
      }
      ctx.globalAlpha = 1;
      raf = sparks.length ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      if (dist < 14) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (sparks.length > 40) sparks.shift();
      sparks.push({
        x: e.clientX + (Math.random() - 0.5) * 10,
        y: e.clientY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -Math.random() * 0.6,
        life: 1,
        size: 4 + Math.random() * 6,
        // ice blue to violet, like the chrome
        hue: 200 + Math.random() * 60,
        spin: Math.random() * Math.PI,
      });
      if (!raf) raf = requestAnimationFrame(draw);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[80] size-full" aria-hidden />;
}
