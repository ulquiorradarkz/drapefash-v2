"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Play, RotateCcw, Trash2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ExtractResult } from "@/lib/import/types";
import { cn } from "@/lib/utils";

type ItemStatus = "queued" | "reading" | "saving" | "saved" | "review" | "failed";

type Item = {
  id: number;
  url: string;
  affiliate: string;
  status: ItemStatus;
  message?: string;
  productId?: string;
  title?: string;
};

const CONCURRENCY = 2;

/** "productUrl affiliateUrl" (space, tab, comma or | separated). The affiliate link is optional. */
export function parseLines(text: string): { url: string; affiliate: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const urls = line.match(/https?:\/\/[^\s,|]+/gi) ?? [];
      return { url: urls[0] ?? line, affiliate: urls[1] ?? "" };
    });
}

export function BulkImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const nextId = useRef(1);

  const update = (id: number, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  async function processItem(item: Item) {
    update(item.id, { status: "reading", message: undefined });
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, affiliate_url: item.affiliate }),
      });
      const result = (await res.json().catch(() => null)) as ExtractResult | { error: string } | null;
      if (!res.ok || !result || "error" in result) {
        throw new Error(result && "error" in result ? result.error : `Request failed (${res.status})`);
      }
      if (!result.ok || !result.data.title) {
        update(item.id, { status: "failed", message: result.message });
        return;
      }
      update(item.id, { status: "saving", title: result.data.title });
      const affiliate = result.data.affiliate_url || result.data.source_url || item.url;
      const save = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.data.title,
          description: result.data.description,
          price: result.data.price,
          original_price: result.data.original_price,
          currency: result.data.currency,
          images: result.data.images,
          store: result.data.store,
          source_url: result.data.source_url,
          affiliate_url: affiliate,
          gender: result.data.gender,
          category_id: result.data.category_id,
          is_published: false,
          is_featured: false,
          rehost_images: true,
        }),
      });
      const saved = await save.json().catch(() => ({}));
      if (!save.ok) throw new Error(saved.error ?? "Save failed");
      const needsReview = result.quality !== "complete" || !result.data.affiliate_url;
      update(item.id, {
        status: needsReview ? "review" : "saved",
        productId: saved.product.id,
        message: needsReview
          ? [result.data.price === null && "price missing", !result.data.images.length && "no images", !result.data.affiliate_url && "affiliate link missing"]
              .filter(Boolean)
              .join(", ") || "check details"
          : "Draft saved: review and publish",
      });
    } catch (e) {
      update(item.id, { status: "failed", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function run(queue: Item[]) {
    setRunning(true);
    let index = 0;
    const worker = async () => {
      while (index < queue.length) {
        const item = queue[index++];
        await processItem(item);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setRunning(false);
    router.refresh();
  }

  function start() {
    const parsed = parseLines(text).slice(0, 100);
    if (!parsed.length) return;
    const newItems: Item[] = parsed.map((p) => ({ id: nextId.current++, url: p.url, affiliate: p.affiliate, status: "queued" }));
    setItems((list) => [...list, ...newItems]);
    setText("");
    void run(newItems);
  }

  function retryFailed() {
    const failed = items.filter((i) => i.status === "failed");
    failed.forEach((f) => update(f.id, { status: "queued", message: undefined }));
    void run(failed);
  }

  const counts = items.reduce<Record<ItemStatus, number>>(
    (acc, it) => ({ ...acc, [it.status]: acc[it.status] + 1 }),
    { queued: 0, reading: 0, saving: 0, saved: 0, review: 0, failed: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <Label htmlFor="bulk-links">One product per line: product link, then (optionally) your affiliate link</Label>
        <Textarea
          id="bulk-links"
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"https://www.aliexpress.com/item/1005….html https://s.click.aliexpress.com/e/…\nhttps://us.shein.com/…-p-123456.html https://onelink.shein.com/…"}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={start} disabled={running || !text.trim()}>
            {running ? <Loader2 className="animate-spin" /> : <Play />} Start import ({parseLines(text).length})
          </Button>
          {counts.failed > 0 && !running && (
            <Button variant="outline" onClick={retryFailed}>
              <RotateCcw /> Retry failed ({counts.failed})
            </Button>
          )}
          {items.length > 0 && !running && (
            <Button variant="ghost" onClick={() => setItems([])}>
              <Trash2 /> Clear list
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Everything is saved as a draft so you can review it before publishing. Max 100 links per batch.</p>
        </div>
      </div>

      {items.length > 0 && (
        <section aria-live="polite" className="rounded-2xl border border-white/10">
          <header className="flex flex-wrap gap-3 border-b border-white/10 px-4 py-2.5 text-xs text-muted-foreground">
            <span>{items.length} links</span>
            <span>· {counts.queued + counts.reading + counts.saving} in progress</span>
            <span>· {counts.saved} ready</span>
            <span>· {counts.review} need review</span>
            <span>· {counts.failed} failed</span>
          </header>
          <ul className="divide-y divide-white/5">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-3 px-4 py-3 text-sm" data-testid="bulk-item" data-status={it.status}>
                <StatusIcon status={it.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{it.title ?? it.url}</p>
                  {it.title && <p className="truncate text-xs text-muted-foreground">{it.url}</p>}
                  <p
                    className={cn(
                      "text-xs",
                      it.status === "failed" ? "text-red-300" : it.status === "review" ? "text-amber-200" : "text-muted-foreground",
                    )}
                  >
                    {labelFor(it.status)}
                    {it.message ? `: ${it.message}` : ""}
                  </p>
                </div>
                {it.productId && (
                  <Link href={`/admin/products/${it.productId}`} className="shrink-0 text-xs underline">
                    Review
                  </Link>
                )}
                {it.status === "failed" && (
                  <Link
                    href={`/admin/products/new?source=${encodeURIComponent(it.url)}&affiliate=${encodeURIComponent(it.affiliate)}`}
                    className="shrink-0 text-xs underline"
                  >
                    Add manually
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function labelFor(s: ItemStatus) {
  return { queued: "Queued", reading: "Reading page", saving: "Saving draft", saved: "Draft saved", review: "Draft saved, needs review", failed: "Failed" }[s];
}

function StatusIcon({ status }: { status: ItemStatus }) {
  const cls = "mt-0.5 size-4 shrink-0";
  if (status === "queued") return <Circle className={cn(cls, "text-muted-foreground")} />;
  if (status === "reading" || status === "saving") return <Loader2 className={cn(cls, "animate-spin text-sky-300")} />;
  if (status === "saved") return <CheckCircle2 className={cn(cls, "text-emerald-300")} />;
  if (status === "review") return <AlertTriangle className={cn(cls, "text-amber-300")} />;
  return <XCircle className={cn(cls, "text-red-300")} />;
}
