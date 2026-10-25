"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, LOCALE_META, localePath, stripLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

function remember(locale: Locale) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
}

/** Same page in another language. Each name is written in its own script and tagged with its language. */
export function LanguageSwitcher({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();
  const rest = stripLocale(pathname);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className="focus-ring inline-flex h-11 items-center gap-2 px-2.5 text-[15px] text-ink transition-colors hover:text-ink-2"
      >
        <Globe className="size-[18px]" strokeWidth={1.5} aria-hidden />
        <span className="sr-only">{label}: </span>
        <span lang={LOCALE_META[locale].htmlLang}>{LOCALE_META[locale].name}</span>
      </button>
      <ul
        id={listId}
        hidden={!open}
        aria-label={label}
        className="absolute end-0 top-full z-50 mt-2 min-w-52 bg-paper-2 p-1.5 shadow-[0_18px_48px_rgb(0_0_0/0.55)]" // taste-skill-ignore: a floating menu casts a real shadow
      >
        {LOCALES.map((l) => {
          const meta = LOCALE_META[l];
          const href = localePath(l, rest);
          return (
            <li key={l}>
              <Link
                href={href}
                hrefLang={meta.htmlLang}
                lang={meta.htmlLang}
                dir={meta.dir}
                onClick={(e) => {
                  remember(l);
                  // Keep filters and search terms when switching language.
                  if (window.location.search) {
                    e.preventDefault();
                    router.push(href + window.location.search);
                  }
                }}
                aria-current={l === locale ? "true" : undefined}
                className="focus-ring flex min-h-11 items-center justify-between gap-6 px-3 text-start text-[length:var(--t-small)] text-ink transition-colors hover:bg-ink hover:text-paper aria-[current=true]:font-semibold aria-[current=true]:text-accent"
              >
                {meta.name}
                {l === locale && <Check className="size-4" strokeWidth={2} aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
