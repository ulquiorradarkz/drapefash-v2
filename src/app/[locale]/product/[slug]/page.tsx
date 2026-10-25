import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Shirt } from "lucide-react";
import { getProductBySlug, listProducts, listPublishedSlugs } from "@/lib/data";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-grid";
import { ShopNowButton } from "@/components/store/shop-now-button";
import { StoreBadge } from "@/components/store/store-badge";
import { Price } from "@/components/store/price";
import { Reveal } from "@/components/store/motion";
import { PickButton } from "@/components/store/pick-button";
import { SwingTag } from "@/components/store/swing-tag";
import { CopyId } from "@/components/store/copy-id";
import { toPickSnapshot } from "@/lib/pick-item";
import { LOCALES, LOCALE_META, isLocale, localePath } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { categoryName, localizeProduct, storeLabel } from "@/lib/localize";
import { SITE_URL } from "@/lib/env";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const slugs = await listPublishedSlugs();
  return LOCALES.flatMap((locale) => slugs.slice(0, 100).map((s) => ({ locale, slug: s.slug })));
}

function absolute(src: string) {
  return src.startsWith("http") ? src : `${SITE_URL}${src}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const raw = await getProductBySlug(slug);
  if (!raw) return { title: t.meta.notFoundTitle, robots: { index: false } };
  const p = localizeProduct(raw, locale);
  const store = storeLabel(p.store, t);
  const description = (p.description || fmt(t.meta.productDesc, { name: p.title, store })).slice(0, 160);
  return {
    title: `${p.title}, ${store}`,
    description,
    alternates: alternatesFor(locale, `/product/${p.slug}`),
    openGraph: { type: "website", title: p.title, description, url: localePath(locale, `/product/${p.slug}`), locale: LOCALE_META[locale].ogLocale },
    twitter: { card: "summary_large_image", title: p.title, description },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const raw = await getProductBySlug(slug);
  if (!raw) notFound();
  const product = localizeProduct(raw, locale);
  const store = storeLabel(product.store, t);
  const catName = product.category ? categoryName(product.category, locale, t) : null;
  const related = await listProducts({ categoryId: product.category_id ?? undefined, excludeId: product.id, limit: 4 });
  const url = `${SITE_URL}${localePath(locale, `/product/${product.slug}`)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || undefined,
    image: product.images.map(absolute),
    sku: product.code ?? product.id,
    brand: { "@type": "Brand", name: store },
    category: catName ?? undefined,
    url,
    inLanguage: LOCALE_META[locale].htmlLang,
    ...(product.price !== null && {
      offers: {
        "@type": "Offer",
        price: product.price.toFixed(2),
        priceCurrency: product.currency,
        availability: "https://schema.org/InStock",
        url,
        seller: { "@type": "Organization", name: store },
      },
    }),
  };
  const crumbs = [
    { href: localePath(locale), label: t.nav.home },
    ...(product.category && catName ? [{ href: localePath(locale, `/category/${product.category.slug}`), label: catName }] : []),
  ];
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ...crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: `${SITE_URL}${c.href}` })),
      { "@type": "ListItem", position: crumbs.length + 1, name: product.title, item: url },
    ],
  };
  const imageAlt = fmt(t.product.imgAlt, { name: product.title, store });

  return (
    <div className="page-x page-max pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />

      <nav aria-label={t.product.breadcrumb} className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[length:var(--t-small)] text-ink-2">
          {crumbs.map((c) => (
            <li key={c.href} className="flex items-center gap-1.5">
              <Link href={c.href} className="link-u focus-ring whitespace-nowrap">
                {c.label}
              </Link>
              <ChevronRight className="icon-dir size-4" strokeWidth={1.5} aria-hidden />
            </li>
          ))}
          <li aria-current="page" className="line-clamp-1 text-ink">
            <bdi>{product.title}</bdi>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="relative">
          <ProductGallery images={product.images} alt={imageAlt} labels={{ ...t.product, photos: fmt(t.product.photos, { name: product.title }) }} />
          {product.code && (
            <span className="tag pointer-events-none absolute start-0 top-0 text-[14px]" dir="ltr" aria-hidden>
              {product.code}
            </span>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <h1
            className={product.title.length > 70 ? "hero-rise font-display text-[clamp(32px,3vw,44px)] leading-[1.02]" : "hero-rise t-head"}
            style={{ ["--rise-delay" as string]: "0.05s" }}
          >
            <bdi>{product.title}</bdi>
          </h1>
          {product.code && (
            <div className="hero-rise mt-6 flex items-end gap-3" style={{ ["--rise-delay" as string]: "0s" }}>
              <SwingTag code={product.code} lines={[]} className="w-[184px]" />
              <CopyId code={product.code} labels={{ copy: t.idSearch.copy, copied: t.idSearch.copied }} />
            </div>
          )}
          <div className="hero-rise mt-6 flex flex-wrap items-center gap-4" style={{ ["--rise-delay" as string]: "0.15s" }}>
            <Price price={product.price} original={product.original_price} currency={product.currency} locale={locale} labels={t.price} large />
            <StoreBadge store={product.store} size="md" otherLabel={t.product.store} />
          </div>
          <p className="mt-3 t-small text-ink-2">{fmt(t.product.priceNote, { store })}</p>

          <div className="hero-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ ["--rise-delay" as string]: "0.25s" }}>
            <ShopNowButton
              slug={product.slug}
              size="lg"
              className="w-full sm:w-auto sm:min-w-72"
              label={fmt(t.product.shopOn, { store })}
              newTabText={t.product.newTab}
            />
            <PickButton
              item={toPickSnapshot(raw, locale)}
              labels={{ save: t.picks.save, remove: t.picks.remove, saved: t.picks.saved }}
              variant="full"
              className="w-full sm:w-auto"
            />
          </div>
          <p className="mt-4">
            <Link href={`${localePath(locale, "/picks")}?wear=${encodeURIComponent(product.slug)}`} className="link-u focus-ring inline-flex items-center gap-2 text-[length:var(--t-small)] font-semibold text-ink">
              <Shirt className="size-4" strokeWidth={1.75} aria-hidden />
              {t.product.tryOn}
            </Link>
          </p>
          <p className="mt-8 bg-paper-2 p-4 text-[length:var(--t-small)] leading-relaxed text-ink" role="note">
            {fmt(t.product.disclosure, { store })}{" "}
            <Link href={localePath(locale, "/affiliate-disclosure")} className="font-semibold underline decoration-accent underline-offset-4 hover:text-accent">
              {t.product.disclosureLink}
            </Link>
          </p>
          <p className="mt-4 text-[length:var(--t-small)] text-ink">{fmt(t.product.handledBy, { store })}</p>

          {product.description && (
            <section className="mt-12" aria-labelledby="details-title">
              <h2 id="details-title" className="font-display text-[clamp(30px,3vw,40px)] leading-none">
                {t.product.details}
              </h2>
              <p className="mt-3 max-w-[60ch] whitespace-pre-line text-[length:var(--t-body)] leading-relaxed">
                <bdi>{product.description}</bdi>
              </p>
            </section>
          )}
          <dl className="mt-8 grid grid-cols-2 gap-2 text-[length:var(--t-small)]">
            {catName && product.category && (
              <div className="bg-paper-2 p-4">
                <dt className="t-data text-ink-2">{t.product.category}</dt>
                <dd className="mt-1">
                  <Link href={localePath(locale, `/category/${product.category.slug}`)} className="link-u focus-ring">
                    {catName}
                  </Link>
                </dd>
              </div>
            )}
            <div className="bg-paper-2 p-4">
              <dt className="t-data text-ink-2">{t.product.store}</dt>
              <dd className="mt-1">
                <bdi>{store}</bdi>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-[var(--section)]" aria-labelledby="related-title">
          <Reveal as="h2" id="related-title" className="t-head mb-10 text-ink">
            {catName ? fmt(t.product.related, { category: catName }) : t.product.alsoLike}
          </Reveal>
          <ProductGrid products={related} locale={locale} t={t} />
        </section>
      )}
    </div>
  );
}
