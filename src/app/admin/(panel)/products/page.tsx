import Link from "next/link";
import { Plus, LinkIcon } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import type { Category, ProductWithCategory } from "@/lib/types";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const { supabase } = await requireAdminPage();
  const [{ data: products, error }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*, category:categories(id, name, slug)").order("created_at", { ascending: false }).limit(2000),
    supabase.from("categories").select("id, name, slug, gender, sort_order").order("sort_order"),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{products?.length ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/products/new">
              <Plus /> Add manually
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/import">
              <LinkIcon /> Import from link
            </Link>
          </Button>
        </div>
      </header>
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error.message}</p>
      ) : (
        <ProductsTable products={(products ?? []) as ProductWithCategory[]} categories={(categories ?? []) as Category[]} />
      )}
    </div>
  );
}
