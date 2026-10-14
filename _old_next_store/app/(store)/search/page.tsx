import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ProductGrid } from "@/components/store/product-grid";
import { listProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Drape for chrome, Y2K and streetwear pieces.",
  alternates: { canonical: "/search" },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const products = await listProducts({ query: query || undefined, limit: 96 });
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="chrome-text text-4xl font-black sm:text-6xl">Search</h1>
      <form action="/search" role="search" className="relative mt-6 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/50" aria-hidden />
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Try “silver jacket” or “platform boots”"
          aria-label="Search products"
          className="h-13 w-full rounded-full border border-white/20 bg-white/5 py-3.5 pl-12 pr-28 text-base text-white placeholder:text-white/40 outline-none focus:border-white/50"
        />
        <button type="submit" className="btn-chrome absolute right-1.5 top-1/2 h-10 -translate-y-1/2 px-5 text-sm">
          Search
        </button>
      </form>
      <p className="mb-6 mt-6 text-sm text-white/50" aria-live="polite">
        {query ? `${products.length} result${products.length === 1 ? "" : "s"} for “${query}”` : `Browse all ${products.length} pieces`}
      </p>
      <ProductGrid products={products} priorityCount={4} emptyText={query ? "Nothing matches that yet. Try a shorter word." : "New pieces are dropping soon."} />
    </div>
  );
}
