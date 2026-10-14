import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { sparklePath } from "@/components/wordmark";
import { cn } from "@/lib/utils";

/**
 * Collage material for the "período azul" look: ornate silver frames (Met, CC0), flying birds,
 * 4-point stars, grainy black discs, barcodes and vertical micro text. All decorative (aria-hidden)
 * unless a caller passes real content into a frame.
 */

type FrameName = "swept" | "carved" | "astragal";

const FRAMES: Record<FrameName, { src: string; w: number; h: number; inset: string }> = {
  swept: { src: "/collage/frame-swept.webp", w: 1074, h: 1272, inset: "12.5% 15% 12.5% 15%" },
  carved: { src: "/collage/frame-carved.webp", w: 1060, h: 1266, inset: "14.5% 16.5% 15% 16.5%" },
  astragal: { src: "/collage/frame-astragal.webp", w: 1137, h: 1280, inset: "18.5% 22% 18.5% 22%" },
};

/** An ornate silver frame with a picture (or anything) inside its opening. */
export function OrnateFrame({
  frame = "swept",
  children,
  className,
  style,
  sizes = "40vw",
  priority,
}: {
  frame?: FrameName;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  sizes?: string;
  priority?: boolean;
}) {
  const f = FRAMES[frame];
  return (
    <div className={cn("relative", className)} style={{ aspectRatio: `${f.w} / ${f.h}`, ...style }}>
      <div className="absolute overflow-hidden" style={{ inset: f.inset }}>
        {children}
      </div>
      <Image src={f.src} alt="" fill sizes={sizes} priority={priority} className="pointer-events-none select-none object-contain" />
    </div>
  );
}

/** One bird: body and tail still, both wings beating. */
export function Bird({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 -2 42 18" className={cn("bird block", className)} style={style} aria-hidden focusable="false">
      <path className="wing" d="M21 11.2C19.2 5.4 13.6 1 5 1.3C12.6 4.4 17 8.2 25.4 11.4Z" fill="currentColor" />
      <path d="M13 11.6C18 9.6 25 9.4 32.4 11.2C33.4 10.2 35.2 10 36.6 11C35.4 11.6 34.6 12.6 33.6 13C27 14.8 20 14.6 15 13.4L8.6 16L11.4 12.6L7.4 9.4Z" fill="currentColor" />
      <path className="wing" d="M24.4 11.2C26.6 4.6 32 0.2 39.6 -0.6C33.6 3.4 29.8 7.6 27.6 11.4Z" fill="currentColor" style={{ animationDelay: "calc(var(--beat-delay, 0s) + 0.06s)" }} />
    </svg>
  );
}

export type FlockBird = { x: number; y: number; size: number; rot?: number; tone?: "ink" | "grey" | "paper" | "accent"; beat?: number; delay?: number };

/** A small flock, positioned in % of its box. It drifts as a group; each bird beats at its own pace. */
export function Flock({ birds, className, flight = 9 }: { birds: FlockBird[]; className?: string; flight?: number }) {
  return (
    <div className={cn("flock pointer-events-none absolute", className)} style={{ ["--flight" as string]: `${flight}s` }} aria-hidden>
      {birds.map((b, i) => (
        <Bird
          key={i}
          className={cn("absolute", b.tone === "grey" ? "text-grey" : b.tone === "paper" ? "text-paper-3" : b.tone === "accent" ? "text-accent" : "text-ink")}
          style={{
            insetInlineStart: `${b.x}%`,
            top: `${b.y}%`,
            width: b.size,
            transform: `rotate(${b.rot ?? 0}deg) scaleX(var(--dir))`,
            ["--beat" as string]: `${b.beat ?? 0.8 + (i % 4) * 0.12}s`,
            ["--beat-delay" as string]: `${b.delay ?? (i * 0.17) % 0.9}s`,
          }}
        />
      ))}
    </div>
  );
}

/** The brand's 4-point star. `motion`: turn slowly, blink, or stay still. */
export function Star({
  className,
  style,
  motion = "none",
  outline,
}: {
  className?: string;
  style?: CSSProperties;
  motion?: "turn" | "blink" | "none";
  outline?: boolean;
}) {
  return (
    <svg viewBox="-12 -12 24 24" className={cn("block", className)} style={style} aria-hidden focusable="false">
      <path
        d={sparklePath(0, 0, 11.5)}
        className={motion === "turn" ? "star-turn" : motion === "blink" ? "star-blink" : undefined}
        fill={outline ? "none" : "currentColor"}
        stroke={outline ? "currentColor" : "none"}
        strokeWidth={outline ? 0.7 : 0}
      />
    </svg>
  );
}

/** A black disc with a rough, printed edge and paper speckle (the black suns of the references). */
export function GrainDisc({ className, style, id }: { className?: string; style?: CSSProperties; id: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("block", className)} style={style} aria-hidden focusable="false">
      <defs>
        <filter id={`${id}-rough`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
        </filter>
        <filter id={`${id}-speck`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="3" />
          <feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.95  0 0 0 0 0.94  0 0 0 9 -6.3" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <circle cx="100" cy="100" r="94" fill="var(--ink)" filter={`url(#${id}-rough)`} />
      <circle cx="100" cy="100" r="92" fill="#000" filter={`url(#${id}-speck)`} opacity="0.85" />
    </svg>
  );
}

/** A barcode drawn from any text (deterministic bar widths). */
export function Barcode({ text, className }: { text: string; className?: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < text.length * 3; i++) {
    const c = text.charCodeAt(i % text.length) + i * 7;
    const w = 1 + (c % 3);
    if (i % 2 === 0) bars.push({ x, w });
    x += w + 1 + ((c >> 2) % 2);
  }
  return (
    <svg viewBox={`0 0 ${x} 20`} preserveAspectRatio="none" className={cn("block", className)} aria-hidden focusable="false">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={20} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Micro text set vertically between two bracket ends, like the side rails of the references. */
export function SideRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("pointer-events-none flex flex-col items-center gap-3 text-ink", className)} aria-hidden>
      <span className="block h-3 w-3 border-s-[1.5px] border-t-[1.5px] border-e-[1.5px] border-current" />
      <span className="t-data whitespace-nowrap [writing-mode:vertical-rl]">{children}</span>
      <span className="block h-3 w-3 border-b-[1.5px] border-s-[1.5px] border-e-[1.5px] border-current" />
    </div>
  );
}

/** A thin dashed orbit (ellipse) crossing a composition. */
export function Orbit({ className, rx = 48, ry = 30, rotate = -14 }: { className?: string; rx?: number; ry?: number; rotate?: number }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("pointer-events-none block", className)} aria-hidden focusable="false">
      <ellipse cx="50" cy="50" rx={rx} ry={ry} transform={`rotate(${rotate} 50 50)`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
