"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Marks [data-reveal] elements as they scroll into view (see .js [data-reveal] in drape.css). */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    // With reduced motion the CSS turns entrances into a plain fade, so the observer still runs.
    if (!("IntersectionObserver" in window)) {
      pending().forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    const observeAll = () => pending().forEach((el) => io.observe(el));
    observeAll();
    // From here on the observer owns the reveals; the CSS safety net stands down.
    document.documentElement.classList.add("reveal-ready");
    // Client-side updates (filters, new sections) add elements after the first pass.
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
