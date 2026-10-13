import { requireAdminPage } from "@/lib/auth";
import { CategoriesManager } from "@/components/admin/categories-manager";
import type { Category } from "@/lib/types";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { supabase } = await requireAdminPage();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name, slug, gender, sort_order").order("sort_order").order("name"),
    supabase.from("products").select("category_id"),
  ]);
  const counts: Record<string, number> = {};
  for (const p of products ?? []) if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">The order here is the order shown on the storefront.</p>
      </header>
      <CategoriesManager categories={(categories ?? []) as Category[]} counts={counts} />
    </div>
  );
}
