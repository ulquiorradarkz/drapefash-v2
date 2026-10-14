import Link from "next/link";
import { SmartImage } from "@/components/smart-image";
import { localePath, type Locale } from "@/i18n/config";
import { fmt, formatNumber, pluralize, type Dictionary } from "@/i18n";
import type { CatalogStats } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { categoryName, categoryShortName } from "@/lib/localize";
import type { Category } from "@/lib/types";

/**
 * Categories as tall black covers, the name running up the edge like a film poster spine:
 * a monochrome picture that takes its colour back under the pointer, the count and the lowest price.
 */
export function CategoryCovers({
  categories,
  stats,
  covers,
  locale,
  t,
}: {
  categories: Category[];
  stats: CatalogStats;
  /** First picture of each category, by category id. */
  covers: Record<string, string>;
  locale: Locale;
  t: Dictionary;
}) {
  const rows = categories.filter((c) => (stats.byCategory[c.id]?.count ?? 0) > 0);
  if (!rows.length) return null;
  const total = formatNumber(locale, rows.length);
  return (
    <section aria-labelledby="covers-title" className="page-x page-max mt-[var(--section)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="covers-title" data-reveal="" className="t-head text-ink">
          {t.poster.heading}
        </h2>
        <p className="t-data text-ink-2" aria-hidden dir="ltr">
          01 / {String(rows.length).padStart(2, "0")}
        </p>
      </div>
      <ul
        className="strip -mx-[var(--gutter)] mt-8 flex gap-3 overflow-x-auto px-[var(--gutter)] pb-2 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
        style={{ ["--n" as string]: rows.length }}
      >
        {rows.map((c, i) => {
          const s = stats.byCategory[c.id];
          const img = covers[c.id];
          return (
            <li key={c.id} className="w-[58vw] shrink-0 sm:w-[34vw] lg:w-auto" data-reveal="" style={{ ["--reveal-delay" as string]: `${i * 60}ms` }}>
              <Link
                href={localePath(locale, `/category/${c.slug}`)}
                aria-label={`${categoryName(c, locale, t)}, ${pluralize(locale, t.poster.pieces, s.count)}`}
                className="mono-pic focus-ring group relative block aspect-[9/16] overflow-hidden bg-ink text-paper-3"
              >
                {img && (
                  <SmartImage src={img} alt="" fill sizes="(max-width: 640px) 58vw, (max-width: 1024px) 34vw, 16vw" className="object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                )}
                <span className="absolute inset-x-0 top-0 flex items-start justify-between p-3 t-data" aria-hidden>
                  <span dir="ltr">
                    {String(i + 1).padStart(2, "0")}/{total}
                  </span>
                  <span className="size-2 bg-accent transition-transform duration-500 group-hover:scale-[2.5]" />
                </span>
                <span className="v-title absolute bottom-3 start-2 font-display text-[clamp(52px,6.4vw,104px)] leading-[0.82] text-paper-3 transition-colors duration-500 group-hover:text-accent-soft">
                  {categoryShortName(c, locale, t)}
                </span>
                <span className="absolute bottom-3 end-3 flex flex-col items-end gap-1 text-end t-data" aria-hidden>
                  <span>{pluralize(locale, t.poster.pieces, s.count)}</span>
                  {s.minPrice !== null && (
                    <span className="bg-paper-3 px-1.5 py-0.5 text-ink">{fmt(t.poster.from, { price: "⁦" + formatPrice(s.minPrice, "USD", locale) + "⁩" })}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
