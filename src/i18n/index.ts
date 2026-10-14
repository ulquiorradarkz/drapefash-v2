import type { Locale } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import zh from "./dictionaries/zh";
import hi from "./dictionaries/hi";
import es from "./dictionaries/es";
import fr from "./dictionaries/fr";
import ar from "./dictionaries/ar";
import bn from "./dictionaries/bn";

export type { Dictionary };
export { fmt, formatDate, formatNumber, pluralize } from "./format";

const DICTIONARIES: Record<Locale, Dictionary> = { en, zh, hi, es, fr, ar, bn };

/** Server side only in practice: client components receive the strings they need as props. */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
