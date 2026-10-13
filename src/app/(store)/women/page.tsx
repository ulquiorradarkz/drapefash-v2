import type { Metadata } from "next";
import { ListingPage, categoryLinks } from "@/components/store/listing-page";
import { listCategories, listProducts } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Women",
  description: "Y2K chrome, frosted-glass and streetwear pieces for women from AliExpress, SHEIN and Bulchic.",
  alternates: { canonical: "/women" },
};

export default async function WomenPage() {
  const [products, categories] = await Promise.all([listProducts({ gender: "women", limit: 96 }), listCategories()]);
  return (
    <ListingPage
      eyebrow="Women"
      title="Women"
      intro="Metallic tops, low-rise everything and glossy accessories."
      products={products}
      categories={[{ href: "/women", name: "All" }, ...categoryLinks(categories, "women")]}
      activeHref="/women"
    />
  );
}
