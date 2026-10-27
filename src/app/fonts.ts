import localFont from "next/font/local";
import { Cairo, Noto_Sans_Bengali, Noto_Sans_Devanagari, Noto_Sans_SC } from "next/font/google";

// The two Latin faces are self-hosted (variable Latin cuts from Fontsource, OFL; see fonts/LICENSE.txt),
// so a build never waits on Google Fonts.

/** Display: Big Shoulders, a tall condensed gothic from city signage, for the monument name and the poster lines. */
export const bigShoulders = localFont({
  src: "./fonts/BigShoulders-latin-wght.woff2",
  variable: "--font-shoulders",
  weight: "100 900",
  display: "swap",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

/** Text face for Latin, also used for item IDs and prices (tabular figures). */
export const publicSans = localFont({
  src: "./fonts/PublicSans-latin-wght.woff2",
  variable: "--font-public",
  weight: "100 900",
  display: "swap",
});

// Script faces. Not preloaded: the browser only downloads them when a glyph on the page needs them.
// Their heaviest cuts stand in for Big Shoulders, which has no Chinese, Devanagari, Bengali or Arabic letters.
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

export const fontVariables = [bigShoulders, publicSans, notoSC, notoDeva, notoBeng, cairo].map((f) => f.variable).join(" ");
