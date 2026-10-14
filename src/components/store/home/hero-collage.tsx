import Link from "next/link";
import { SmartImage } from "@/components/smart-image";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { Barcode, Flock, GrainDisc, OrnateFrame, Orbit, SideRail, Star } from "@/components/store/collage";
import { IdSearch } from "@/components/store/id-search";
import { LOCALES, LOCALE_META, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

/**
 * The first screen as an editorial poster: the Didone wordmark, two pieces from the catalogue hung in
 * ornate silver frames among black suns and birds, and the item-ID box — the one thing a visitor coming
 * from Instagram needs. The collage follows the pointer in depth (.collage / .layer).
 */
export type HeroLook = { href: string; image: string; title: string; code: string | null };

export function HeroCollage({ locale, t, latestCode, looks }: { locale: Locale; t: Dictionary; latestCode: string | null; looks: HeroLook[] }) {
  const [big, small] = looks;
  const shop = localePath(locale, "/shop");
  const year = new Date().getFullYear();
  return (
    <section aria-labelledby="hero-title" className="collage relative overflow-hidden">
      <SideRail className="absolute start-2 top-1/2 z-10 hidden -translate-y-1/2 2xl:flex">
        <span dir="ltr">ドレープ · AliExpress · SHEIN · Bulchic · {year}</span>
      </SideRail>
      <SideRail className="absolute end-2 top-1/2 z-10 hidden -translate-y-1/2 2xl:flex">
        {LOCALES.map((l) => LOCALE_META[l].name).join(" · ")}
      </SideRail>

      <div className="page-x page-max relative grid grid-cols-1 gap-y-6 pb-14 pt-6 lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:pb-16 lg:pt-8">
        {/* A: the name */}
        <div className="relative z-10 lg:col-span-7 lg:row-start-1">
          <div className="flex items-center justify-between gap-4 text-ink" aria-hidden>
            <span className="t-data" dir="ltr">
              [ DRP — {latestCode ?? `SS${String(year).slice(2)}`} ]
            </span>
            <Barcode text={`DRAPE-${year}`} className="h-5 w-28" />
          </div>
          <div className="relative mt-5">
            <Wordmark className="hero-wipe w-full" />
            <span aria-hidden className="tag absolute bottom-[-4%] end-[3%] text-[clamp(11px,1.15vw,17px)]" lang="ja">
              ドレープ — 青の時代
            </span>
          </div>
        </div>

        {/* B: the collage */}
        <div className="relative min-h-[112vw] sm:min-h-[78vw] lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:min-h-0">
          <GrainDisc id="hero-sun" className="layer absolute start-[10%] top-[-7%] w-[64%]" style={{ ["--depth" as string]: 5 }} />
          <GrainDisc id="hero-moon" className="layer absolute bottom-[9%] start-[6%] w-[19%]" style={{ ["--depth" as string]: 20 }} />
          <Orbit className="absolute -inset-[4%] text-ink" rx={47} ry={34} rotate={-18} />
          {small && (
            <div className="layer absolute start-[-3%] top-[38%] w-[47%]" style={{ ["--depth" as string]: 11, ["--rot" as string]: "8deg" }}>
              <FramedLook look={small} frame="astragal" sizes="(max-width: 1024px) 30vw, 12vw" />
            </div>
          )}
          {big && (
            <div className="layer absolute end-[4%] top-[5%] w-[66%]" style={{ ["--depth" as string]: 17, ["--rot" as string]: "-5deg" }}>
              <FramedLook look={big} frame="swept" sizes="(max-width: 1024px) 44vw, 19vw" priority />
            </div>
          )}
          {big?.code && (
            <Link href={big.href} tabIndex={-1} aria-hidden className="tag layer absolute end-[1%] top-[64%] hover:bg-night-2" style={{ ["--depth" as string]: 24 }} dir="ltr">
              {big.code}
            </Link>
          )}
          {small?.code && (
            <Link href={small.href} tabIndex={-1} aria-hidden className="tag tag-paper layer absolute start-[4%] top-[34%] shadow-[0_0_0_1.5px_var(--ink)]" style={{ ["--depth" as string]: 14 }} dir="ltr">
              {small.code}
            </Link>
          )}
          <Star className="layer absolute bottom-[1%] end-[24%] w-[13%] text-ink" motion="turn" style={{ ["--depth" as string]: 26 }} />
          <Star className="absolute end-[2%] bottom-[14%] w-[7%] text-ink" motion="blink" />
          <Star className="absolute start-[2%] top-[12%] w-[6%] text-ink" motion="blink" style={{ ["--blink-delay" as string]: "1.2s" }} outline />
          <Flock
            className="-end-[4%] top-[-2%] h-[30%] w-[62%]"
            birds={[
              { x: 4, y: 58, size: 46, rot: -10, tone: "grey" },
              { x: 24, y: 30, size: 34, rot: -16, tone: "ink" },
              { x: 46, y: 46, size: 40, rot: -4, tone: "grey" },
              { x: 60, y: 10, size: 26, rot: -22, tone: "ink" },
              { x: 74, y: 36, size: 32, rot: -8, tone: "grey" },
              { x: 88, y: 4, size: 20, rot: -18, tone: "ink" },
            ]}
          />
        </div>

        {/* C: what it is, the ID box, the two ways in */}
        <div className="relative z-10 flex flex-col lg:col-span-7 lg:row-start-2 lg:justify-end">
          <h1 id="hero-title" className="hero-rise t-head max-w-[24ch] text-ink" style={{ ["--rise-delay" as string]: "0.15s" }}>
            {t.hero.title}
          </h1>
          <p className="hero-rise mt-5 max-w-[50ch] text-[length:var(--t-body)] leading-relaxed" style={{ ["--rise-delay" as string]: "0.3s" }}>
            {t.hero.line}
          </p>
          <div className="hero-rise mt-8" style={{ ["--rise-delay" as string]: "0.42s" }}>
            <IdSearch locale={locale} t={t} id="hero-id" />
          </div>
          <div className="hero-rise mt-8 flex flex-wrap gap-3" style={{ ["--rise-delay" as string]: "0.54s" }}>
            <Link href={shop} className="btn btn-primary btn-lg">
              {t.hero.cta}
              <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
            </Link>
            <Link href={localePath(locale, "/picks")} className="btn btn-line btn-lg">
              {t.hero.fitting}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A catalogue piece hung in an ornate frame; the whole frame opens the piece. */
function FramedLook({ look, frame, sizes, priority }: { look: HeroLook; frame: "swept" | "astragal"; sizes: string; priority?: boolean }) {
  return (
    <Link href={look.href} aria-label={look.code ? `${look.title} (${look.code})` : look.title} className="focus-ring group block">
      <OrnateFrame frame={frame} priority={priority} sizes={frame === "swept" ? "(max-width: 1024px) 66vw, 28vw" : "(max-width: 1024px) 46vw, 20vw"}>
        <div className="relative size-full bg-paper-3">
          <SmartImage
            src={look.image}
            alt=""
            fill
            priority={priority}
            sizes={sizes}
            className="object-contain p-[6%] transition-transform duration-700 ease-drape group-hover:scale-105"
          />
        </div>
      </OrnateFrame>
    </Link>
  );
}
