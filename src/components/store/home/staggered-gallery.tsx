import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { cn } from "@/lib/utils";
import type { HomePiece } from "./types";

/**
 * The newest pieces, one or two to a screen, in staggered pairs on the empty ground. Each pair
 * repeats one of two arrangements (a tall frame and a lower, wider one; a landscape and a small
 * portrait below it), mirrored on the second pass. Every frame is a piece with its ID, name and price
 * under the start corner. Frames wipe up from their foot as they arrive.
 */
const SLOTS = [
  // Pass one.
  { col: "lg:col-span-4 lg:col-start-1", ratio: "aspect-[3/4]", drop: "", phone: "w-[70%]" },
  { col: "lg:col-span-6 lg:col-start-7", ratio: "aspect-[5/4]", drop: "lg:mt-[30vh]", phone: "ms-auto w-[84%]" },
  { col: "lg:col-span-6 lg:col-start-6", ratio: "aspect-[3/2]", drop: "", phone: "w-[56%]" },
  { col: "lg:col-span-3 lg:col-start-2 lg:row-start-1", ratio: "aspect-[4/5]", drop: "lg:mt-[24vh]", phone: "w-full" },
  // Pass two, mirrored.
  { col: "lg:col-span-4 lg:col-start-9", ratio: "aspect-[3/4]", drop: "", phone: "w-[70%]" },
  { col: "lg:col-span-6 lg:col-start-1 lg:row-start-1", ratio: "aspect-[5/4]", drop: "lg:mt-[30vh]", phone: "ms-auto w-[84%]" },
  { col: "lg:col-span-6 lg:col-start-2", ratio: "aspect-[3/2]", drop: "", phone: "w-[56%]" },
  { col: "lg:col-span-3 lg:col-start-9 lg:row-start-1", ratio: "aspect-[4/5]", drop: "lg:mt-[24vh]", phone: "w-full" },
];

export function StaggeredGallery({ pieces, heading, seeAll, shopHref, openLabel }: { pieces: HomePiece[]; heading: string; seeAll: string; shopHref: string; openLabel: string }) {
  const shown = pieces.filter((p) => p.image).slice(0, SLOTS.length);
  if (!shown.length) return null;
  const pairs: HomePiece[][] = [];
  for (let i = 0; i < shown.length; i += 2) pairs.push(shown.slice(i, i + 2));

  return (
    <section aria-labelledby="gallery-title" className="page-x page-max mt-[var(--section)]">
      <h2 id="gallery-title" className="sr-only">
        {heading}
      </h2>
      <div className="flex flex-col gap-16 lg:gap-[24vh]">
        {pairs.map((pair, pi) => (
          <div key={pi} className="flex flex-col gap-16 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-[var(--gutter)] lg:gap-y-0">
            {pair.map((p, k) => {
              const slot = SLOTS[pi * 2 + k];
              return (
                <figure key={p.id} className={cn("group", slot.col, slot.drop, slot.phone, "lg:w-auto lg:ms-0")}>
                  <Link href={p.href} className="frame-zoom focus-ring block">
                    <span className="sr-only">
                      {openLabel}: {p.title}
                    </span>
                    <span data-reveal="wipe" className={cn("relative block overflow-hidden rounded-[var(--radius-frame)] bg-paper-2", slot.ratio)}>
                      <span className="absolute inset-0 block">
                        <SmartImage src={p.image!} alt="" fill sizes="(max-width: 1024px) 84vw, 50vw" className="object-cover object-[50%_25%]" />
                      </span>
                    </span>
                  </Link>
                  <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 text-[length:var(--t-small)] leading-snug text-ink-2">
                    {p.code && (
                      <span dir="ltr" className="font-semibold text-ink">
                        {p.code}
                      </span>
                    )}
                    <bdi className="line-clamp-1 max-w-[36ch] transition-colors group-hover:text-ink">{p.title}</bdi>
                    {p.price && (
                      <span dir="ltr" className="tabular">
                        {p.price}
                      </span>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-20 lg:mt-[16vh]">
        <Link href={shopHref} className="btn btn-line btn-lg">
          {seeAll}
          <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      </p>
    </section>
  );
}
