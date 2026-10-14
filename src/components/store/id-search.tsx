import { ArrowRight } from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The item-ID box: a visitor types the ID they saw (DRP-014, drp 14, or just 14) and lands on that piece.
 * A plain GET form to /<lang>/id, so it works without JavaScript.
 */
export function IdSearch({
  locale,
  t,
  id,
  tone = "paper",
  defaultValue,
  className,
}: {
  locale: Locale;
  t: Dictionary;
  id: string;
  tone?: "paper" | "night";
  defaultValue?: string;
  className?: string;
}) {
  const night = tone === "night";
  return (
    <form action={localePath(locale, "/id")} role="search" aria-labelledby={`${id}-label`} className={cn("w-full max-w-[34rem]", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label id={`${id}-label`} htmlFor={id} className={cn("t-data t-data-up", night ? "text-paper-3/80" : "text-ink-2")}>
          {t.idSearch.label}
        </label>
        <p id={`${id}-hint`} className={cn("text-[14px]", night ? "text-paper-3/80" : "text-ink-2")}>
          {t.idSearch.hint}
        </p>
      </div>
      <div className={cn("mt-2 flex items-stretch", night ? "shadow-[0_0_0_1.5px_var(--paper-3)]" : "shadow-[0_0_0_1.5px_var(--ink)]")}>
        <span aria-hidden className={cn("grid w-9 shrink-0 place-items-center font-mono text-lg", night ? "text-paper-3" : "text-ink")}>
          [
        </span>
        <input
          id={id}
          name="code"
          type="text"
          required
          maxLength={24}
          defaultValue={defaultValue}
          placeholder={t.idSearch.placeholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          aria-describedby={`${id}-hint`}
          dir="ltr"
          className={cn(
            "min-w-0 flex-1 bg-transparent py-3 font-mono text-[22px] uppercase tracking-[0.08em] outline-none sm:text-[26px]",
            night ? "text-paper-3 placeholder:text-paper-3/35" : "text-ink placeholder:text-ink/30",
          )}
        />
        <span aria-hidden className={cn("grid w-6 shrink-0 place-items-center font-mono text-lg", night ? "text-paper-3" : "text-ink")}>
          ]
        </span>
        <button type="submit" className="btn btn-primary shrink-0 !min-h-0 px-5">
          {t.idSearch.button}
          <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </form>
  );
}
