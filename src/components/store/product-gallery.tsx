"use client";

import { useRef, useState } from "react";
import { SmartImage } from "@/components/smart-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const list = images.length ? images : [];

  function go(i: number) {
    setActive(i);
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  if (!list.length) {
    return <div className="glass chrome-border grid aspect-[4/5] place-items-center rounded-3xl text-white/40">No image</div>;
  }

  return (
    <div className="space-y-3">
      <div className="glass chrome-border relative overflow-hidden rounded-3xl">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto"
          aria-roledescription="carousel"
          aria-label={`${title} photos`}
        >
          {list.map((src, i) => (
            <div key={src + i} className="relative h-full w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} of ${list.length}`}>
              <SmartImage
                src={src}
                alt={i === 0 ? title : `${title}, photo ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={cn("h-1.5 rounded-full bg-white/40 transition-all", i === active ? "w-6 bg-white" : "w-1.5")}
              />
            ))}
          </div>
        )}
      </div>
      {list.length > 1 && (
        <div className="no-scrollbar hidden gap-2 overflow-x-auto lg:flex">
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border transition-all",
                i === active ? "border-white/80" : "border-white/10 opacity-60 hover:opacity-100",
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
