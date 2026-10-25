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
  t: Pick<Dictionary, "idSearch">;
  id: string;
  /** Kept for older call sites: the box takes the colours of the field it sits on. */
  tone?: "paper" | "night";
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form action={localePath(locale, "/id")} role="search" aria-labelledby={`${id}-label`} className={cn("w-full max-w-[34rem]", className)} data-tone={tone}>
      <label id={`${id}-label`} htmlFor={id} className="t-small font-semibold text-ink">
        {t.idSearch.label}
      </label>
      <div className="mt-2 flex items-stretch">
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
          className="field h-14 min-w-0 flex-1 font-display text-[length:var(--t-statement)] uppercase"
        />
        <button type="submit" className="btn btn-primary h-14 shrink-0 px-5">
          {t.idSearch.button}
          <ArrowRight className="btn-icon size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <p id={`${id}-hint`} className="mt-2 text-[14px] text-ink-2">
        {t.idSearch.hint}
      </p>
    </form>
  );
}
