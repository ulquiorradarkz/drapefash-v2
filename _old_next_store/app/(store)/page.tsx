import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/store/hero";
import { ProductGrid } from "@/components/store/product-grid";
import { Reveal } from "@/components/store/motion";
import { ChromeMarquee } from "@/components/store/chrome-marquee";
import { listCategories, listProducts } from "@/lib/data";
import { SITE_URL } from "@/lib/env";

export const revalidate = 300;

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([listProducts({ featured: true, limit: 8 }), listProducts({ limit: 12 }), listCategories()]);
  const featuredIds = new Set(featured.map((p) => p.id));
  const fresh = latest.filter((p) => !featuredIds.has(p.id)).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Drape",
    url: SITE_URL,
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero />
      <ChromeMarquee />

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="featured-title">
        <SectionHead id="featured-title" eyebrow="Curated" title="Featured drops" href="/search" linkLabel="See all" />
        <ProductGrid products={featured.length ? featured : latest.slice(0, 8)} />
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6" aria-labelledby="cats-title">
          <SectionHead id="cats-title" eyebrow="Browse" title="Shop by category" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { href: "/women", name: "Women", sub: "All pieces" },
              { href: "/men", name: "Men", sub: "All pieces" },
              ...categories.map((c) => ({ href: `/category/${c.slug}`, name: c.name, sub: c.gender === "unisex" ? "Everyone" : c.gender === "women" ? "Women" : "Men" })),
            ].map((c, i) => (
              <Reveal as="li" key={c.href} delay={(i % 6) * 0.04}>
                <Link
                  href={c.href}
                  className="glass chrome-border group flex h-full min-h-24 flex-col justify-between rounded-2xl p-4 transition-colors hover:bg-white/[0.07]"
                >
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">{c.sub}</span>
                  <span className="mt-3 flex items-end justify-between gap-2">
                    <span className="chrome-text font-display text-lg font-bold leading-tight">{c.name}</span>
                    <ArrowRight className="size-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6" aria-labelledby="new-title">
          <SectionHead id="new-title" eyebrow="Just in" title="New arrivals" />
          <ProductGrid products={fresh} />
        </section>
      )}
    </>
  );
}

function SectionHead({ id, eyebrow, title, href, linkLabel }: { id: string; eyebrow: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <Reveal className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <p className="iris-text text-xs font-semibold uppercase tracking-[0.3em]">{eyebrow}</p>
        <h2 id={id} className="chrome-text mt-2 text-2xl font-bold sm:text-4xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="btn-ghost-chrome h-9 shrink-0 px-4 text-xs">
          {linkLabel} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
    </Reveal>
  );
}
