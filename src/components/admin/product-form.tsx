"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartImage } from "@/components/smart-image";
import { GENDERS, STORES, type Category, type Product } from "@/lib/types";
import { STORE_META, detectStore } from "@/lib/stores";
import { slugify } from "@/lib/format";

const isPrice = (v: string) => v.trim() === "" || (Number.isFinite(Number(v.replace(",", "."))) && Number(v.replace(",", ".")) >= 0);

const formSchema = z.object({
  affiliate_url: z
    .string()
    .trim()
    .min(1, "Your affiliate link is required")
    .refine((v) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(v), "Enter a full link starting with https://"),
  source_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/[^\s]+/i.test(v), "Enter a full link starting with https://"),
  title: z.string().trim().min(1, "Title is required").max(300),
  slug: z
    .string()
    .trim()
    .max(90)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Lowercase letters, numbers and dashes only"),
  description: z.string().max(5000),
  price: z.string().refine(isPrice, "Enter a valid price"),
  original_price: z.string().refine(isPrice, "Enter a valid price"),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/, "3-letter code, e.g. USD"),
  images: z.array(z.object({ url: z.string() })).max(12, "12 images max"),
  category_id: z.string(),
  store: z.enum(STORES),
  gender: z.enum(GENDERS),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  rehost_images: z.boolean(),
});

export type ProductFormValues = z.infer<typeof formSchema>;

export type ProductFormInitial = Partial<
  Pick<Product, "title" | "slug" | "description" | "price" | "original_price" | "currency" | "images" | "category_id" | "store" | "source_url" | "affiliate_url" | "gender" | "is_published" | "is_featured">
>;

function toValues(p: ProductFormInitial): ProductFormValues {
  return {
    affiliate_url: p.affiliate_url ?? "",
    source_url: p.source_url ?? "",
    title: p.title ?? "",
    slug: p.slug ?? "",
    description: p.description ?? "",
    price: p.price === null || p.price === undefined ? "" : String(p.price),
    original_price: p.original_price === null || p.original_price === undefined ? "" : String(p.original_price),
    currency: p.currency ?? "USD",
    images: (p.images ?? []).map((url) => ({ url })),
    category_id: p.category_id ?? "none",
    store: p.store ?? "other",
    gender: p.gender ?? "unisex",
    is_published: p.is_published ?? false,
    is_featured: p.is_featured ?? false,
    rehost_images: true,
  };
}

type Props = {
  categories: Category[];
  initial?: ProductFormInitial;
  productId?: string;
  /** Called after a successful save; defaults to navigating to the products list. */
  onSaved?: (product: Product) => void;
  compact?: boolean;
};

