"use client";

import { useEffect, useState } from "react";
import { CONSENT_EVENT, OPEN_CONSENT_EVENT, readConsent, writeConsent } from "@/lib/consent";
import { RichText } from "@/components/store/rich-text";
import type { Locale } from "@/i18n/config";

export function ConsentBanner({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { title: string; text: string; reject: string; accept: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setOpen(true);
    const reopen = () => setOpen(true);
    const close = () => setOpen(false);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    window.addEventListener(CONSENT_EVENT, close);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
      window.removeEventListener(CONSENT_EVENT, close);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="lg lg-dialog fixed inset-x-2 bottom-2 z-50 rounded-[22px] p-4 text-ink sm:inset-x-auto sm:bottom-4 sm:start-4 sm:max-w-md sm:p-5"
    >
      <p id="consent-title" className="font-display text-[28px] leading-none">
        {labels.title}
      </p>
      <p className="mt-1.5 text-[length:var(--t-small)] leading-snug text-ink [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
        <RichText text={labels.text} locale={locale} />
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => writeConsent("denied")} className="btn btn-sm btn-wrap btn-line">
          {labels.reject}
        </button>
        <button type="button" onClick={() => writeConsent("granted")} className="btn btn-sm btn-wrap btn-primary">
          {labels.accept}
        </button>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      {label}
    </button>
  );
}
