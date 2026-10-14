import { Sparkle } from "@/components/sparkle";

const WORDS = ["AliExpress", "SHEIN", "Bulchic", "Y2K", "Chrome", "Drape"];

/**
 * An endless band of chrome words (store names and the brand are not translated). It runs the other
 * way on right-to-left pages, pauses under the pointer and stands still with reduced motion.
 */
export function ChromeMarquee() {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center gap-10 pe-10 md:gap-16 md:pe-16" aria-hidden={hidden || undefined}>
      {WORDS.map((w) => (
        <span key={w} className="flex items-center gap-10 md:gap-16">
          <span className="chrome-text font-display text-[clamp(44px,7vw,112px)] font-bold leading-none tracking-[-0.04em]" dir="ltr">
            {w}
          </span>
          <Sparkle className="float size-8 shrink-0 md:size-12" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee relative mt-[clamp(48px,7vw,96px)] overflow-hidden py-6" role="presentation">
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
