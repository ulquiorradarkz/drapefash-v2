import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck, Truck } from "lucide-react";
import { getProductBySlug, listProducts, listPublishedSlugs } from "@/lib/data";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-grid";
import { ShopNowButton } from "@/components/store/shop-now-button";
import { StoreBadge } from "@/components/store/store-badge";
import { Price } from "@/components/store/price";
import { storeName } from "@/lib/stores";
import { DISCLOSURE, SITE_URL } from "@/lib/env";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listPublishedSlugs();
  return slugs.slice(0, 200).map((s) => ({ slug: s.slug }));
}

function absolute(src: string) {
  return src.startsWith("http") ? src : `${SITE_URL}${src}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const description = (p.description || `${p.title}, available on ${storeName(p.store)}.`).slice(0, 160);
  return {
    title: p.title,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { type: "website", title: p.title, description, url: `/product/${p.slug}` },
    twitter: { card: "summary_large_image", title: p.title, description },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = await listProducts({ categoryId: product.category_id ?? undefined, excludeId: product.id, limit: 4 });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || undefined,
    image: product.images.map(absolute),
    sku: product.id,
    brand: { "@type": "Brand", name: storeName(product.store) },
    category: product.category?.name,
    url: `${SITE_URL}/product/${product.slug}`,
    ...(product.price !== null && {
      offers: {
        "@type": "Offer",
        price: product.price.toFixed(2),
        priceCurrency: product.currency,
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/product/${product.slug}`,
        seller: { "@type": "Organization", name: storeName(product.store) },
      },
    }),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...(product.category ? [{ "@type": "ListItem", position: 2, name: product.category.name, item: `${SITE_URL}/category/${product.category.slug}` }] : []),
      { "@type": "ListItem", position: product.category ? 3 : 2, name: product.title, item: `${SITE_URL}/product/${product.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-xs text-white/50">
        <Link href="/" className="hover:text-white">
          Home
        </Link>
        {product.category && (
          <>
            <ChevronRight className="size-3" aria-hidden />
            <Link href={`/category/${product.category.slug}`} className="hover:text-white">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3" aria-hidden />
        <span className="line-clamp-1 text-white/70">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <ProductGallery images={product.images} title={product.title} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <StoreBadge store={product.store} />
          <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-4xl">{product.title}</h1>
          <div className="mt-5">
            <Price price={product.price} original={product.original_price} currency={product.currency} large />
          </div>
          <p className="mt-2 text-xs text-white/45">Price shown when added; the final price is set by {storeName(product.store)}.</p>

          <div className="mt-7 flex flex-col gap-3">
            <ShopNowButton slug={product.slug} size="lg" className="w-full sm:w-auto sm:min-w-72" label={`Shop Now on ${storeName(product.store)}`} />
            <p className="glass rounded-xl px-4 py-3 text-xs leading-relaxed text-white/70" role="note">
              <strong className="text-white">Affiliate link.</strong> {DISCLOSURE}
            </p>
          </div>

          <ul className="mt-6 space-y-2 text-sm text-white/65">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-white/50" aria-hidden /> Checkout, shipping and returns are handled by {storeName(product.store)}.
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-white/50" aria-hidden /> Check delivery times on the store page before you buy.
            </li>
          </ul>

          {product.description && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Details</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-white/75">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-20" aria-labelledby="related-title">
          <h2 id="related-title" className="chrome-text mb-6 text-2xl font-bold sm:text-3xl">
            You might also like
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
