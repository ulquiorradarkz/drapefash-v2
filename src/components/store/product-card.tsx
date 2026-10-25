import Link from "next/link";
import { SmartImage } from "@/components/smart-image";
import { StoreBadge } from "@/components/store/store-badge";
import { Price } from "@/components/store/price";
import { ShopNowButton } from "@/components/store/shop-now-button";
import { PickButton } from "@/components/store/pick-button";
import { localePath, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";
import { categoryName, localizeProduct, storeLabel } from "@/lib/localize";
import { toPickSnapshot } from "@/lib/pick-item";
import type { ProductWithCategory } from "@/lib/types";

/**
 * A piece with its swing tag: the item ID on an off-white tag, the star to save it, the store and
 * category under the picture. The picture leans in under the pointer.
 */
export function ProductCard({
  product: raw,
  locale,
  t,
  priority = false,
}: {
  product: ProductWithCategory;
  locale: Locale;
  t: Dictionary;
  priority?: boolean;
}) {
  const product = localizeProduct(raw, locale);
  const img = product.images[0];
  const href = localePath(locale, `/product/${product.slug}`);
  const store = storeLabel(product.store, t);
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative">
        <Link
          href={href}
          className="frame-zoom focus-ring relative block aspect-[4/5] overflow-hidden bg-paper-2"
          tabIndex={-1}
          aria-hidden
        >
          {img ? (
            <SmartImage
              src={img}
              alt={fmt(t.product.imgAlt, { name: product.title, store })}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <span className="grid h-full place-items-center t-small text-ink-2">{t.product.noImage}</span>
          )}
        </Link>
        {product.code && (
          <span className="tag pointer-events-none absolute start-0 top-0" dir="ltr">
            {product.code}
          </span>
        )}
        <PickButton
          item={toPickSnapshot(raw, locale)}
          labels={{ save: t.picks.save, remove: t.picks.remove, saved: t.picks.saved }}
          className="absolute end-0 top-0"
        />
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <StoreBadge store={product.store} otherLabel={t.product.store} />
          {product.category && <span className="text-[15px] text-ink-2">{categoryName(product.category, locale, t)}</span>}
        </p>
        <h3 className="text-[length:var(--t-body)] leading-snug">
          <Link href={href} className="link-u focus-ring line-clamp-2">
            <bdi>{product.title}</bdi>
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1.5">
          <Price price={product.price} original={product.original_price} currency={product.currency} locale={locale} labels={t.price} />
          <ShopNowButton
            slug={product.slug}
            label={t.product.shop}
            newTabText={`${fmt(t.product.shopOn, { store })}, ${t.product.newTab}`}
            size="sm"
            variant="line"
          />
        </div>
      </div>
    </article>
  );
}
