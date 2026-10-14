import Link from "next/link";
import { redirect } from "next/navigation";
import { IdSearch } from "@/components/store/id-search";
import { Barcode, Flock, GrainDisc, Star } from "@/components/store/collage";
import { localePath, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";
import { normalizeCode } from "@/lib/code";
import { getProductByCode } from "@/lib/data";

/**
 * /<lang>/id?code=… and /<lang>/id/<code>: open the piece with that item ID,
 * or say plainly that no piece has it and offer the box again and a name search.
 */
export async function IdLookup({ locale, t, raw }: { locale: Locale; t: Dictionary; raw: string }) {
  const typed = raw.trim().slice(0, 40);
  if (!typed) redirect(localePath(locale, "/shop"));
  const product = await getProductByCode(typed);
  if (product) redirect(localePath(locale, `/product/${product.slug}`));

  const shown = normalizeCode(typed) || typed;
  return (
    <section aria-labelledby="id-missing" className="collage page-x page-max relative overflow-hidden pb-10 pt-[clamp(48px,8vw,120px)]">
      <GrainDisc id="id-disc" className="layer pointer-events-none absolute -end-24 top-6 hidden w-[min(56vw,520px)] opacity-95 md:block" style={{ ["--depth" as string]: 8 }} />
      <Flock
        className="end-[6%] top-[12%] h-40 w-[38%]"
        birds={[
          { x: 10, y: 40, size: 44, rot: -8 },
          { x: 38, y: 12, size: 30, rot: -14, tone: "ink" },
          { x: 62, y: 52, size: 36, rot: 4 },
          { x: 80, y: 20, size: 22, rot: -20, tone: "ink" },
        ]}
      />
      <div className="relative max-w-3xl">
        <p className="t-data t-data-up text-ink-2" dir="ltr">
          [ ID / {shown} ]
        </p>
        <h1 id="id-missing" className="mt-4 t-head text-ink">
          <bdi>{fmt(t.idSearch.notFoundTitle, { code: shown })}</bdi>
        </h1>
        <p className="mt-5 max-w-[46ch] t-statement">{t.idSearch.notFoundText}</p>
        <IdSearch locale={locale} t={t} id="id-again" defaultValue={shown} className="mt-10" />
        <p className="mt-8">
          <Link href={`${localePath(locale, "/shop")}?q=${encodeURIComponent(typed)}`} className="link-u focus-ring text-[length:var(--t-small)] font-semibold text-ink">
            {fmt(t.idSearch.searchInstead, { code: typed })}
          </Link>
        </p>
        <div className="mt-14 flex items-center gap-4 text-ink" aria-hidden>
          <Barcode text={shown} className="h-10 w-48" />
          <Star className="size-6 text-accent" motion="turn" />
        </div>
      </div>
    </section>
  );
}
