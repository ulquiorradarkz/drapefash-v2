import type { Dictionary } from "@/i18n";
import { INSTAGRAM_URL } from "@/lib/contact";
import { cn } from "@/lib/utils";

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
 * Contact: only the Instagram logo. Pressing it opens the owner's Instagram in a new tab.
 * The heading is for screen readers and search engines; the logo is the whole page.
 */
export function ContactPanel({ t, as: Heading = "h2", className }: { t: Dictionary; as?: "h1" | "h2"; className?: string }) {
  return (
    <section aria-labelledby="contact-title" className={cn("contact-block page-x grid place-items-center", className)}>
      <Heading id="contact-title" className="sr-only">
        {t.contact.heading}
      </Heading>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener"
        aria-label={`${t.contact.cta} (${t.contact.newTab})`}
        title={t.contact.cta}
        className="focus-ring group grid place-items-center p-6 text-ink"
      >
        <InstagramGlyph className="size-[clamp(112px,18vw,220px)] transition-transform duration-500 ease-drape group-hover:scale-105 group-active:scale-95" />
      </a>
    </section>
  );
}
