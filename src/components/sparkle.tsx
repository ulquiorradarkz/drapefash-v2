import { sparklePath } from "@/components/wordmark";
import { cn } from "@/lib/utils";

/** The wordmark's 4-point star on its own. Decorative; takes the current text colour. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={cn("block", className)} aria-hidden focusable="false">
      <path d={sparklePath(0, 0, 12)} fill="currentColor" />
    </svg>
  );
}
