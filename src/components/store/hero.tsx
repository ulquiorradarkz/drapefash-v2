import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroVisual } from "@/components/store/hero-visual";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      <div className="mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-7xl place-items-center px-4 pb-14 pt-6 sm:min-h-[calc(100svh-4rem)] sm:px-6">
        <HeroVisual className="pointer-events-none absolute left-1/2 top-[42%] w-[min(118vw,760px)] -translate-x-1/2 -translate-y-1/2 sm:top-1/2" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="glass glass-blur mb-6 rounded-full border border-white/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/75">
            AliExpress · SHEIN · Bulchic
          </p>
          <h1 id="hero-title" className="chrome-wordmark text-[clamp(5.5rem,27vw,15rem)]" data-text="Drape">
            Drape
          </h1>
          <p className="mt-5 max-w-md text-balance text-base leading-relaxed text-white/75 sm:text-lg">
            Liquid-chrome fits, frosted-glass basics and Y2K finds, hand-picked from the stores you already love.
          </p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <Link href="/women" className="btn-chrome h-12 px-8 text-sm">
              Shop Women <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/men" className="btn-ghost-chrome h-12 px-8 text-sm">
              Shop Men <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
