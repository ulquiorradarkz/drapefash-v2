import { sparklePath, WORDMARK_PATH, WORDMARK_RATIO, WORDMARK_STAR, WORDMARK_VIEWBOX } from "@/components/wordmark";

/** The wordmark for ImageResponse (Open Graph images): same path, plain fill. */
export function OgWordmark({ width, color = "#0a0a0a", star = "#7a2e31" }: { width: number; color?: string; star?: string }) {
  return (
    <svg width={width} height={Math.round(width / WORDMARK_RATIO)} viewBox={WORDMARK_VIEWBOX}>
      <path d={WORDMARK_PATH} fill={color} stroke={color} strokeWidth={1.2} />
      <path d={sparklePath(WORDMARK_STAR.cx, WORDMARK_STAR.cy, WORDMARK_STAR.r)} fill={star} />
    </svg>
  );
}
