import {
  Cairo,
  Geist,
  Geist_Mono,
  Noto_Naskh_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_SC,
  Noto_Serif_Bengali,
  Noto_Serif_Devanagari,
  Noto_Serif_Display,
  Noto_Serif_SC,
} from "next/font/google";

/**
 * Display: a high-contrast Didone serif, set condensed (wdth 62.5) for the poster headings.
 * The width axis is loaded so `font-stretch: 62.5%` selects the narrow cut.
 */
export const didone = Noto_Serif_Display({
  variable: "--font-didone",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

/** Text face for Latin. */
export const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/** Data labels: item IDs, prices, the archive tags. */
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Script faces. Not preloaded: the browser only downloads them when a glyph on the page needs them.
export const notoSC = Noto_Sans_SC({ variable: "--font-sc", weight: ["400", "500", "700"], display: "swap", preload: false });
export const notoSerifSC = Noto_Serif_SC({ variable: "--font-sc-serif", weight: ["600", "900"], display: "swap", preload: false });
export const notoDeva = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});
export const notoSerifDeva = Noto_Serif_Devanagari({
  variable: "--font-deva-serif",
  subsets: ["devanagari"],
  axes: ["wdth"],
  display: "swap",
  preload: false,
});
export const notoBeng = Noto_Sans_Bengali({
  variable: "--font-beng",
  subsets: ["bengali"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});
export const notoSerifBeng = Noto_Serif_Bengali({
  variable: "--font-beng-serif",
  subsets: ["bengali"],
  axes: ["wdth"],
  display: "swap",
  preload: false,
});
export const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], display: "swap", preload: false });
export const naskh = Noto_Naskh_Arabic({ variable: "--font-naskh", subsets: ["arabic"], weight: ["500", "700"], display: "swap", preload: false });

export const fontVariables = [
  didone,
  geist,
  geistMono,
  notoSC,
  notoSerifSC,
  notoDeva,
  notoSerifDeva,
  notoBeng,
  notoSerifBeng,
  cairo,
  naskh,
]
  .map((f) => f.variable)
  .join(" ");
