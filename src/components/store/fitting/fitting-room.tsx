"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { StarIcon } from "@/components/store/pick-button";
import { ShopNowButton } from "@/components/store/shop-now-button";
import { StoreBadge } from "@/components/store/store-badge";
import type { Locale } from "@/i18n/config";
import { fmt, pluralize } from "@/i18n/format";
import type { Plural } from "@/i18n/types";
import { formatPrice } from "@/lib/format";
import {
  FITS,
  SLOTS,
  clearPicks,
  defaultSlot,
  getPicks,
  refreshPicks,
  removePick,
  setForm,
  takeOff,
  togglePick,
  undress,
  setFit,
  useOutfit,
  usePicks,
  wearPick,
  type Fit,
  type PickItem,
  type Slot,
} from "@/lib/picks";
import { styleFor } from "@/lib/fitting/styles";
import { STORE_META } from "@/lib/stores";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Turn, WornPiece } from "./mannequin-scene";

const MannequinScene = dynamic(() => import("./mannequin-scene"), { ssr: false });

export type FittingLabels = {
  picks: {
    title: string;
    remove: string;
    count: Plural;
    empty: string;
    note: string;
    clear: string;
    total: string;
    browse: string;
  };
  fitting: {
    putOn: string;
    takeOff: string;
    wearAs: string;
    fit: string;
    fits: Record<Fit, string>;
    slots: Record<Slot, string>;
    form: string;
    formWomen: string;
    formMen: string;
    undress: string;
    wearing: string;
    lookTotal: string;
    shopLook: string;
    loading: string;
    flat: string;
    turnHint: string;
    dropHint: string;
    canvasLabel: string;
    canvasEmpty: string;
    nothingOn: string;
  };
  shopOn: string;
  newTab: string;
  otherStore: string;
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Where on the stage each slot's tag sits in the flat (no-3D) layout, top to bottom. */
const FLAT_ORDER: Slot[] = ["head", "outer", "top", "dress", "bottom", "hand", "feet"];

export function FittingRoom({
  locale,
  labels,
  wear,
  shopHref,
}: {
  locale: Locale;
  labels: FittingLabels;
  /** ?wear=slug from a product page's "Try it on". */
  wear?: string;
  shopHref: string;
}) {
  const picks = usePicks();
  const outfit = useOutfit();
  const router = useRouter();
  const [gl, setGl] = useState<"unknown" | "yes" | "no">("unknown");
  const [loadedForm, setLoadedForm] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [dropping, setDropping] = useState(false);
  const turn = useRef<Turn>({ angle: 0, target: 0, dragging: false, idleSince: 0 });
  const drag = useRef<{ x: number; id: number } | null>(null);
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    setGl(hasWebGL() ? "yes" : "no");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Fresh titles (in this language), prices and pictures for the saved pieces; unlisted ones drop out.
  useEffect(() => {
    const slugs = getPicks().map((p) => p.slug);
    if (!slugs.length) return;
    const ctrl = new AbortController();
    fetch(`/api/picks?locale=${locale}&slugs=${encodeURIComponent(slugs.join(","))}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && Array.isArray(json.items)) refreshPicks(json.items);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [locale]);

  // "Try it on" from a product page: save the piece if needed, then put it on.
  useEffect(() => {
    if (!wear || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(wear)) return;
    const done = () => router.replace(window.location.pathname, { scroll: false });
    const existing = getPicks().find((p) => p.slug === wear);
    if (existing) {
      wearPick(existing.slug, defaultSlot(existing));
      done();
      return;
    }
    fetch(`/api/picks?locale=${locale}&slugs=${encodeURIComponent(wear)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const item = json?.items?.[0];
        if (item) {
          togglePick(item);
          wearPick(item.slug, defaultSlot(item));
        }
      })
      .catch(() => {})
      .finally(done);
  }, [wear, locale, router]);

  const bySlug = useMemo(() => new Map(picks.map((p) => [p.slug, p])), [picks]);
  const wornEntries = useMemo(
    () =>
      SLOTS.flatMap((slot) => {
        const slug = outfit.wear[slot];
        const p = slug ? bySlug.get(slug) : undefined;
        return p ? [{ slot, pick: p }] : [];
      }),
    [outfit.wear, bySlug],
  );
  const worn: WornPiece[] = useMemo(
    () =>
      wornEntries
        .filter((w) => w.pick.image)
        .map((w) => ({
          slot: w.slot,
          slug: w.pick.slug,
          src: w.pick.image as string,
          title: w.pick.name ?? w.pick.title,
          category: w.pick.category,
          fit: outfit.fit?.[w.slot] ?? "auto",
        })),
    [wornEntries, outfit.fit],
  );
  const slotOf = (slug: string) => SLOTS.find((s) => outfit.wear[s] === slug);

  const totals = useMemo(() => {
    const sums = new Map<string, number>();
    for (const w of wornEntries) if (w.pick.price !== null) sums.set(w.pick.currency, (sums.get(w.pick.currency) ?? 0) + w.pick.price);
    return [...sums.entries()].map(([currency, sum]) => formatPrice(sum, currency, locale));
  }, [wornEntries, locale]);

  const storeName = (s: string) => (s in STORE_META && s !== "other" ? STORE_META[s as Store].name : labels.otherStore);

  const onLoaded = useCallback((form: string) => setLoadedForm(form), []);
  // Switching form builds the other mannequin: the loading note shows until that one is there.
  const ready = loadedForm === outfit.form;

  const turnBy = useCallback((rad: number) => {
    turn.current.target += rad;
    turn.current.idleSince = performance.now();
    redraw.current();
  }, []);

  const canvasLabel = wornEntries.length
    ? fmt(labels.fitting.canvasLabel, { list: wornEntries.map((w) => `${labels.fitting.slots[w.slot]}: ${w.pick.title}`).join(", ") })
    : labels.fitting.canvasEmpty;

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
      {/* ---------------------------------------------------------------- the stage */}
      <div className="min-w-0 lg:col-span-7">
        <div
          role="img"
          aria-label={canvasLabel}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") turnBy(-0.35 * (document.documentElement.dir === "rtl" ? -1 : 1));
            else if (e.key === "ArrowRight") turnBy(0.35 * (document.documentElement.dir === "rtl" ? -1 : 1));
            else return;
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            drag.current = { x: e.clientX, id: e.pointerId };
            turn.current.dragging = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current || drag.current.id !== e.pointerId) return;
            const dx = e.clientX - drag.current.x;
            drag.current.x = e.clientX;
            turn.current.target += dx * 0.012;
            redraw.current();
          }}
          onPointerUp={(e) => {
            if (drag.current?.id === e.pointerId) drag.current = null;
            turn.current.dragging = false;
            turn.current.idleSince = performance.now();
          }}
          onPointerCancel={() => {
            drag.current = null;
            turn.current.dragging = false;
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("text/drape-slug")) {
              e.preventDefault();
              setDropping(true);
            }
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropping(false);
            const slug = e.dataTransfer.getData("text/drape-slug");
            const p = slug ? bySlug.get(slug) : undefined;
            if (p) wearPick(p.slug, defaultSlot(p));
          }}
          className={cn(
            "focus-ring relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden bg-paper-2 outline-offset-4 lg:aspect-auto lg:h-[min(82svh,860px)]",
            gl === "yes" && "cursor-grab active:cursor-grabbing",
            dropping && "ring-4 ring-accent ring-inset",
          )}
        >
          {gl === "yes" && (
            <MannequinScene
              form={outfit.form}
              worn={worn}
              turn={turn}
              reducedMotion={reduced}
              onReady={(fn) => {
                redraw.current = fn;
              }}
              onLoaded={onLoaded}
            />
          )}
          {gl === "no" && <FlatLook entries={wornEntries} labels={labels} empty={labels.fitting.nothingOn} />}
          {gl === "yes" && !ready && (
            <p className="absolute inset-0 grid place-items-center t-data text-ink-2" aria-hidden>
              {labels.fitting.loading}
            </p>
          )}

          {/* worn tags, like specimen labels */}
          <ul className="pointer-events-none absolute start-3 top-3 flex max-w-[70%] flex-col items-start gap-1.5" aria-hidden>
            {wornEntries.map((w) => (
              <li key={w.slot} className="tag max-w-full">
                <span className="text-grey">{labels.fitting.slots[w.slot]}</span>
                {w.pick.code && <span dir="ltr">{w.pick.code}</span>}
              </li>
            ))}
          </ul>
          <span className="tag pointer-events-none absolute bottom-3 end-3" lang="ja" aria-hidden>
            試着室 — 3D
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <fieldset className="flex items-center gap-1">
            <legend className="sr-only">{labels.fitting.form}</legend>
            {(["women", "men"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={outfit.form === f}
                onClick={() => setForm(f)}
                className={cn("btn btn-sm", outfit.form === f ? "btn-ink" : "btn-line")}
              >
                {f === "women" ? labels.fitting.formWomen : labels.fitting.formMen}
              </button>
            ))}
          </fieldset>
          <button type="button" onClick={undress} disabled={!wornEntries.length} className="btn btn-sm btn-line disabled:opacity-40">
            {labels.fitting.undress}
          </button>
        </div>
        <p className="mt-3 text-[14px] text-ink-2">
          {gl === "no" ? labels.fitting.flat : `${labels.fitting.turnHint} ${labels.fitting.dropHint}`}
        </p>
      </div>

      {/* ---------------------------------------------------------------- the panel */}
      <div className="flex min-w-0 flex-col gap-12 lg:col-span-5">
        <section aria-labelledby="wearing-title">
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <h2 id="wearing-title" className="font-display text-[clamp(34px,3.4vw,48px)] leading-none">
              {labels.fitting.wearing}
            </h2>
            {totals.length > 0 && (
              <p className="t-data">
                {labels.fitting.lookTotal}{" "}
                <bdi dir="ltr" className="font-semibold text-ink">
                  {totals.join(" + ")}
                </bdi>
              </p>
            )}
          </div>
          {wornEntries.length ? (
            <ul className="space-y-1">
              {wornEntries.map((w) => (
                <li key={w.slot} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <span className="w-20 shrink-0 t-data t-data-up text-ink-2">{labels.fitting.slots[w.slot]}</span>
                  <bdi className="min-w-0 flex-1 basis-32 truncate text-[length:var(--t-small)]">{w.pick.title}</bdi>
                  {styleFor(w.slot, w.pick.name ?? w.pick.title, w.pick.category, "auto", null)?.fitAdjustable && (
                    <>
                      <label htmlFor={`fit-${w.slot}`} className="sr-only">
                        {labels.fitting.fit}
                      </label>
                      <select
                        id={`fit-${w.slot}`}
                        value={outfit.fit?.[w.slot] ?? "auto"}
                        onChange={(e) => setFit(w.slot, e.target.value as Fit)}
                        className="field h-10 min-h-10 w-auto shrink-0 text-[14px]"
                      >
                        {FITS.map((f) => (
                          <option key={f} value={f}>
                            {labels.fitting.fit}: {labels.fitting.fits[f]}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button type="button" onClick={() => takeOff(w.pick.slug)} className="btn btn-sm btn-line shrink-0">
                    {labels.fitting.takeOff}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[length:var(--t-small)] text-ink-2">{labels.fitting.nothingOn}</p>
          )}
          {wornEntries.length > 0 && (
            <div className="mt-6">
              <p className="t-data t-data-up text-ink-2">{labels.fitting.shopLook}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {wornEntries.map((w) => (
                  <li key={w.slot}>
                    <ShopNowButton
                      slug={w.pick.slug}
                      size="sm"
                      variant="primary"
                      label={fmt(labels.shopOn, { store: storeName(w.pick.store) })}
                      newTabText={`${w.pick.title}, ${labels.newTab}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="picks-title">
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <h2 id="picks-title" className="font-display text-[clamp(34px,3.4vw,48px)] leading-none">
              {labels.picks.title}
            </h2>
            <p className="t-data text-ink-2" aria-live="polite">
              {pluralize(locale, labels.picks.count, picks.length)}
            </p>
          </div>
          {picks.length ? (
            <ul className="mt-2">
              {picks.map((p) => (
                <PickRow key={p.slug} pick={p} locale={locale} labels={labels} wornAs={slotOf(p.slug)} storeName={storeName(p.store)} />
              ))}
            </ul>
          ) : (
            <div className="mt-6 bg-paper-3 p-6">
              <StarIcon filled={false} className="size-8 text-ink" />
              <p className="mt-4 max-w-[40ch] text-[length:var(--t-small)]">{labels.picks.empty}</p>
              <Link href={shopHref} className="btn btn-primary mt-6">
                {labels.picks.browse}
              </Link>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[36ch] text-[14px] text-ink-2">{labels.picks.note}</p>
            {picks.length > 0 && (
              <button type="button" onClick={clearPicks} className="link-u focus-ring text-[14px] font-semibold">
                {labels.picks.clear}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PickRow({
  pick,
  locale,
  labels,
  wornAs,
  storeName,
}: {
  pick: PickItem;
  locale: Locale;
  labels: FittingLabels;
  wornAs: Slot | undefined;
  storeName: string;
}) {
  const [slot, setSlot] = useState<Slot>(wornAs ?? defaultSlot(pick));
  useEffect(() => {
    if (wornAs) setSlot(wornAs);
  }, [wornAs]);
  const id = `wear-${pick.slug}`;
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/drape-slug", pick.slug);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={cn("grid grid-cols-[72px_1fr] gap-3 px-2 py-4", wornAs && "bg-paper-2")}
    >
      <div className="relative aspect-[4/5] cursor-grab overflow-hidden bg-paper-3 active:cursor-grabbing">
        {pick.image && <SmartImage src={pick.image} alt="" fill sizes="72px" className="pointer-events-none object-cover" />}
        {wornAs && <span className="absolute inset-x-0 bottom-0 h-1 bg-ink" aria-hidden />}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {pick.code && (
                <span className="tag text-[11px]" dir="ltr">
                  {pick.code}
                </span>
              )}
              <StoreBadge store={(pick.store in STORE_META ? pick.store : "other") as Store} otherLabel={storeName} />
            </p>
            <p className="mt-1.5 line-clamp-2 text-[length:var(--t-small)] leading-snug">
              <bdi>{pick.title}</bdi>
            </p>
            {pick.price !== null && (
              <bdi dir="ltr" className="mt-1 block text-[14px] font-semibold tabular">
                {formatPrice(pick.price, pick.currency, locale)}
              </bdi>
            )}
          </div>
          <button
            type="button"
            onClick={() => removePick(pick.slug)}
            aria-label={`${labels.picks.remove}: ${pick.title}`}
            className="focus-ring grid size-10 shrink-0 place-items-center text-ink-2 hover:bg-ink hover:text-paper-3"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor={id} className="sr-only">
            {labels.fitting.wearAs}
          </label>
          <select
            id={id}
            value={slot}
            onChange={(e) => {
              const next = e.target.value as Slot;
              setSlot(next);
              if (wornAs) wearPick(pick.slug, next);
            }}
            className="field h-10 min-h-10 w-auto text-[14px]"
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {labels.fitting.wearAs}: {labels.fitting.slots[s]}
              </option>
            ))}
          </select>
          {wornAs ? (
            <button type="button" onClick={() => takeOff(pick.slug)} className="btn btn-sm btn-line">
              {labels.fitting.takeOff}
            </button>
          ) : (
            <button type="button" onClick={() => wearPick(pick.slug, slot)} className="btn btn-sm btn-primary">
              {labels.fitting.putOn}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Without WebGL: the look laid out flat, top to bottom, on the paper. */
function FlatLook({ entries, labels, empty }: { entries: { slot: Slot; pick: PickItem }[]; labels: FittingLabels; empty: string }) {
  const sorted = [...entries].sort((a, b) => FLAT_ORDER.indexOf(a.slot) - FLAT_ORDER.indexOf(b.slot));
  if (!sorted.length) return <p className="absolute inset-0 grid place-items-center p-8 text-center text-ink-2">{empty}</p>;
  return (
    <ul className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6">
      {sorted.map((e) => (
        <li key={e.slot} className="relative w-[46%] max-w-[260px]">
          <span className="relative block aspect-[5/4] overflow-hidden bg-paper-3">
            {e.pick.image && <SmartImage src={e.pick.image} alt={e.pick.title} fill sizes="260px" className="object-contain" />}
          </span>
          <span className="tag absolute start-0 top-0 text-[11px]">{labels.fitting.slots[e.slot]}</span>
        </li>
      ))}
    </ul>
  );
}
