import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { Flock, GrainDisc, OrnateFrame, Star } from "@/components/store/collage";
import { IdSearch } from "@/components/store/id-search";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n";

async function currentLocale() {
  const fromHeader = (await headers()).get("x-drape-locale");
  return isLocale(fromHeader) ? fromHeader : DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await currentLocale()).meta.notFoundTitle, robots: { index: false } };
}

/** Not-found pages get no route params; the middleware passes the language in a request header. */
export default async function NotFound() {
  const locale = await currentLocale();
  const t = getDictionary(locale);
  return (
    <div className="collage page-x page-max relative grid min-h-[78svh] items-center gap-12 overflow-hidden py-20 lg:grid-cols-12">
      <div className="relative z-10 lg:col-span-7">
        <p className="t-data text-ink-2" dir="ltr" aria-hidden>
          [ 404 ]
        </p>
        <h1 className="hero-rise mt-4 max-w-[18ch] t-head text-ink" style={{ ["--rise-delay" as string]: "0.05s" }}>
          {t.notFound.title}
        </h1>
        <p className="hero-rise mt-6 max-w-[44ch] t-statement" style={{ ["--rise-delay" as string]: "0.15s" }}>
          {t.notFound.text}
        </p>
        <div className="hero-rise mt-10" style={{ ["--rise-delay" as string]: "0.25s" }}>
          <Link href={localePath(locale, "/shop")} className="btn btn-primary btn-lg">
            {t.notFound.cta}
            <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        <IdSearch locale={locale} t={t} id="nf-id" className="mt-12" />
      </div>
      <div aria-hidden className="relative mx-auto w-full max-w-[420px] lg:col-span-4 lg:col-start-9">
        <GrainDisc id="nf-sun" className="layer absolute -end-[20%] -top-[8%] w-[90%]" style={{ ["--depth" as string]: 6 }} />
        <div className="layer relative" style={{ ["--depth" as string]: 14, ["--rot" as string]: "6deg" }}>
          <OrnateFrame frame="swept" sizes="(max-width: 1024px) 80vw, 30vw">
            <div className="relative size-full bg-ink">
              <Image src="/collage/statue-head.webp" alt="" fill sizes="(max-width: 1024px) 50vw, 20vw" className="object-contain object-bottom" />
            </div>
          </OrnateFrame>
        </div>
        <Star className="absolute -start-6 bottom-[10%] w-14 text-ink" motion="turn" />
        <Flock
          className="-start-[10%] top-[30%] h-24 w-[60%]"
          birds={[
            { x: 0, y: 30, size: 38, rot: -12 },
            { x: 40, y: 0, size: 26, rot: -18, tone: "ink" },
            { x: 70, y: 50, size: 32, rot: -6 },
          ]}
        />
      </div>
    </div>
  );
}
