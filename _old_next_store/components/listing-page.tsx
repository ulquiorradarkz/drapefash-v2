import Link from "next/link";
import { ProductGrid } from "@/components/store/product-grid";
import type { Category, ProductWithCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListingPage({
  eyebrow,
  title,
  intro,
  products,
  categories,
  activeHref,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  products: ProductWithCategory[];
  categories?: { href: string; name: string }[];
  activeHref?: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-8">
        <p className="iris-text text-xs font-semibold uppercase tracking-[0.3em]">{eyebrow}</p>
        <h1 className="chrome-text mt-2 text-4xl font-black sm:text-6xl">{title}</h1>
        {intro && <p className="mt-3 max-w-xl text-white/65">{intro}</p>}
        {categories && categories.length > 0 && (
          <nav aria-label="Filter by category" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4">
            {categories.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                aria-current={activeHref === c.href ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white",
                  activeHref === c.href && "border-white/60 bg-white/10 text-white",
                )}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}
        <p className="mt-4 text-xs text-white/40">
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </p>
      </header>
      <ProductGrid products={products} priorityCount={4} />
    </div>
  );
}

export function categoryLinks(categories: Category[], gender?: "women" | "men") {
  return categories
    .filter((c) => !gender || c.gender === "unisex" || c.gender === gender)
    .map((c) => ({ href: `/category/${c.slug}`, name: c.name }));
}
