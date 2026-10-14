"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll-linked motion, declared in the markup:
 *   data-fx="parallax" data-speed="-12"   moves the element by that many % of its height across the screen
 *   data-fx="slide"                       slides in from the side (alternating, mirrored in RTL) as it enters
 *   data-fx="zoom"                        grows from 86% to full size as it enters
 *   data-fx="lift"                        rises and fades a little as the page scrolls past it (hero text)
 * Nothing runs with reduced motion: the elements simply sit in place.
 */
export function ScrollFx() {
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const rtl = document.documentElement.dir === "rtl" ? -1 : 1;

      gsap.utils.toArray<HTMLElement>('[data-fx="parallax"]').forEach((el) => {
        const speed = Number(el.dataset.speed ?? -10);
        gsap.fromTo(
          el,
          { yPercent: -speed / 2 },
          { yPercent: speed / 2, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-fx="slide"]').forEach((el, i) => {
        gsap.fromTo(
          el,
          { xPercent: (i % 2 ? 9 : -9) * rtl, opacity: 0.25 },
          { xPercent: 0, opacity: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 98%", end: "top 62%", scrub: 0.6 } },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-fx="zoom"]').forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.86, opacity: 0.5 },
          { scale: 1, opacity: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: 0.6 } },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-fx="lift"]').forEach((el) => {
        gsap.to(el, { y: -80, opacity: 0.15, ease: "none", scrollTrigger: { trigger: el, start: "top 70%", end: "bottom top", scrub: true } });
      });

      // Images that load late change the page height: measure again once they are in.
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      const t = window.setTimeout(refresh, 1200);
      return () => {
        window.removeEventListener("load", refresh);
        window.clearTimeout(t);
      };
    });
    return () => mm.revert();
  }, [pathname]);

  return null;
}
