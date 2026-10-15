import type { Metadata } from "next";
import Image from "next/image";
import { Flock, GrainDisc, OrnateFrame, Star } from "@/components/store/collage";
import { NotFoundText, type NotFoundStrings } from "@/components/store/not-found-text";
import { LOCALES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";

// The localized title comes from the page that called notFound() (see [...rest]/page.tsx).
export const metadata: Metadata = { robots: { index: false } };

/** Static on purpose: the 404 sits inside every page's tree, so it must not read the request. */
export default function NotFound() {
  const strings = Object.fromEntries(
    LOCALES.map((l) => {
      const { notFound, idSearch } = getDictionary(l);
      return [l, { notFound, idSearch }];
    }),
  ) as Record<Locale, NotFoundStrings>;
  return (
    <div className="collage page-x page-max relative grid min-h-[78svh] items-center gap-12 overflow-hidden py-20 lg:grid-cols-12">
      <NotFoundText strings={strings} />
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
