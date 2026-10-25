import Link from "next/link";
import { redirect } from "next/navigation";
import { IdSearch } from "@/components/store/id-search";
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
    <section aria-labelledby="id-missing" className="page-x page-max pb-10 pt-[clamp(48px,8vw,120px)]">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 id="id-missing" className="t-head text-ink">
            <bdi>{fmt(t.idSearch.notFoundTitle, { code: shown })}</bdi>
          </h1>
          <p className="mt-5 max-w-[46ch] t-statement">{t.idSearch.notFoundText}</p>
          <IdSearch locale={locale} t={t} id="id-again" defaultValue={shown} className="mt-10" />
          <p className="mt-8">
            <Link href={`${localePath(locale, "/shop")}?q=${encodeURIComponent(typed)}`} className="link-u focus-ring text-[length:var(--t-small)] font-semibold text-ink">
              {fmt(t.idSearch.searchInstead, { code: typed })}
            </Link>
          </p>
        </div>
        <p aria-hidden className="hidden self-end text-end font-display text-[length:var(--t-giant)] leading-[0.9] text-paper-2 lg:col-span-5 lg:block" dir="ltr">
          {shown.slice(0, 8)}
        </p>
      </div>
    </section>
  );
}
