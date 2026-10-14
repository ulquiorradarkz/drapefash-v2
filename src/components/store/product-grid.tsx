import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/motion";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { ProductWithCategory } from "@/lib/types";

export function ProductGrid({
  products,
  locale,
  t,
  priorityCount = 0,
}: {
  products: ProductWithCategory[];
  locale: Locale;
  t: Dictionary;
  priorityCount?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4" data-testid="product-grid">
      {products.map((p, i) => (
        <Reveal as="li" key={p.id} delay={(i % 4) * 70}>
          <ProductCard product={p} locale={locale} t={t} priority={i < priorityCount} />
        </Reveal>
      ))}
    </ul>
  );
}
