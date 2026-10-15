"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Sparkles, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductForm } from "@/components/admin/product-form";
import { BulkImport } from "@/components/admin/bulk-import";
import type { Category, Product } from "@/lib/types";
import type { ExtractResult } from "@/lib/import/types";
import { cn } from "@/lib/utils";

export function ImportPanel({ categories }: { categories: Category[] }) {
  return (
    <Tabs defaultValue="single" className="space-y-4">
      <TabsList>
        <TabsTrigger value="single">Single link</TabsTrigger>
        <TabsTrigger value="bulk">Bulk (one per line)</TabsTrigger>
      </TabsList>
      <TabsContent value="single">
        <SingleImport categories={categories} />
      </TabsContent>
      <TabsContent value="bulk">
        <BulkImport />
      </TabsContent>
    </Tabs>
  );
}

function SingleImport({ categories }: { categories: Category[] }) {
  const [affiliate, setAffiliate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<Product | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function fetchDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(null);
    setRequestError(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The importer follows the affiliate link to the store page and reads the details there.
        body: JSON.stringify({ url: affiliate, affiliate_url: affiliate }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error ?? `Request failed (${res.status})`);
      setResult(json as ExtractResult);
    } catch (err) {
      // Never leave the admin stuck: show an empty, editable form.
      setRequestError(err instanceof Error ? err.message : "Request failed");
      setResult({
        ok: false,
        quality: "failed",
        method: "none",
        message: "Couldn't read this link. Fill in the form by hand.",
        warnings: [],
        data: {
          title: "",
          description: "",
          price: null,
          original_price: null,
          currency: "USD",
          images: [],
          store: "other",
          source_url: "",
          affiliate_url: affiliate,
          gender: "unisex",
          category_id: null,
          category_name: null,
        },
      });
    } finally {
      setFormKey((k) => k + 1);
      setLoading(false);
    }
  }

  function reset() {
    setAffiliate("");
    setResult(null);
    setSaved(null);
  }

  const tone = result?.quality === "complete" ? "ok" : result?.quality === "partial" ? "warn" : "bad";

  return (
    <div className="space-y-6">
      <form onSubmit={fetchDetails} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="import-affiliate">Your affiliate link</Label>
          <Input
            id="import-affiliate"
            type="url"
            value={affiliate}
            onChange={(e) => setAffiliate(e.target.value)}
            placeholder="https://s.click.aliexpress.com/e/…"
            required
          />
        </div>
        <Button type="submit" className="h-9" disabled={loading || !affiliate.trim()}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} {loading ? "Reading…" : "Fetch details"}
        </Button>
      </form>

      {saved && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <CheckCircle2 className="size-5 text-emerald-300" />
          <span className="flex-1">
            <strong>{saved.title}</strong> {saved.is_published ? "is live." : "was saved as a draft."}
          </span>
          {saved.is_published && (
            <a href={`/product/${saved.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline">
              View on store <ExternalLink className="size-3.5" />
            </a>
          )}
          <Link href={`/admin/products/${saved.id}`} className="underline">
            Edit
          </Link>
          <Button size="sm" variant="outline" onClick={reset}>
            Import another
          </Button>
        </div>
      )}

      {result && !saved && (
        <>
          <div
            role="status"
            data-testid="import-status"
            data-quality={result.quality}
            className={cn(
              "space-y-2 rounded-2xl border p-4 text-sm",
              tone === "ok" && "border-emerald-500/30 bg-emerald-500/10",
              tone === "warn" && "border-amber-500/30 bg-amber-500/10",
              tone === "bad" && "border-red-500/30 bg-red-500/10",
            )}
          >
            <p className="flex items-start gap-2 font-medium">
              {tone === "ok" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              ) : tone === "warn" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-red-300" />
              )}
              {result.message}
            </p>
            {requestError && <p className="text-xs text-red-200">Error: {requestError}</p>}
            {result.warnings.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-6 text-xs text-muted-foreground">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {result.data.category_name && <p className="text-xs text-muted-foreground">Suggested category: {result.data.category_name}</p>}
          </div>
          <ProductForm
            key={formKey}
            categories={categories}
            initial={{
              title: result.data.title,
              description: result.data.description,
              price: result.data.price,
              original_price: result.data.original_price,
              currency: result.data.currency,
              images: result.data.images,
              store: result.data.store,
              source_url: result.data.source_url,
              affiliate_url: result.data.affiliate_url,
              gender: result.data.gender,
              category_id: result.data.category_id,
            }}
            onSaved={(p) => setSaved(p)}
          />
        </>
      )}
    </div>
  );
}
