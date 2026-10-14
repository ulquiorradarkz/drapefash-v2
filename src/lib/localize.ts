import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Category, Product, Store } from "@/lib/types";
import { STORE_META } from "@/lib/stores";

/** Store name for running text. The three stores keep their brand names; "other" is translated. */
export function storeLabel(store: Store, dict: Dictionary): string {
  return store === "other" ? dict.product.store : STORE_META[store].name;
}

/** Swaps in the product's own text for this language when it has some. English is the base text. */
export function localizeProduct<T extends Product>(product: T, locale: Locale): T {
  if (locale === "en") return product;
  const t = product.translations?.[locale];
  if (!t) return product;
  return {
    ...product,
    title: t.title?.trim() || product.title,
    description: t.description?.trim() || product.description,
  };
}

type CategoryLike = Pick<Category, "slug" | "name"> & { translations?: Category["translations"] };

/** Category name: the built-in translation for known slugs, then the category's own translation, then its name. */
export function categoryName(category: CategoryLike, locale: Locale, dict: Dictionary): string {
  const known = dict.categoryNames[category.slug];
  if (known) return known.name;
  if (locale !== "en") {
    const own = category.translations?.[locale]?.trim();
    if (own) return own;
  }
  return category.name;
}

/** One-word name for the big category list on the home page. */
export function categoryShortName(category: CategoryLike, locale: Locale, dict: Dictionary): string {
  return dict.categoryNames[category.slug]?.short ?? categoryName(category, locale, dict);
}