export function ProductForm({ categories, initial = {}, productId, onSaved }: Props) {
  const router = useRouter();
  const isEdit = Boolean(productId);
  const [saving, setSaving] = useState<null | "draft" | "publish" | "save">(null);
  const [newImage, setNewImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toValues(initial),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, setValue, watch } = form;
  const errors = formState.errors;
  const images = useFieldArray({ control, name: "images" });
  const title = watch("title");
  const slug = watch("slug");

  async function submit(values: ProductFormValues, intent: "draft" | "publish" | "save") {
    setSaving(intent);
    const payload = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      description: values.description.trim(),
      price: values.price.trim() === "" ? null : Number(values.price.replace(",", ".")),
      original_price: values.original_price.trim() === "" ? null : Number(values.original_price.replace(",", ".")),
      currency: values.currency.toUpperCase(),
      images: values.images.map((i) => i.url.trim()).filter(Boolean),
      category_id: values.category_id === "none" ? null : values.category_id,
      store: values.store,
      source_url: values.source_url.trim(),
      affiliate_url: values.affiliate_url.trim(),
      gender: values.gender,
      is_published: intent === "publish" ? true : intent === "draft" ? false : values.is_published,
      is_featured: values.is_featured,
      rehost_images: values.rehost_images,
    };
    try {
      const res = await fetch(isEdit ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Save failed (${res.status})`);
      const product = json.product as Product;
      toast.success(
        isEdit ? "Changes saved" : product.is_published ? "Product published" : "Saved as draft",
        product.is_published ? { action: { label: "View", onClick: () => window.open(`/product/${product.slug}`, "_blank") } } : undefined,
      );
      if (onSaved) onSaved(product);
      else {
        router.push("/admin/products");
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  function addImage() {
    const url = newImage.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Paste a full image link starting with https://");
      return;
    }
    images.append({ url });
    setNewImage("");
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 12 - images.fields.length)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        images.append({ url: json.url });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const fieldError = (msg?: string) => (msg ? <p className="text-xs text-red-300">{msg}</p> : null);

  return (
    <form
      onSubmit={handleSubmit((v) => submit(v, isEdit ? "save" : "publish"))}
      className="grid gap-6 lg:grid-cols-[1fr_320px]"
      noValidate
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="affiliate_url">Affiliate link (where Shop Now sends people)</Label>
          <Input id="affiliate_url" placeholder="https://s.click.aliexpress.com/e/..." {...register("affiliate_url")} aria-invalid={!!errors.affiliate_url} />
          {fieldError(errors.affiliate_url?.message)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="source_url">Product page link</Label>
          <Input
            id="source_url"
            placeholder="https://www.aliexpress.com/item/....html"
            {...register("source_url", {
              onBlur: (e) => {
                const s = detectStore(e.target.value);
                if (s !== "other" && watch("store") === "other") setValue("store", s);
              },
            })}
            aria-invalid={!!errors.source_url}
          />
          {fieldError(errors.source_url?.message)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register("title")} aria-invalid={!!errors.title} />
          {fieldError(errors.title?.message)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL slug</Label>
          <Input id="slug" placeholder={slugify(title || "product-name")} {...register("slug")} aria-invalid={!!errors.slug} />
          <p className="text-xs text-muted-foreground">/product/{slug || slugify(title || "product-name")} · leave empty to generate from the title</p>
          {fieldError(errors.slug?.message)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={5} {...register("description")} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" inputMode="decimal" placeholder="19.99" {...register("price")} aria-invalid={!!errors.price} />
            {fieldError(errors.price?.message)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="original_price">Was</Label>
            <Input id="original_price" inputMode="decimal" placeholder="optional" {...register("original_price")} />
            {fieldError(errors.original_price?.message)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} aria-invalid={!!errors.currency} />
            {fieldError(errors.currency?.message)}
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Images ({images.fields.length}/12)</legend>
          {images.fields.length === 0 && <p className="text-sm text-muted-foreground">No images yet. Paste an image link or upload a photo.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.fields.map((f, i) => (
              <li key={f.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <div className="relative aspect-[4/5]">
                  <SmartImage src={f.url} alt="" fill sizes="200px" className="object-cover" unoptimized />
                  {i === 0 && <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold">COVER</span>}
                </div>
                <div className="flex justify-between gap-1 p-1.5">
                  <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => images.move(i, i - 1)} aria-label="Move earlier">
                    <ArrowUp />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" disabled={i === images.fields.length - 1} onClick={() => images.move(i, i + 1)} aria-label="Move later">
                    <ArrowDown />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => images.remove(i)} aria-label="Remove image">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addImage();
                }
              }}
              placeholder="https://… image link"
              aria-label="Image link"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={addImage} disabled={images.fields.length >= 12}>
                <Plus /> Add
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || images.fields.length >= 12}>
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload
              </Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
            </div>
          </div>
          <Controller
            control={control}
            name="rehost_images"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                Save copies of store images to Drape storage (recommended: store links can expire)
              </label>
            )}
          />
          {errors.images?.message && fieldError(errors.images.message)}
        </fieldset>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label="Category">
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.gender !== "unisex" ? ` (${c.gender})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label="Gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="unisex">Unisex (shows in both)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Store</Label>
            <Controller
              control={control}
              name="store"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label="Store">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "other" ? "Other" : STORE_META[s].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <Controller
            control={control}
            name="is_featured"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3 text-sm">
                Featured on home page
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {isEdit && (
            <Controller
              control={control}
              name="is_published"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-3 text-sm">
                  Published
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isEdit ? (
            <Button type="submit" className="h-10" disabled={!!saving}>
              {saving && <Loader2 className="animate-spin" />} Save changes
            </Button>
          ) : (
            <>
              <Button type="submit" className="h-10" disabled={!!saving}>
                {saving === "publish" ? <Loader2 className="animate-spin" /> : <ImagePlus />} Publish
              </Button>
              <Button type="button" variant="outline" className="h-10" disabled={!!saving} onClick={handleSubmit((v) => submit(v, "draft"))}>
                {saving === "draft" && <Loader2 className="animate-spin" />} Save as draft
              </Button>
            </>
          )}
          {Object.keys(errors).length > 0 && <p className="text-xs text-red-300">Fix the highlighted fields first.</p>}
        </div>
      </aside>
    </form>
  );
}
