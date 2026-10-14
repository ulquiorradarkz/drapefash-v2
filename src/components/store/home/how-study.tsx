import Image from "next/image";
import Link from "next/link";
import { OrnateFrame, Star } from "@/components/store/collage";
import { LOCALES, localePath, type Locale } from "@/i18n/config";
import { formatNumber, type Dictionary } from "@/i18n";
import type { CatalogStats } from "@/lib/data";

/**
 * What Drape is and how buying works: a marble head in a silver frame with the catalogue's
 * real numbers beside it, and the four steps from picking a piece to the store shipping it.
 */
export function HowStudy({ stats, locale, t }: { stats: CatalogStats; locale: Locale; t: Dictionary }) {
  const facts = [
    { label: t.about.stores, value: formatNumber(locale, 3) },
    { label: t.about.languages, value: formatNumber(locale, LOCALES.length) },
    { label: t.about.pieces, value: formatNumber(locale, stats.total) },
    { label: t.about.checkout, value: t.about.checkoutValue, text: true },
  ];
  return (
    <section aria-labelledby="how-title" className="collage page-x page-max mt-[var(--section)]">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="relative mx-auto max-w-[420px] lg:mx-0" aria-hidden>
            <div className="layer" style={{ ["--depth" as string]: 8, ["--rot" as string]: "-3deg" }}>
              <OrnateFrame frame="carved" sizes="(max-width: 1024px) 80vw, 30vw">
                <div className="relative size-full bg-ink">
                  <Image src="/collage/statue-head.webp" alt="" fill sizes="(max-width: 1024px) 50vw, 20vw" className="object-contain object-bottom" />
                </div>
              </OrnateFrame>
            </div>
            <Star className="absolute -end-4 -top-5 w-16 text-ink" motion="turn" />
            <span className="tag absolute -start-2 bottom-[16%]" lang="ja">
              ドレープ
            </span>
          </div>
          <dl className="mt-12 grid grid-cols-2 gap-px bg-ink">
            {facts.map((f) => (
              <div key={f.label} className="bg-paper p-4">
                <dt className="t-data t-data-up text-ink-2">{f.label}</dt>
                <dd className={f.text ? "mt-2 text-[length:var(--t-small)] font-semibold" : "mt-1 font-display text-[clamp(48px,5vw,72px)] leading-none text-ink tabular"}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <h2 id="how-title" data-reveal="" className="t-monument text-ink">
            {t.how.heading}
          </h2>
          <p data-reveal="" className="mt-6 max-w-[46ch] t-statement" style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.how.intro}
          </p>
          <ol className="mt-12 border-t-[1.5px] border-ink">
            {t.how.stages.map((s, i) => (
              <li
                key={s.name}
                data-reveal=""
                style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}
                className="grid grid-cols-[3.2rem_1fr] gap-x-4 border-b-[1.5px] border-ink py-6 sm:grid-cols-[3.2rem_minmax(0,14rem)_1fr] sm:gap-x-6"
              >
                <span className="t-data text-ink-2" aria-hidden dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-[clamp(30px,3vw,42px)] leading-none">{s.name}</h3>
                <p className="col-start-2 mt-2 max-w-[44ch] text-[length:var(--t-small)] leading-relaxed sm:col-start-3 sm:mt-0">{s.text}</p>
              </li>
            ))}
          </ol>
          <p data-reveal="" className="mt-10 max-w-[56ch] text-[length:var(--t-body)] leading-relaxed">
            {t.about.paragraph}
          </p>
          <p className="mt-6">
            <Link href={localePath(locale, "/affiliate-disclosure")} className="link-u focus-ring font-semibold text-ink">
              {t.footer.disclosureLink}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
