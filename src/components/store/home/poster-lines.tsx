import Link from "next/link";

export type PosterLine = { slug: string; name: string; href: string; detail: string };

/**
 * The departments as a poster on the cobalt field: one per line in the display face, flush to the
 * start margin, and its one fact (how many pieces, from what price) on the same baseline at the end.
 * Two alignments only. Pointing at a line turns it blue-black.
 */
export function PosterLines({ heading, lines }: { heading: string; lines: PosterLine[] }) {
  if (!lines.length) return null;
  return (
    <section aria-labelledby="dept-title" className="night mt-[var(--section)] py-20 sm:py-24">
      <h2 id="dept-title" className="sr-only">
        {heading}
      </h2>
      <ul className="page-x page-max">
        {lines.map((l, i) => (
          <li key={l.slug} data-reveal="" style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}>
            <Link
              href={l.href}
              className="poster-line focus-ring group flex flex-col pb-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:pb-0"
            >
              <span className="font-display text-[length:var(--t-monument)] leading-[0.92] text-ink transition-[color,transform] duration-500 ease-drape group-hover:translate-x-3 group-hover:text-paper-3 rtl:group-hover:-translate-x-3">
                {l.name}
              </span>
              <span className="mt-1.5 shrink-0 text-[15px] font-medium text-ink tabular sm:mt-0 sm:text-[19px]">{l.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
