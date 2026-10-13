"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

/** Sends one tiny beacon per page view, only after analytics consent. */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);
  const firstReferrer = useRef<string | null>(null);

  useEffect(() => {
    if (firstReferrer.current === null) firstReferrer.current = document.referrer || "";
  }, []);

  useEffect(() => {
    const send = () => {
      if (readConsent() !== "granted" || lastSent.current === pathname) return;
      lastSent.current = pathname;
      const referrer = firstReferrer.current;
      firstReferrer.current = ""; // only the landing view carries the external referrer
      const body = JSON.stringify({ path: pathname, referrer });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon("/api/pv", new Blob([body], { type: "application/json" }));
        else void fetch("/api/pv", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
      } catch {
        /* never break the page for analytics */
      }
    };
    send();
    window.addEventListener(CONSENT_EVENT, send);
    return () => window.removeEventListener(CONSENT_EVENT, send);
  }, [pathname]);

  // Remember campaign params for this tab (only with consent) so Shop Now can forward them.
  useEffect(() => {
    if (readConsent() !== "granted") return;
    const sp = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = sp.get(k);
      if (v) utm[k] = v.slice(0, 100);
    }
    if (Object.keys(utm).length) {
      try {
        sessionStorage.setItem("drape_utm", JSON.stringify(utm));
      } catch {
        /* ignore */
      }
    }
  }, [pathname]);

  return null;
}
