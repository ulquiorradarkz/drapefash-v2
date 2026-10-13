import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { ProductForm } from "@/components/admin/product-form";
import type { Category, Product } from "@/lib/types";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdminPage();
  const [{ data: product }, { data: categories }, { count: clicks }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name, slug, gender, sort_order").order("sort_order"),
    supabase.from("clicks").select("id", { count: "exact", head: true }).eq("product_id", id),
  ]);
  if (!product) notFound();
  const p = product as Product;

  return (
    <div className="space-y-5">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Edit product</h1>
          <p className="text-sm text-muted-foreground">
            {p.is_published ? "Published" : "Draft"} · {clicks ?? 0} Shop Now clicks all-time
          </p>
        </div>
        {p.is_published && (
          <a href={`/product/${p.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            View on store <ExternalLink className="size-3.5" />
          </a>
        )}
      </header>
      <ProductForm
        productId={p.id}
        categories={(categories ?? []) as Category[]}
        initial={{ ...p, price: p.price === null ? null : Number(p.price), original_price: p.original_price === null ? null : Number(p.original_price) }}
      />
    </div>
  );
}
