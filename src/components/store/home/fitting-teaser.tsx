import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Flock, Orbit, Star } from "@/components/store/collage";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { PicksPreview } from "./picks-preview";

/**
 * The night band: a draped marble figure (the brand's name made literal) among flying birds,
 * inviting the visitor to save pieces and dress the 3D mannequin with them.
 */
export function FittingTeaser({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <section aria-labelledby="fitting-title" className="night collage relative mt-[var(--section)] overflow-hidden">
      <div className="harlequin" aria-hidden />
      <div className="page-x page-max relative grid gap-12 py-[clamp(72px,10vw,160px)] lg:grid-cols-12 lg:items-center">
        <div className="relative z-10 lg:col-span-5">
          <p className="t-data text-paper-3/60" lang="ja" aria-hidden>
            試着室 — 3D
          </p>
          <h2 id="fitting-title" data-reveal="" className="mt-4 t-monument text-paper-3">
            {t.fittingTeaser.heading}
          </h2>
          <p data-reveal="" className="mt-6 max-w-[44ch] t-statement text-paper-3/90" style={{ ["--reveal-delay" as string]: "80ms" }}>
            {t.fittingTeaser.text}
          </p>
          <PicksPreview locale={locale} saved={t.fittingTeaser.saved} />
          <div data-reveal="" className="mt-10" style={{ ["--reveal-delay" as string]: "160ms" }}>
            <Link href={localePath(locale, "/picks")} className="btn btn-primary btn-lg">
              {t.fittingTeaser.cta}
              <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </div>

        <div aria-hidden className="relative min-h-[120vw] sm:min-h-[80vw] lg:col-span-6 lg:col-start-7 lg:min-h-[640px]">
          <Orbit className="absolute -inset-[6%] text-paper-3/60" rx={46} ry={30} rotate={-24} />
          <Orbit className="absolute inset-[6%] text-grey" rx={30} ry={46} rotate={16} />
          <div className="layer absolute inset-y-0 start-[22%] w-[52%]" style={{ ["--depth" as string]: 10 }}>
            <Image src="/collage/statue-draped.webp" alt="" fill sizes="(max-width: 1024px) 52vw, 26vw" className="object-contain object-bottom" />
          </div>
          <div className="layer absolute bottom-[4%] end-[2%] w-[30%]" style={{ ["--depth" as string]: 22 }}>
            <Image src="/collage/statue-head.webp" alt="" width={548} height={1187} sizes="(max-width: 1024px) 30vw, 14vw" className="h-auto w-full" />
          </div>
          <Star className="layer absolute end-[6%] top-[4%] w-[22%] text-paper-3" motion="turn" style={{ ["--depth" as string]: 30 }} />
          <Star className="absolute start-[4%] bottom-[18%] w-[9%] text-accent" motion="blink" />
          <Flock
            className="inset-x-0 top-[8%] h-[46%]"
            flight={11}
            birds={[
              { x: 2, y: 20, size: 54, rot: -6, tone: "paper" },
              { x: 16, y: 62, size: 40, rot: 8, tone: "grey" },
              { x: 30, y: 4, size: 30, rot: -18, tone: "paper" },
              { x: 64, y: 40, size: 48, rot: -10, tone: "grey" },
              { x: 78, y: 70, size: 34, rot: 6, tone: "paper" },
              { x: 86, y: 14, size: 26, rot: -24, tone: "paper" },
              { x: 50, y: 82, size: 24, rot: -4, tone: "paper" },
            ]}
          />
        </div>
      </div>
      <div className="harlequin" aria-hidden />
    </section>
  );
}
