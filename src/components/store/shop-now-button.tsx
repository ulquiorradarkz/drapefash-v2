"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shop button -> /go/[slug] (logs the click, then 302 to the affiliate link).
 * Forwards utm_* params from the current URL (or this tab's landing URL, stored only with consent).
 */
export function ShopNowButton({
  slug,
  label,
  newTabText,
  className,
  size = "md",
  variant = "primary",
}: {
  slug: string;
  label: string;
  /** Screen-reader note that the store opens in a new tab. */
  newTabText: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ink" | "line" | "paper";
}) {
  const base = `/go/${slug}`;
  const [href, setHref] = useState(base);

  useEffect(() => {
    const params = new URLSearchParams();
    const current = new URLSearchParams(window.location.search);
    let stored: Record<string, string> = {};
    try {
      stored = JSON.parse(sessionStorage.getItem("drape_utm") ?? "{}");
    } catch {
      /* ignore */
    }
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = current.get(k) ?? stored[k];
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    setHref(qs ? `${base}?${qs}` : base);
  }, [base]);

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener"
      data-testid="shop-now"
      className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", size === "lg" && "btn-lg", className)}
    >
      {label}
      <ArrowUpRight className={cn("btn-icon", size === "sm" ? "size-3.5" : "size-4")} strokeWidth={1.75} aria-hidden />
      <span className="sr-only">({newTabText})</span>
    </a>
  );
}
