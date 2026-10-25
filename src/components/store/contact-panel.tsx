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
 * Contact: the owner answers on Instagram, so the handle itself is the section, set as display type
 * from margin to margin in the inverse colours. What to write about sits in the top corner.
 */
export function ContactPanel({ t, as: Heading = "h2", className }: { t: Dictionary; as?: "h1" | "h2"; className?: string }) {
  return (
    <section aria-labelledby="contact-title" className={cn("contact-block flex min-h-[88svh] flex-col bg-ink text-paper", className)}>
      <div className="page-x page-max flex w-full flex-1 flex-col pb-[clamp(32px,6vh,72px)] pt-[clamp(40px,8vh,96px)]">
        <Heading id="contact-title" className="max-w-[30ch] text-[length:var(--t-statement)] font-semibold leading-snug" data-reveal="">
          {t.contact.lead}
        </Heading>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener"
          dir="ltr"
          className="focus-ring group mt-auto block pt-16 font-display normal-case text-[length:var(--t-giant)] leading-[0.9] transition-colors duration-300 hover:text-accent-deep"
        >
          <HandleWave text={INSTAGRAM_HANDLE} />
          <span className="sr-only"> ({t.contact.cta}, {t.contact.newTab})</span>
        </a>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 t-small">
          <span className="inline-flex items-center gap-2 font-semibold">
            <InstagramGlyph className="size-5" />
            {t.contact.handleLabel}
          </span>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener" className="link-u focus-ring font-semibold">
            {t.contact.cta}
            <span className="sr-only"> ({t.contact.newTab})</span>
          </a>
        </div>
      </div>
    </section>
  );
}
