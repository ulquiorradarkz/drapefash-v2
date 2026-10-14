import type { Locale } from "@/i18n/config";
import { localizeProduct } from "@/lib/localize";
import type { ProductWithCategory } from "@/lib/types";

/** What the star button saves about a piece (see lib/picks.ts). Plain data, safe to pass to the client. */
export type PickSnapshot = {
  slug: string;
  title: string;
  image: string | null;
  price: number | null;
  currency: string;
  store: string;
  category: string | null;
  code: string | null;
};

export function toPickSnapshot(product: ProductWithCategory, locale: Locale): PickSnapshot {
  const p = localizeProduct(product, locale);
  return {
    slug: p.slug,
    title: p.title,
    image: p.images[0] ?? null,
    price: p.price,
    currency: p.currency,
    store: p.store,
    category: p.category?.slug ?? null,
    code: p.code ?? null,
  };
}
