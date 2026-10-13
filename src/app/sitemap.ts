import type { MetadataRoute } from "next";
import { listCategories, listPublishedSlugs } from "@/lib/data";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([listPublishedSlugs(), listCategories()]);
  const now = new Date();
  const staticPages = ["", "/women", "/men", "/search", "/about", "/affiliate-disclosure", "/privacy", "/cookies"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: (p === "" ? "daily" : "weekly") as "daily" | "weekly",
    priority: p === "" ? 1 : p === "/women" || p === "/men" ? 0.9 : 0.4,
  }));
  return [
    ...staticPages,
    ...categories.map((c) => ({ url: `${SITE_URL}/category/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
