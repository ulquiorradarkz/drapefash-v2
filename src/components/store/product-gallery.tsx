"use client";

import { useRef, useState } from "react";
import { SmartImage } from "@/components/smart-image";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";

/** Swipeable photos (mirrors in right-to-left pages) with dots on phones and thumbnails on desktop. */
export function ProductGallery({
  images,
  alt,
  labels,
}: {
  images: string[];
  alt: string;
  labels: { photos: string; showPhoto: string; photoOf: string; noImage: string };
}) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  function go(i: number) {
    setActive(i);
    const slide = scroller.current?.children[i] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    // scrollLeft is negative in right-to-left layouts; the distance is what matters.
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (i !== active) setActive(i);
  }

  if (!images.length) {
    return <div className="grid aspect-[4/5] place-items-center rounded-[var(--radius-frame)] bg-paper-3 text-ink-2">{labels.noImage}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[var(--radius-frame)] bg-paper-3">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto"
          aria-roledescription="carousel"
          aria-label={labels.photos}
        >
          {images.map((src, i) => (
            <div
              key={src + i}
              className="relative h-full w-full shrink-0 snap-start"
              role="group"
              aria-roledescription="slide"
              aria-label={fmt(labels.photoOf, { n: i + 1, total: images.length })}
            >
              <SmartImage
                src={src}
                alt={i === 0 ? alt : `${alt} (${fmt(labels.photoOf, { n: i + 1, total: images.length })})`}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1 lg:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={fmt(labels.showPhoto, { n: i + 1 })}
                aria-current={i === active}
                className="grid size-6 place-items-center"
              >
                <span className={cn("block h-1.5 rounded-full bg-ink/30 transition-[width,background-color] duration-300", i === active ? "w-5 bg-ink" : "w-1.5")} />
              </button>
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar hidden gap-2 overflow-x-auto lg:flex">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={fmt(labels.showPhoto, { n: i + 1 })}
              aria-current={i === active}
              className={cn(
                "focus-ring relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-paper-3 transition-opacity",
                i === active ? "opacity-100 ring-2 ring-ink ring-offset-2 ring-offset-paper" : "opacity-55 hover:opacity-100",
              )}
            >
              <SmartImage src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
