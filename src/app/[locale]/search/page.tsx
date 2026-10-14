import { notFound, redirect } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";

/** Search lives in the shop now: /ar/search?q=x -> /ar/shop?q=x */
export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 80);
  redirect(query ? `${localePath(locale, "/shop")}?q=${encodeURIComponent(query)}` : localePath(locale, "/shop"));
}
