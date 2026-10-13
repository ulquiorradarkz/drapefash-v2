import type { Metadata } from "next";
import { ListingPage, categoryLinks } from "@/components/store/listing-page";
import { listCategories, listProducts } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Men",
  description: "Chrome-detailed streetwear, techwear and sneakers for men from AliExpress, SHEIN and Bulchic.",
  alternates: { canonical: "/men" },
};

export default async function MenPage() {
  const [products, categories] = await Promise.all([listProducts({ gender: "men", limit: 96 }), listCategories()]);
  return (
    <ListingPage
      eyebrow="Men"
      title="Men"
      intro="Mirror-finish outerwear, cargo silhouettes and chunky silver sneakers."
      products={products}
      categories={[{ href: "/men", name: "All" }, ...categoryLinks(categories, "men")]}
      activeHref="/men"
    />
  );
}
