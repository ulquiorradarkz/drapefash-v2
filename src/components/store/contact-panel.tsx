import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/i18n";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { HandleWave } from "./handle-wave";

/** The Instagram glyph (camera outline), drawn in the current text colour. */
export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("block", className)} aria-hidden focusable="false">
      <rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

/**
 * Contact as display rows: full-width bands in two tones of the ground, every row the same size,
 * the text in each band's lower third. The heading, the handle (the link), where the owner answers,
 * and a last row that is the action itself with a round arrow at its end.
 */
export function ContactPanel({ t, as: Heading = "h2", className }: { t: Dictionary; as?: "h1" | "h2"; className?: string }) {
  const row = "contact-row page-x flex min-h-[84px] items-end pb-4 sm:min-h-[150px] sm:pb-6";
  const type = "font-display text-[length:clamp(30px,7vw,112px)] leading-[0.95]";
  return (
    <section aria-labelledby="contact-title" className={cn("contact-block mt-[var(--section)]", className)}>
      <div className={cn(row, "bg-paper-2")} data-reveal="">
        <Heading id="contact-title" className={type}>
          {t.contact.heading}
        </Heading>
      </div>
      <div className={cn(row, "bg-paper")} data-reveal="">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener" dir="ltr" className={cn(type, "focus-ring normal-case text-ink transition-colors duration-300 hover:text-accent-soft")}>
          <HandleWave text={INSTAGRAM_HANDLE} />
          <span className="sr-only"> ({t.contact.newTab})</span>
        </a>
      </div>
      <div className={cn(row, "bg-paper-2")} data-reveal="">
        <p className="flex max-w-[44ch] items-start gap-3 text-[length:var(--t-statement)] leading-snug text-ink">
          <InstagramGlyph className="mt-1 size-6 shrink-0" />
          {t.contact.lead}
        </p>
      </div>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener"
        className={cn(row, "group bg-accent text-on-accent focus-ring transition-colors duration-300 hover:bg-accent-deep")}
      >
        <span className={cn(type, "flex items-center gap-[0.3em]")}>
          {t.contact.cta}
          <span aria-hidden className="grid size-[0.9em] shrink-0 place-items-center rounded-full bg-on-accent text-accent transition-transform duration-500 ease-drape group-hover:rotate-45">
            <ArrowUpRight className="size-[0.5em]" strokeWidth={2} />
          </span>
        </span>
        <span className="sr-only"> ({t.contact.newTab})</span>
      </a>
    </section>
  );
}
