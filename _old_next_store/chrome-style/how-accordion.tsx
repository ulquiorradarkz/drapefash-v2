"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Stage colours run dark to light in one hue, so the order reads from the colour alone. */
const TINTS = [
  { bg: "#101a26", ink: "#eef1f7" },
  { bg: "#18304a", ink: "#eef1f7" },
  { bg: "#2a5378", ink: "#eef1f7" },
  { bg: "#a9cfe9", ink: "#05060a" },
];

/** How buying works: a row of tinted panels; one is open, the rest are slivers with their names. */
export function HowAccordion({ heading, intro, stages }: { heading: string; intro: string; stages: { name: string; text: string }[] }) {
  const [open, setOpen] = useState(0);
  const id = useId();
  return (
    <section aria-labelledby={`${id}-h`} className="page-x mt-[var(--section)]">
      <div className="grid gap-6 md:grid-cols-12">
        <h2 id={`${id}-h`} className="t-head chrome-text md:col-span-5" data-reveal="">
          {heading}
        </h2>
        <p className="max-w-[46ch] text-[length:var(--t-body)] leading-relaxed md:col-span-5 md:col-start-7" data-reveal="" style={{ ["--reveal-delay" as string]: "80ms" }}>
          {intro}
        </p>
      </div>
      <div className="chrome-edge glow-ice relative mt-16 flex flex-col overflow-hidden rounded-[2rem] md:h-[520px] md:flex-row" data-reveal="" style={{ ["--reveal-delay" as string]: "140ms" }}>
        {stages.map((stage, i) => {
          const isOpen = i === open;
          const tint = TINTS[i % TINTS.length];
          return (
            <div
              key={stage.name}
              className={cn("stage relative overflow-hidden", isOpen ? "md:basis-[58%]" : "md:basis-[14%]")}
              style={{ background: tint.bg, color: tint.ink }}
            >
              <h3 className="h-full">
                <button
                  type="button"
                  id={`${id}-b${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`${id}-p${i}`}
                  onClick={() => setOpen(i)}
                  className={cn(
                    "focus-ring flex w-full items-center text-start md:h-full md:items-end md:p-6",
                    isOpen ? "min-h-16 px-5 pt-5 md:pointer-events-none md:items-start" : "min-h-16 px-5",
                  )}
                >
                  <span
                    className={cn(
                      "font-display font-bold tracking-[-0.02em]",
                      isOpen ? "text-[length:var(--t-statement)] md:text-[length:var(--t-head)] md:leading-[1.05]" : "text-[length:var(--t-body)] md:leading-snug",
                    )}
                  >
                    {stage.name}
                  </span>
                </button>
              </h3>
              <div
                id={`${id}-p${i}`}
                role="region"
                aria-labelledby={`${id}-b${i}`}
                hidden={!isOpen}
                className="px-5 pb-6 md:absolute md:bottom-0 md:start-0 md:px-6 md:pb-6"
              >
                <p className="max-w-[36ch] text-[length:var(--t-body)] leading-relaxed md:text-[length:var(--t-body)]">{stage.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
