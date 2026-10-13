import type { Category, Gender } from "@/lib/types";

/** Keyword hints per common category slug. Matching also uses each category's own name/slug. */
const CATEGORY_HINTS: Record<string, string[]> = {
  dresses: ["dress", "gown", "sundress", "maxi", "midi dress", "mini dress", "jumpsuit", "romper", "playsuit"],
  tops: ["top", "tee", "t-shirt", "tshirt", "shirt", "blouse", "tank", "cami", "crop", "bodysuit", "sweater", "hoodie", "sweatshirt", "cardigan", "polo", "jersey", "corset", "knit"],
  bottoms: ["pants", "trousers", "jeans", "skirt", "shorts", "leggings", "joggers", "cargo", "denim", "sweatpants", "flare"],
  outerwear: ["jacket", "coat", "puffer", "parka", "blazer", "windbreaker", "vest", "gilet", "trench", "bomber", "fleece"],
  footwear: ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "heel", "heels", "sandal", "sandals", "slipper", "slides", "loafer", "platform", "trainers"],
  accessories: ["bag", "handbag", "backpack", "belt", "hat", "cap", "beanie", "sunglasses", "glasses", "necklace", "earring", "earrings", "bracelet", "ring", "jewelry", "watch", "scarf", "wallet", "hair clip", "socks"],
  activewear: ["sports bra", "gym", "yoga", "activewear", "workout", "running"],
  swimwear: ["bikini", "swimsuit", "swimwear", "swim trunks", "one-piece"],
  lingerie: ["lingerie", "bra", "panties", "underwear", "boxer", "briefs"],
};

function words(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
}

export function suggestCategory(text: string, categories: Category[]): Category | null {
  const hay = words(text);
  let best: { cat: Category; score: number } | null = null;
  for (const cat of categories) {
    const hints = new Set<string>([
      ...(CATEGORY_HINTS[cat.slug] ?? []),
      cat.slug.replace(/-/g, " "),
      ...cat.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && w !== "and"),
    ]);
    let score = 0;
    for (const h of hints) {
      const re = new RegExp(`\\s${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\s`);
      if (re.test(hay)) score += h.includes(" ") ? 3 : 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { cat, score };
  }
  return best?.cat ?? null;
}

export function suggestGender(text: string): Gender {
  const hay = words(text);
  const women = /\s(women|womens|woman|ladies|lady|female|girls?|her|maternity|dress|skirt|bikini|bra|blouse)\s/.test(hay);
  const men = /\s(men|mens|man|male|boys?|his|gentleman)\s/.test(hay);
  if (women && !men) return "women";
  if (men && !women) return "men";
  return "unisex";
}
