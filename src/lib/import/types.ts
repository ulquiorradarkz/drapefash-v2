import type { Gender, Store } from "@/lib/types";

export type ExtractMethod = "aliexpress-api" | "json-ld" | "open-graph" | "page-data" | "link-only" | "none";

export type ExtractedProduct = {
  title: string;
  description: string;
  price: number | null;
  original_price: number | null;
  currency: string;
  images: string[];
  store: Store;
  source_url: string;
  affiliate_url: string;
  gender: Gender;
  category_id: string | null;
  category_name: string | null;
};

export type ExtractResult = {
  /** true when at least a title was found */
  ok: boolean;
  /** "complete" = title + price + image; "partial" = something missing; "failed" = nothing usable */
  quality: "complete" | "partial" | "failed";
  method: ExtractMethod;
  message: string;
  warnings: string[];
  data: ExtractedProduct;
};
