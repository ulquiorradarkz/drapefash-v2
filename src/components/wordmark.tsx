import { cn } from "@/lib/utils";

/**
 * The DRAPE wordmark: the name set in Anton (compressed heavy capitals) with the brand's 4-point star.
 * Always an SVG, never live text, and always left-to-right (it is a logo, also on Arabic pages).
 * It fills with currentColor, so it takes the ink of whatever it sits on.
 */
export const WORDMARK_PATH =
  "M46.09 171.88L0 171.88L0 0L47.27 0Q65.82 0 75.20 10.30Q84.57 20.61 84.57 40.43L84.57 40.43L84.57 120.90Q84.57 145.31 76.03 158.59Q67.48 171.88 46.09 171.88L46.09 171.88ZM34.57 30.08L34.57 141.50L40.53 141.50Q50 141.50 50 132.32L50 132.32L50 43.65Q50 35.06 47.71 32.57Q45.41 30.08 38.38 30.08L38.38 30.08L34.57 30.08ZM137.40 171.88L102.63 171.88L102.63 0L155.37 0Q168.55 0 175.29 6.01Q182.03 12.01 184.32 22.80Q186.62 33.59 186.62 48.14L186.62 48.14Q186.62 62.21 183.05 70.61Q179.49 79 169.63 82.23L169.63 82.23Q177.73 83.89 181 90.28Q184.27 96.68 184.27 106.84L184.27 106.84L184.27 171.88L150.39 171.88L150.39 104.59Q150.39 97.07 147.31 95.26Q144.23 93.46 137.40 93.46L137.40 93.46L137.40 171.88ZM137.59 31.84L137.59 63.67L145.89 63.67Q153.02 63.67 153.02 48.14L153.02 48.14Q153.02 38.09 151.46 34.96Q149.90 31.84 145.60 31.84L145.60 31.84L137.59 31.84ZM230.66 171.88L197.26 171.88L213.86 0L272.16 0L288.47 171.88L255.95 171.88L253.51 144.14L232.80 144.14L230.66 171.88ZM241.79 29.30L235.25 116.70L250.87 116.70L243.35 29.30L241.79 29.30ZM336.80 171.88L303.02 171.88L303.02 0L348.43 0Q362.68 0 371.03 6.35Q379.38 12.70 383 24.41Q386.61 36.13 386.61 52.34L386.61 52.34Q386.61 67.97 383.58 79.54Q380.55 91.11 372.79 97.46Q365.03 103.81 350.77 103.81L350.77 103.81L336.80 103.81L336.80 171.88ZM336.80 31.35L336.80 72.95L338.76 72.95Q348.33 72.95 350.48 67.58Q352.63 62.21 352.63 51.76L352.63 51.76Q352.63 41.99 350.53 36.67Q348.43 31.35 340.61 31.35L340.61 31.35L336.80 31.35ZM472.45 171.88L401.45 171.88L401.45 0L470.20 0L470.20 33.20L436.41 33.20L436.41 66.70L468.83 66.70L468.83 99.02L436.41 99.02L436.41 138.38L472.45 138.38L472.45 171.88Z";

/** Just the D, for the favicon and small marks. */
export const MONOGRAM_PATH =
  "M46.09 171.88L0 171.88L0 0L47.27 0Q65.82 0 75.20 10.30Q84.57 20.61 84.57 40.43L84.57 40.43L84.57 120.90Q84.57 145.31 76.03 158.59Q67.48 171.88 46.09 171.88L46.09 171.88ZM34.57 30.08L34.57 141.50L40.53 141.50Q50 141.50 50 132.32L50 132.32L50 43.65Q50 35.06 47.71 32.57Q45.41 30.08 38.38 30.08L38.38 30.08L34.57 30.08Z";

/** Letters 0–473 × 0–172, star off the top of the E. */
export const WORDMARK_VIEWBOX = "-2 -2 530 176";
export const WORDMARK_RATIO = 530 / 176;

/** A 4-point star with curved sides (the brand's sparkle), centred on cx, cy. */
export function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.12;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

export const WORDMARK_STAR = { cx: 504, cy: 22, r: 22 };

/** The star is the brand's one touch of colour: sage. */
export const STAR_COLOUR = "#8fa68e";

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
  const fill = variant === "paper" ? "#f1f1ef" : variant === "ink" ? "#1c1c1c" : "currentColor";
  const label = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg viewBox={WORDMARK_VIEWBOX} className={cn("wordmark block h-auto", className)} style={{ direction: "ltr" }} focusable="false" {...label}>
      <path d={WORDMARK_PATH} fill={fill} />
      {star && <path className="wm-star" d={sparklePath(WORDMARK_STAR.cx, WORDMARK_STAR.cy, WORDMARK_STAR.r)} fill={STAR_COLOUR} />}
    </svg>
  );
}
