"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Category, Gender } from "@/lib/types";

function GenderSelect({ value, onChange, label }: { value: Gender; onChange: (g: Gender) => void; label: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Gender)}>
      <SelectTrigger className="w-full sm:w-36" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unisex">Unisex</SelectItem>
        <SelectItem value="women">Women</SelectItem>
        <SelectItem value="men">Men</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function CategoriesManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [list, setList] = useState(categories);
  const [lastProps, setLastProps] = useState(categories);
  if (categories !== lastProps) {
    setLastProps(categories);
    setList(categories);
  }
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("unisex");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string; gender: Gender } | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { category } = await call("/api/admin/categories", "POST", { name, gender });
      setList((l) => [...l, category]);
      setName("");
      toast.success("Category created");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      const { category } = await call(`/api/admin/categories/${editing.id}`, "PATCH", editing);
      setList((l) => l.map((c) => (c.id === category.id ? category : c)));
      setEditing(null);
      toast.success("Category saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    const before = list;
    setList(next);
    try {
      await call("/api/admin/categories", "PUT", { ids: next.map((c) => c.id) });
      router.refresh();
    } catch (err) {
      setList(before);
      toast.error(err instanceof Error ? err.message : "Reorder failed");
    }
  }

  async function remove(c: Category) {
    setBusy(true);
    try {
      await call(`/api/admin/categories/${c.id}`, "DELETE");
      setList((l) => l.filter((x) => x.id !== c.id));
      toast.success("Category deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
      setToDelete(null);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name, e.g. Dresses" aria-label="New category name" />
        <GenderSelect value={gender} onChange={setGender} label="New category gender" />
        <Button type="submit" disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />} Add
        </Button>
      </form>

      <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
        {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No categories yet.</li>}
        {list.map((c, i) => (
          <li key={c.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            {editing?.id === c.id ? (
              <>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Category name" />
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} aria-label="Category slug" className="sm:w-48" />
                <GenderSelect value={editing.gender} onChange={(g) => setEditing({ ...editing, gender: g })} label="Category gender" />
                <div className="flex gap-1">
                  <Button size="icon-sm" onClick={saveEdit} disabled={busy} aria-label="Save">
                    <Check />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel">
                    <X />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /category/{c.slug} · {c.gender} · {counts[c.id] ?? 0} products
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.name} up`}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Move ${c.name} down`}>
                    <ArrowDown />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, gender: c.gender })} aria-label={`Edit ${c.name}`}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => setToDelete(c)} aria-label={`Delete ${c.name}`}>
                    <Trash2 className="text-red-300" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {counts[toDelete?.id ?? ""] ?? 0} products are kept but become uncategorised.
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
