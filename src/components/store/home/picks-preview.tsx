"use client";

import { SmartImage } from "@/components/smart-image";
import type { Locale } from "@/i18n/config";
import { pluralize } from "@/i18n/format";
import type { Plural } from "@/i18n/types";
import { usePicks } from "@/lib/picks";

/** How many pieces this visitor has saved, and the first three as small tagged pictures. */
export function PicksPreview({ locale, saved }: { locale: Locale; saved: Plural }) {
  const picks = usePicks();
  if (!picks.length) return null;
  return (
    <div className="mt-10">
      <p className="t-data t-data-up text-paper-3/70" aria-live="polite">
        {pluralize(locale, saved, picks.length)}
      </p>
      <ul className="mt-3 flex gap-3">
        {picks.slice(0, 3).map((p) => (
          <li key={p.slug} className="relative w-20 shrink-0 sm:w-24">
            <span className="relative block aspect-[4/5] overflow-hidden bg-paper-3">
              {p.image && <SmartImage src={p.image} alt={p.title} fill sizes="96px" className="object-cover" />}
            </span>
            {p.code && (
              <span className="tag tag-paper absolute -top-2 start-1 text-[10px]" dir="ltr">
                {p.code}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
