import { cn } from "@/lib/utils";

/**
 * The DRAPE wordmark: the name set in Big Shoulders Black (tall condensed gothic) with the brand's 4-point star.
 * Always an SVG, never live text, and always left-to-right (it is a logo, also on Arabic pages).
 * It fills with currentColor, so it takes the ink of whatever it sits on.
 */
export const WORDMARK_PATH =
  "M52.30 160L9.90 160L9.90 0L52.30 0Q74.80 0 84.85 9.55Q94.90 19.10 95.30 41L95.30 41Q95.60 54.90 95.70 67.40Q95.80 79.90 95.70 92.40Q95.60 104.90 95.30 118.80L95.30 118.80Q94.90 140.80 84.85 150.40Q74.80 160 52.30 160L52.30 160ZM39.90 26.40L39.90 133.60L52.30 133.60Q58.60 133.60 61.90 130.70Q65.20 127.80 65.40 122.40L65.40 122.40Q65.60 111.70 65.75 101.10Q65.90 90.50 65.90 79.90Q65.90 69.30 65.75 58.65Q65.60 48 65.30 37.40L65.30 37.40Q65.20 32.10 61.90 29.25Q58.60 26.40 52.30 26.40L52.30 26.40L39.90 26.40ZM141.60 160L111.60 160L111.60 0L152 0Q174.40 0 184.35 9.05Q194.30 18.10 195 39L195 39Q195.20 44.60 195.25 48.80Q195.30 53 195.25 57.20Q195.20 61.40 195 67L195 67Q194.60 80 190.65 88.30Q186.70 96.60 178.40 101L178.40 101L197.20 160L165.40 160L150.20 106L141.60 106L141.60 160ZM141.60 26.40L141.60 79.60L152 79.60Q158.30 79.60 161.50 76.70Q164.70 73.80 165 68.60L165 68.60Q165.30 63.70 165.40 58.35Q165.50 53 165.40 47.65Q165.30 42.30 165 37.40L165 37.40Q164.70 32.10 161.50 29.25Q158.30 26.40 152 26.40L152 26.40L141.60 26.40ZM235 160L204.20 160L226.40 0L277.30 0L299.50 160L268.70 160L265.30 126.60L238.40 126.60L235 160ZM244.80 64.80L241.20 100.20L262.50 100.20L258.90 64.80L256.50 26.40L247.20 26.40L244.80 64.80ZM340.90 160L310.90 160L310.90 0L353.20 0Q375.60 0 385.55 9.05Q395.50 18.10 396.20 39L396.20 39Q396.50 47.40 396.50 54.60Q396.50 61.80 396.20 70.20L396.20 70.20Q395.50 91 385.55 100.10Q375.60 109.20 353.20 109.20L353.20 109.20L340.90 109.20L340.90 160ZM340.90 26.40L340.90 82.80L353.20 82.80Q359.50 82.80 362.70 79.90Q365.90 77 366.20 71.80L366.20 71.80Q366.50 66.90 366.60 60.75Q366.70 54.60 366.60 48.45Q366.50 42.30 366.20 37.40L366.20 37.40Q365.90 32.10 362.70 29.25Q359.50 26.40 353.20 26.40L353.20 26.40L340.90 26.40ZM482.70 160L409.80 160L409.80 0L482.70 0L482.70 26.40L439.80 26.40L439.80 65.40L480.70 65.40L480.70 91.80L439.80 91.80L439.80 133.60L482.70 133.60L482.70 160Z";

/** Just the D, for the favicon and small marks. */
export const MONOGRAM_PATH =
  "M52.30 160L9.90 160L9.90 0L52.30 0Q74.80 0 84.85 9.55Q94.90 19.10 95.30 41L95.30 41Q95.60 54.90 95.70 67.40Q95.80 79.90 95.70 92.40Q95.60 104.90 95.30 118.80L95.30 118.80Q94.90 140.80 84.85 150.40Q74.80 160 52.30 160L52.30 160ZM39.90 26.40L39.90 133.60L52.30 133.60Q58.60 133.60 61.90 130.70Q65.20 127.80 65.40 122.40L65.40 122.40Q65.60 111.70 65.75 101.10Q65.90 90.50 65.90 79.90Q65.90 69.30 65.75 58.65Q65.60 48 65.30 37.40L65.30 37.40Q65.20 32.10 61.90 29.25Q58.60 26.40 52.30 26.40L52.30 26.40L39.90 26.40Z";

/** Letters 10–483 × 0–160, star off the top of the E. */
export const WORDMARK_VIEWBOX = "8 -2 522 164";
export const WORDMARK_RATIO = 522 / 164;

/** A 4-point star with curved sides (the brand's sparkle), centred on cx, cy. */
export function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.12;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

export const WORDMARK_STAR = { cx: 508, cy: 18, r: 18 };

/** The star is the brand's one touch of colour: cobalt. */
export const STAR_COLOUR = "#4b57ff";

export function Wordmark({
  className,
  variant,
  title,
  star = true,
}: {
  className?: string;
  /** Kept for older call sites: "paper" forces off-white, "ink" forces charcoal; leave empty to follow the text colour. */
  variant?: "ink" | "paper";
  /** Accessible name. Leave empty when the surrounding link or heading already names it. */
  title?: string;
  star?: boolean;
  /** Kept for older call sites; the mark no longer needs unique ids. */
  id?: string;
}) {
  const fill = variant === "paper" ? "#eef0f3" : variant === "ink" ? "#07080c" : "currentColor";
  const label = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg viewBox={WORDMARK_VIEWBOX} className={cn("wordmark block h-auto", className)} style={{ direction: "ltr" }} focusable="false" {...label}>
      <path d={WORDMARK_PATH} fill={fill} />
      {star && <path className="wm-star" d={sparklePath(WORDMARK_STAR.cx, WORDMARK_STAR.cy, WORDMARK_STAR.r)} fill={STAR_COLOUR} />}
    </svg>
  );
}
