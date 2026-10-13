"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Pencil, Search, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SmartImage } from "@/components/smart-image";
import { STORES, type Category, type ProductWithCategory } from "@/lib/types";
import { storeName } from "@/lib/stores";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type Status = "all" | "published" | "draft" | "featured";

export function ProductsTable({ products, categories }: { products: ProductWithCategory[]; categories: Category[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(products);
  const [q, setQ] = useState("");
  const [store, setStore] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProductWithCategory | null>(null);
  const [, startTransition] = useTransition();

  // Keep in sync when the server sends fresh data.
  const [lastProps, setLastProps] = useState(products);
  if (products !== lastProps) {
    setLastProps(products);
    setRows(products);
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (term && !`${p.title} ${p.slug} ${p.description}`.toLowerCase().includes(term)) return false;
      if (store !== "all" && p.store !== store) return false;
      if (category === "none" && p.category_id) return false;
      if (category !== "all" && category !== "none" && p.category_id !== category) return false;
      if (status === "published" && !p.is_published) return false;
      if (status === "draft" && p.is_published) return false;
      if (status === "featured" && !p.is_featured) return false;
      return true;
    });
  }, [rows, q, store, category, status]);

  async function patch(id: string, update: Partial<ProductWithCategory>, success: string) {
    setPendingId(id);
    const before = rows;
    setRows((r) => r.map((p) => (p.id === id ? { ...p, ...update } : p)));
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast.success(success);
      startTransition(() => router.refresh());
    } catch (e) {
      setRows(before);
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(p: ProductWithCategory) {
    setPendingId(p.id);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      setRows((r) => r.filter((x) => x.id !== p.id));
      toast.success("Product deleted");
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setPendingId(null);
      setToDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_160px_180px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-8" aria-label="Search products" />
        </div>
        <Select value={store} onValueChange={setStore}>
          <SelectTrigger className="w-full" aria-label="Filter by store">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {STORES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "other" ? "Other" : storeName(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="none">No category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
          <SelectTrigger className="w-full" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Product</th>
              <th className="px-3 py-2.5 font-medium">Store</th>
              <th className="px-3 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">Price</th>
              <th className="px-3 py-2.5 font-medium">Published</th>
              <th className="px-3 py-2.5 font-medium">Featured</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  No products match these filters.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className={cn("hover:bg-white/[0.03]", pendingId === p.id && "opacity-60")} data-testid="product-row">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-white/5">
                      {p.images[0] && <SmartImage src={p.images[0]} alt="" fill sizes="44px" className="object-cover" unoptimized />}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:underline">
                        {p.title}
                      </Link>
                      <p className="line-clamp-1 text-xs text-muted-foreground">/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{p.store === "other" ? "Other" : storeName(p.store)}</Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.category?.name ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{formatPrice(p.price, p.currency) || "—"}</td>
                <td className="px-3 py-2">
                  <Switch
                    checked={p.is_published}
                    disabled={pendingId === p.id}
                    aria-label={p.is_published ? `Unpublish ${p.title}` : `Publish ${p.title}`}
                    onCheckedChange={(v) => patch(p.id, { is_published: v }, v ? "Published" : "Unpublished")}
                  />
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={pendingId === p.id}
                    aria-pressed={p.is_featured}
                    aria-label={p.is_featured ? `Unfeature ${p.title}` : `Feature ${p.title}`}
                    onClick={() => patch(p.id, { is_featured: !p.is_featured }, p.is_featured ? "Removed from featured" : "Featured")}
                  >
                    <Star className={cn(p.is_featured && "fill-amber-300 text-amber-300")} />
                  </Button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {p.is_published && (
                      <Button asChild size="icon-sm" variant="ghost" aria-label="View on store">
                        <a href={`/product/${p.slug}`} target="_blank" rel="noopener">
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                    <Button asChild size="icon-sm" variant="ghost" aria-label={`Edit ${p.title}`}>
                      <Link href={`/admin/products/${p.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${p.title}`} onClick={() => setToDelete(p)}>
                      <Trash2 className="text-red-300" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” and its click history will be permanently deleted. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove(toDelete)} className="bg-red-500/90 text-white hover:bg-red-500">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
