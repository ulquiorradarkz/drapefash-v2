export const STORES = ["aliexpress", "shein", "bulchic", "other"] as const;
export type Store = (typeof STORES)[number];

export const GENDERS = ["women", "men", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

/** Language codes other than English that a product or category can carry text for. */
export const TRANSLATED_LOCALES = ["zh", "hi", "es", "fr", "ar", "bn"] as const;
export type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number];

/** Per-language text. English lives in the main columns; other languages here. */
export type ProductTranslations = Partial<Record<TranslatedLocale, { title?: string; description?: string }>>;
export type CategoryTranslations = Partial<Record<TranslatedLocale, string>>;

export type Category = {
  id: string;
  name: string;
  slug: string;
  gender: Gender;
  sort_order: number;
  translations?: CategoryTranslations | null;
};

export type Product = {
  id: string;
  slug: string;
  /** Item ID the owner picked (for example DRP-014). Null until set, or before migration 20261014205834. */
  code?: string | null;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  original_price: number | null;
  images: string[];
  category_id: string | null;
  store: Store;
  source_url: string | null;
  affiliate_url: string;
  gender: Gender;
  is_published: boolean;
  is_featured: boolean;
  translations?: ProductTranslations | null;
  created_at: string;
  updated_at: string;
};

export type ProductWithCategory = Product & {
  category: Pick<Category, "id" | "name" | "slug" | "translations"> | null;
};

export type DashboardData = {
  range_days: number;
  products: { total: number; published: number; featured: number };
  views: { today: number; d7: number; d30: number };
  clicks: { today: number; d7: number; d30: number };
  top_products: { id: string; title: string; slug: string; store: Store; image: string | null; clicks: number }[];
  by_store: { store: Store; clicks: number }[];
  by_country: { country: string; clicks: number }[];
  series: { day: string; views: number; clicks: number }[];
};
