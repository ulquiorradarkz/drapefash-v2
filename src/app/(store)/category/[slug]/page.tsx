import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage, categoryLinks } from "@/components/store/listing-page";
import { getCategoryBySlug, listCategories, listProducts } from "@/lib/data";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await listCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: `Shop ${category.name.toLowerCase()} with a Y2K chrome edge, picked from AliExpress, SHEIN and Bulchic.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [category, categories] = await Promise.all([getCategoryBySlug(slug), listCategories()]);
  if (!category) notFound();
  const products = await listProducts({ categoryId: category.id, limit: 96 });
  return (
    <ListingPage
      eyebrow={category.gender === "unisex" ? "Category" : category.gender === "women" ? "Women" : "Men"}
      title={category.name}
      products={products}
      categories={categoryLinks(categories)}
      activeHref={`/category/${category.slug}`}
    />
  );
}
