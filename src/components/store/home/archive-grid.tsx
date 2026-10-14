import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { Orbit, Star } from "@/components/store/collage";
import { PickButton } from "@/components/store/pick-button";
import { StoreBadge } from "@/components/store/store-badge";
import { localePath, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { categoryName, localizeProduct, storeLabel } from "@/lib/localize";
import { toPickSnapshot } from "@/lib/pick-item";
import type { ProductWithCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E"];

/**
 * The newest pieces as an editorial study sheet: two tall pictures, three below, the heading
 * set across them, each piece labelled like a specimen (letter, item ID, category, store).
 */
export function ArchiveGrid({ products, locale, t }: { products: ProductWithCategory[]; locale: Locale; t: Dictionary }) {
  const items = products.filter((p) => p.images.length).slice(0, 5);
  if (items.length < 3) return null;
  const tile = [
    "col-span-6 lg:col-span-5 lg:col-start-2",
    "col-span-6 mt-16 lg:col-span-4 lg:col-start-8 lg:mt-28",
    "col-span-6 lg:col-span-3 lg:col-start-1",
    "col-span-6 mt-10 lg:col-span-4 lg:col-start-5 lg:mt-20",
    "col-span-6 hidden lg:col-span-3 lg:col-start-10 lg:mt-6 lg:block",
  ];
  const ratio = ["aspect-[4/5]", "aspect-[3/4]", "aspect-[3/4]", "aspect-[4/5]", "aspect-[3/4]"];

  return (
    <section aria-labelledby="archive-title" className="collage page-x page-max relative mt-[var(--section)]">
      <div className="flex items-end justify-between gap-6 border-b-[1.5px] border-ink pb-3">
        <p className="t-data t-data-up text-ink-2" dir="ltr" aria-hidden>
          [ DRP / {String(items.length).padStart(2, "0")} ]
        </p>
        <p className="t-data text-ink-2" lang="ja" aria-hidden>
          ドレープ — 研究
        </p>
      </div>

      <div className="relative mt-8 grid grid-cols-12 gap-x-3 gap-y-6 sm:gap-x-5">
        <Orbit className="absolute -inset-x-[6%] top-[8%] h-[70%] text-ink/70" rx={49} ry={40} rotate={-8} />
        <Orbit className="absolute inset-x-[18%] top-[30%] hidden h-[64%] text-grey lg:block" rx={36} ry={48} rotate={22} />

        <h2
          id="archive-title"
          data-reveal="wipe"
          className="cutout-text pointer-events-none relative z-20 col-span-12 t-giant text-ink lg:absolute lg:inset-x-0 lg:top-[19%] lg:text-center"
        >
          <span>{t.archive.heading}</span>
        </h2>

        {items.map((raw, i) => {
          const p = localizeProduct(raw, locale);
          const href = localePath(locale, `/product/${p.slug}`);
          return (
            <article key={p.id} className={cn("relative", tile[i])} data-reveal="" style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
              <div className="relative">
                <Link href={href} className="frame-zoom ribbed-hover focus-ring relative block overflow-hidden bg-paper-3" aria-label={p.title}>
                  <span className={cn("relative block", ratio[i])}>
                    <SmartImage
                      src={p.images[0]}
                      alt={fmt(t.product.imgAlt, { name: p.title, store: storeLabel(p.store, t) })}
                      fill
                      sizes="(max-width: 1024px) 50vw, 34vw"
                      className="object-cover"
                    />
                  </span>
                  <span className="ribbed" />
                </Link>
                <PickButton
                  item={toPickSnapshot(raw, locale)}
                  labels={{ save: t.picks.save, remove: t.picks.remove, saved: t.picks.saved }}
                  className="absolute end-0 top-0"
                />
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 t-data">
                <dt className="text-ink-2">{t.archive.piece}</dt>
                <dd className="font-semibold text-ink" dir="ltr">
                  {LETTERS[i]} — {p.code ?? "—"}
                </dd>
                {p.category && (
                  <>
                    <dt className="text-ink-2">{t.product.category}</dt>
                    <dd>{categoryName(p.category, locale, t)}</dd>
                  </>
                )}
                <dt className="text-ink-2">{t.product.store}</dt>
                <dd>
                  <StoreBadge store={p.store} otherLabel={t.product.store} />
                </dd>
              </dl>
              <p className="mt-2 flex items-baseline justify-between gap-3 text-[length:var(--t-small)] leading-snug">
                <Link href={href} className="link-u focus-ring line-clamp-2">
                  <bdi>{p.title}</bdi>
                </Link>
                {p.price !== null && (
                  <bdi dir="ltr" className="shrink-0 font-mono text-[14px] tabular">
                    {formatPrice(p.price, p.currency, locale)}
                  </bdi>
                )}
              </p>
            </article>
          );
        })}
        <Star className="pointer-events-none absolute -bottom-6 end-[4%] w-10 text-ink" motion="turn" />
      </div>

      <div className="mt-14 grid gap-6 border-t-[1.5px] border-ink pt-6 md:grid-cols-12">
        <p className="max-w-[52ch] t-statement md:col-span-7">{t.archive.intro}</p>
        <div className="md:col-span-4 md:col-start-9 md:justify-self-end">
          <Link href={`${localePath(locale, "/shop")}?sort=new`} className="btn btn-ink btn-lg">
            {t.archive.seeAll}
            <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
