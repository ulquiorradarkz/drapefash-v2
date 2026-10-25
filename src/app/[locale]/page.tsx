import { notFound } from "next/navigation";
import { PosterHero } from "@/components/store/home/poster-hero";
import { IdBand } from "@/components/store/home/id-band";
import { CloseUp } from "@/components/store/home/close-up";
import { RailList, type RailGroup } from "@/components/store/home/rail-list";
import { CategoryFrame, type FrameCategory } from "@/components/store/home/category-frame";
import { Verbs, type VerbPanel } from "@/components/store/home/verbs";
import type { HomePiece } from "@/components/store/home/types";
import { ContactPanel } from "@/components/store/contact-panel";
import { LOCALE_META, isLocale, localePath, type Locale } from "@/i18n/config";
import { fmt, getDictionary, pluralize, type Dictionary } from "@/i18n";
import { getCatalogStats, listCategories, listProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { categoryName, localizeProduct, storeLabel } from "@/lib/localize";
import { toPickSnapshot } from "@/lib/pick-item";
import { SITE_URL } from "@/lib/env";
import type { ProductWithCategory } from "@/lib/types";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string }> };

const STREET = ["/street/street-tower.jpg", "/street/street-alley.jpg", "/street/street-bicycle.jpg", "/street/street-shop-poster.jpg"];
/** The last verb (Shop) runs a muted street clip; the poster above is its still. */
const STREET_VIDEO: (string | undefined)[] = [undefined, undefined, undefined, "/street/street-shop.webm"];

/**
 * Home: the pinned poster (the name holds, the pieces change under it), the ID rail, two pieces in
 * close-up, the archive as a line-up you can type into, the departments in one frame, how buying
 * works one verb at a time, and the Instagram handle as the way to reach the owner.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [products, stats, categories, newest] = await Promise.all([
    listProducts({ limit: 60 }),
    getCatalogStats(),
    listCategories(),
    listProducts({ limit: 32, sort: "new" }),
  ]);
  const shop = localePath(locale, "/shop");
  const piece = (p: ProductWithCategory) => toPiece(p, locale, t);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Drape",
    url: `${SITE_URL}${localePath(locale)}`,
    inLanguage: LOCALE_META[locale].htmlLang,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}${shop}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  // The hero: one piece from each category first, so the run of pictures reads as the whole edit.
  const withImage = products.filter((p) => p.images[0]);
  const heroRaw: ProductWithCategory[] = [];
  for (const c of categories) {
    const p = withImage.find((x) => x.category_id === c.id && !heroRaw.includes(x));
    if (p) heroRaw.push(p);
    if (heroRaw.length === 5) break;
  }
  for (const p of withImage) if (heroRaw.length < 5 && !heroRaw.includes(p)) heroRaw.push(p);
  const hero = heroRaw.map(piece);

  // Close-ups: the featured pieces that are not already in the hero.
  const closeRaw = withImage
    .filter((p) => !heroRaw.includes(p))
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
    .slice(0, 2);

  // The line-up: the newest pieces, grouped under their category in the shop's category order.
  const groups: RailGroup[] = categories
    .map((c) => ({
      name: categoryName(c, locale, t),
      slug: c.slug,
      href: localePath(locale, `/category/${c.slug}`),
      pieces: newest.filter((p) => p.category_id === c.id).map(piece),
    }))
    .filter((g) => g.pieces.length);

  // The departments in one frame.
  const frame: FrameCategory[] = categories
    .filter((c) => (stats.byCategory[c.id]?.count ?? 0) > 0)
    .map((c) => {
      const s = stats.byCategory[c.id];
      const cover = withImage.find((p) => p.category_id === c.id)?.images[0] ?? null;
      const count = pluralize(locale, t.poster.pieces, s.count);
      return {
        slug: c.slug,
        name: categoryName(c, locale, t),
        href: localePath(locale, `/category/${c.slug}`),
        image: cover,
        caption: s.minPrice !== null ? `${count} · ${fmt(t.poster.from, { price: "⁦" + formatPrice(s.minPrice, "USD", locale) + "⁩" })}` : count,
      };
    });

  const verbLinks: (VerbPanel["link"] | undefined)[] = [
    { href: "#rail-q", label: t.nav.findId },
    undefined,
    { href: localePath(locale, "/picks"), label: t.fittingTeaser.cta },
    { href: localePath(locale, "/affiliate-disclosure"), label: t.footer.disclosureLink },
  ];
  const verbs: VerbPanel[] = t.verbs.map((v, i) => ({ verb: v.verb, text: v.text, image: STREET[i % STREET.length], video: STREET_VIDEO[i], link: verbLinks[i] }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {hero.length > 0 ? (
        <PosterHero pieces={hero} line={t.hero.title} cta={t.hero.cta} shopHref={shop} openLabel={t.archive.piece} />
      ) : (
        <section aria-labelledby="hero-title" className="page-x page-max pb-10 pt-[clamp(48px,10vh,120px)]">
          <h1 id="hero-title" className="t-giant text-ink">
            Drape
          </h1>
          <p className="mt-8 max-w-[40ch] t-statement text-ink">{t.hero.title}</p>
          <p className="mt-4 max-w-[46ch] t-small text-ink-2">{t.shop.emptyCatalog}</p>
        </section>
      )}
      <IdBand pieces={newest.map(piece)} label={t.archive.heading} />
      {products.length > 0 && (
        <>
          <CloseUp
            pieces={closeRaw.map(piece)}
            labels={{
              shop: t.product.shop,
              shopOn: t.product.shopOn,
              newTab: t.product.newTab,
              save: t.picks.save,
              remove: t.picks.remove,
              saved: t.picks.saved,
              open: t.archive.piece,
            }}
          />
          <RailList
            groups={groups}
            idAction={localePath(locale, "/id")}
            shopHref={shop}
            labels={{
              heading: t.archive.heading,
              intro: t.archive.intro,
              finder: t.finder.label,
              placeholder: t.finder.placeholder,
              noMatch: t.finder.noMatch,
              seeAll: t.archive.seeAll,
            }}
          />
          <CategoryFrame heading={t.poster.heading} categories={frame} />
        </>
      )}
      <Verbs panels={verbs} label={t.how.heading} />
      <ContactPanel t={t} />
    </>
  );
}

function toPiece(raw: ProductWithCategory, locale: Locale, t: Dictionary): HomePiece {
  const p = localizeProduct(raw, locale);
  return {
    id: p.id,
    slug: p.slug,
    href: localePath(locale, `/product/${p.slug}`),
    image: p.images[0] ?? null,
    title: p.title,
    code: p.code ?? null,
    store: storeLabel(p.store, t),
    category: p.category ? categoryName(p.category, locale, t) : null,
    categorySlug: p.category?.slug ?? null,
    price: p.price !== null ? formatPrice(p.price, p.currency, locale) : null,
    pick: toPickSnapshot(raw, locale),
  };
}
