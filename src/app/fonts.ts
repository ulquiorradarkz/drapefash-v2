import { Anton, Cairo, Noto_Sans_Bengali, Noto_Sans_Devanagari, Noto_Sans_SC, Work_Sans } from "next/font/google";

/** Display: Anton, compressed heavy capitals for the pinned titles and the big numbers. */
export const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/** Text face for Latin, also used for item IDs and prices (tabular figures). */
export const workSans = Work_Sans({
  variable: "--font-work",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Script faces. Not preloaded: the browser only downloads them when a glyph on the page needs them.
// Their heaviest cuts stand in for Anton, which has no Chinese, Devanagari, Bengali or Arabic letters.
export const notoSC = Noto_Sans_SC({ variable: "--font-sc", weight: ["400", "600", "900"], display: "swap", preload: false });
export const notoDeva = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "600", "800"],
  display: "swap",
  preload: false,
});
export const notoBeng = Noto_Sans_Bengali({
  variable: "--font-beng",
  subsets: ["bengali"],
  weight: ["400", "600", "800"],
  display: "swap",
  preload: false,
});
export const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], weight: ["400", "600", "800", "900"], display: "swap", preload: false });

export const fontVariables = [anton, workSans, notoSC, notoDeva, notoBeng, cairo].map((f) => f.variable).join(" ");
