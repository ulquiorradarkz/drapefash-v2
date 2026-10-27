import { sparklePath, WORDMARK_PATH, WORDMARK_RATIO, WORDMARK_STAR, WORDMARK_VIEWBOX } from "@/components/wordmark";

/** The wordmark for ImageResponse (Open Graph images): same path, plain fill. */
export function OgWordmark({ width, color = "#eef0f3", star = "#4b57ff" }: { width: number; color?: string; star?: string }) {
  return (
    <svg width={width} height={Math.round(width / WORDMARK_RATIO)} viewBox={WORDMARK_VIEWBOX}>
      <path d={WORDMARK_PATH} fill={color} />
      <path d={sparklePath(WORDMARK_STAR.cx, WORDMARK_STAR.cy, WORDMARK_STAR.r)} fill={star} />
    </svg>
  );
}
