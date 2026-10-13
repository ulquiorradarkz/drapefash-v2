import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/motion";
import type { ProductWithCategory } from "@/lib/types";

export function ProductGrid({ products, priorityCount = 0, emptyText = "New pieces are dropping soon." }: { products: ProductWithCategory[]; priorityCount?: number; emptyText?: string }) {
  if (!products.length) {
    return (
      <div className="glass chrome-border rounded-2xl p-10 text-center text-white/60" data-testid="empty-grid">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4" data-testid="product-grid">
      {products.map((p, i) =>
        i < priorityCount ? (
          <li key={p.id}>
            <ProductCard product={p} priority />
          </li>
        ) : (
          <Reveal as="li" key={p.id} delay={Math.min(i % 4, 3) * 0.06}>
            <ProductCard product={p} />
          </Reveal>
        ),
      )}
    </ul>
  );
}
