import type { CSSProperties, ReactNode } from "react";

type Tag = "div" | "section" | "li" | "p" | "h2" | "span" | "figure" | "article";

/**
 * Scroll entrance (rise + fade), played once when the element enters the viewport.
 * Pure CSS plus <RevealObserver/>: without JavaScript, or with reduced motion, content is simply visible.
 */
export function Reveal({
  as: Comp = "div",
  delay = 0,
  className,
  children,
  id,
}: {
  as?: Tag;
  delay?: number;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Comp id={id} data-reveal="" className={className} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Comp>
  );
}
