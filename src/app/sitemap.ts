import type { MetadataRoute } from "next";
import { listCategories, listPublishedSlugs } from "@/lib/data";
import { LOCALES, LOCALE_META, localePath } from "@/i18n/config";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

/** Every page in every language, each entry listing its translations. */
function entry(path: string, lastModified: Date, changeFrequency: "daily" | "weekly", priority: number): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `${SITE_URL}${localePath(l, path)}`]));
  return LOCALES.map((l) => ({
    url: `${SITE_URL}${localePath(l, path)}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages: { ...languages, "x-default": `${SITE_URL}${localePath("en", path)}` } },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([listPublishedSlugs(), listCategories()]);
  const now = new Date();
  return [
    ...entry("/", now, "daily", 1),
    ...entry("/shop", now, "daily", 0.9),
    ...entry("/women", now, "daily", 0.9),
    ...entry("/men", now, "daily", 0.9),
    ...entry("/contact", now, "weekly", 0.5),
    ...["/about", "/affiliate-disclosure", "/privacy", "/cookies"].flatMap((p) => entry(p, now, "weekly", 0.3)),
    ...categories.flatMap((c) => entry(`/category/${c.slug}`, now, "daily", 0.8)),
    ...products.flatMap((p) => entry(`/product/${p.slug}`, new Date(p.updated_at), "weekly", 0.7)),
  ];
}
