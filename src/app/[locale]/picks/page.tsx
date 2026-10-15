import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FittingRoom } from "@/components/store/fitting/fitting-room";
import { IdSearch } from "@/components/store/id-search";
import { Star } from "@/components/store/collage";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ wear?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  // The saved pieces live in each visitor's browser: nothing here for search engines.
  return { title: t.meta.picksTitle, description: t.meta.picksDesc, alternates: alternatesFor(locale, "/picks"), robots: { index: false, follow: true } };
}

/** The fitting room: saved pieces (this browser only) on a 3D mannequin. */
export default async function PicksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { wear } = await searchParams;
  return (
    <div className="page-x page-max pt-10 sm:pt-14">
      <header className="grid gap-6 border-b-[1.5px] border-ink pb-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="t-data text-ink-2" lang="ja" aria-hidden>
            試着室
          </p>
          <h1 className="hero-wipe mt-2 flex items-start gap-4 t-monument text-ink" style={{ ["--rise-delay" as string]: "0s" }}>
            {t.fitting.title}
            <Star className="mt-[0.12em] w-[0.42em] shrink-0 text-ink" motion="turn" />
          </h1>
        </div>
        <p className="max-w-[44ch] t-statement lg:col-span-5">{t.fitting.intro}</p>
      </header>

      <div className="mt-8">
        <FittingRoom
          locale={locale}
          wear={Array.isArray(wear) ? wear[0] : wear}
          shopHref={localePath(locale, "/shop")}
          labels={{
            picks: {
              title: t.picks.title,
              remove: t.picks.remove,
              count: t.picks.count,
              empty: t.picks.empty,
              note: t.picks.note,
              clear: t.picks.clear,
              total: t.picks.total,
              browse: t.picks.browse,
            },
            fitting: {
              putOn: t.fitting.putOn,
              takeOff: t.fitting.takeOff,
              wearAs: t.fitting.wearAs,
              fit: t.fitting.fit,
              fits: t.fitting.fits,
              slots: t.fitting.slots,
              form: t.fitting.form,
              formWomen: t.fitting.formWomen,
              formMen: t.fitting.formMen,
              undress: t.fitting.undress,
              wearing: t.fitting.wearing,
              lookTotal: t.fitting.lookTotal,
              shopLook: t.fitting.shopLook,
              loading: t.fitting.loading,
              flat: t.fitting.flat,
              turnHint: t.fitting.turnHint,
              dropHint: t.fitting.dropHint,
              canvasLabel: t.fitting.canvasLabel,
              canvasEmpty: t.fitting.canvasEmpty,
              nothingOn: t.fitting.nothingOn,
            },
            shopOn: t.product.shopOn,
            newTab: t.product.newTab,
            otherStore: t.product.store,
          }}
        />
      </div>

      <div className="mt-[clamp(64px,8vw,120px)]">
        <IdSearch locale={locale} t={t} id="picks-id" />
      </div>
    </div>
  );
}
