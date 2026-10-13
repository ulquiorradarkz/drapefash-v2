"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_EVENT, OPEN_CONSENT_EVENT, readConsent, writeConsent } from "@/lib/consent";

export function ConsentBanner() {
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
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-white/15 bg-[#111118]/95 p-4 shadow-2xl backdrop-blur-md sm:bottom-5 sm:p-5"
    >
      <p id="consent-title" className="font-semibold">
        Cookies &amp; privacy
      </p>
      <p className="mt-1 text-sm leading-relaxed text-white/70">
        We use one essential cookie to remember this choice. With your OK we also count anonymous page views (no IP addresses, no tracking
        across sites) to see which pieces you like. Read our{" "}
        <Link href="/cookies" className="underline underline-offset-2">
          Cookie Policy
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => writeConsent("denied")} className="btn-ghost-chrome h-10 px-5 text-sm">
          Reject
        </button>
        <button type="button" onClick={() => writeConsent("granted")} className="btn-chrome h-10 px-5 text-sm">
          Accept analytics
        </button>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Cookie settings
    </button>
  );
}
