"use client";

export const CONSENT_COOKIE = "drape_consent";
export const CONSENT_EVENT = "drape:consent";
export const OPEN_CONSENT_EVENT = "drape:open-consent";

export type Consent = "granted" | "denied" | null;

export function readConsent(): Consent {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)drape_consent=(granted|denied)/);
  return (m?.[1] as Consent) ?? null;
}

export function writeConsent(value: "granted" | "denied") {
  const maxAge = 60 * 60 * 24 * 180; // 6 months
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  if (value === "denied") {
    try {
      sessionStorage.removeItem("drape_utm");
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
