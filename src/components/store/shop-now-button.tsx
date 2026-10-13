"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shop Now -> /go/[slug] (logs the click, then 302 to the affiliate link).
 * Forwards utm_* params from the current URL (or this tab's landing URL, stored only with consent).
 */
export function ShopNowButton({
  slug,
  className,
  size = "md",
  label = "Shop Now",
}: {
  slug: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
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
      rel="nofollow sponsored noopener"
      data-testid="shop-now"
      className={cn(
        "btn-chrome",
        size === "sm" && "h-9 px-4 text-xs",
        size === "md" && "h-11 px-6 text-sm",
        size === "lg" && "h-14 px-8 text-base",
        className,
      )}
    >
      {label} <ArrowUpRight className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      <span className="sr-only">(opens the store in a new tab)</span>
    </a>
  );
}
