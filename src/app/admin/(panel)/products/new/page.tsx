import { requireAdminPage } from "@/lib/auth";
import { ProductForm } from "@/components/admin/product-form";
import type { Category, Store } from "@/lib/types";
import { detectStore } from "@/lib/stores";

export const metadata = { title: "Add product" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; affiliate?: string }>;
}) {
  const { supabase } = await requireAdminPage();
  const sp = await searchParams;
  const { data: categories } = await supabase.from("categories").select("id, name, slug, gender, sort_order").order("sort_order");
  const source = sp.source ?? "";
  const store: Store = source ? detectStore(source) : "other";
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Add product manually</h1>
        <p className="text-sm text-muted-foreground">Fill in the details yourself. To auto-fill from a store link, use Import.</p>
      </header>
      <ProductForm categories={(categories ?? []) as Category[]} initial={{ source_url: source, affiliate_url: sp.affiliate ?? "", store }} />
    </div>
  );
}
