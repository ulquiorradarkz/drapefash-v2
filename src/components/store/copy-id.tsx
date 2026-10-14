"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies the item ID, so a visitor can paste it in a message or a story. */
export function CopyId({ code, labels }: { code: string; labels: { copy: string; copied: string } }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: the ID stays visible to copy by hand */
        }
      }}
      className="focus-ring inline-flex h-11 items-center gap-2 px-3 text-[14px] text-ink transition-colors hover:bg-ink hover:text-paper-3"
      aria-live="polite"
    >
      {done ? <Check className="size-4" strokeWidth={1.75} aria-hidden /> : <Copy className="size-4" strokeWidth={1.75} aria-hidden />}
      {done ? labels.copied : labels.copy}
    </button>
  );
}
