import Link from "next/link";
import { SmartImage } from "@/components/smart-image";
import { TiltCard } from "@/components/store/tilt-card";
import { StoreBadge } from "@/components/store/store-badge";
import { Price } from "@/components/store/price";
import { ShopNowButton } from "@/components/store/shop-now-button";
import type { ProductWithCategory } from "@/lib/types";

export function ProductCard({ product, priority = false }: { product: ProductWithCategory; priority?: boolean }) {
  const img = product.images[0];
  return (
    <TiltCard className="glass chrome-border group relative flex h-full flex-col overflow-hidden rounded-[1.4rem]">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-t-[1.4rem] bg-white/[0.03]" aria-label={product.title}>
        {img ? (
          <SmartImage
            src={img}
            alt={product.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-white/40">No image</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        <StoreBadge store={product.store} className="absolute left-2.5 top-2.5" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90 hover:text-white sm:text-sm">
          {product.title}
        </Link>
        <Price price={product.price} original={product.original_price} currency={product.currency} />
        <div className="mt-auto pt-1">
          <ShopNowButton slug={product.slug} size="sm" className="w-full" />
        </div>
      </div>
    </TiltCard>
  );
}
