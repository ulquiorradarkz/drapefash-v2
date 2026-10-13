import { requireAdminPage } from "@/lib/auth";
import { ImportPanel } from "@/components/admin/import-panel";
import type { Category } from "@/lib/types";
import { aliexpressKeysConfigured } from "@/lib/import/aliexpress-api";

export const metadata = { title: "Import" };

export default async function ImportPage() {
  const { supabase } = await requireAdminPage();
  const { data: categories } = await supabase.from("categories").select("id, name, slug, gender, sort_order").order("sort_order");
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Import from a link</h1>
        <p className="text-sm text-muted-foreground">
          Paste a product link from AliExpress, SHEIN, Bulchic or any store. We read the page&apos;s product data, then you review everything before publishing.
          {aliexpressKeysConfigured() ? " AliExpress API keys detected: AliExpress links use the official API." : " AliExpress API keys not set: AliExpress links are read from the product page."}
        </p>
      </header>
      <ImportPanel categories={(categories ?? []) as Category[]} />
    </div>
  );
}
