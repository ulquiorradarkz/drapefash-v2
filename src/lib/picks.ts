"use client";

import { useSyncExternalStore } from "react";

/**
 * "Picks": pieces a visitor saves with the star. Kept in this browser only (localStorage),
 * never sent to the server. The fitting room reads them, plus the outfit on the mannequin.
 */

export type PickItem = {
  slug: string;
  title: string;
  image: string | null;
  price: number | null;
  currency: string;
  store: string;
  /** Category slug, used to guess where the piece goes on the mannequin. */
  category: string | null;
  code: string | null;
  savedAt: number;
};

export const SLOTS = ["head", "outer", "top", "dress", "bottom", "feet", "hand"] as const;
export type Slot = (typeof SLOTS)[number];

export type Form = "women" | "men";

export type Outfit = {
  form: Form;
  /** Which saved piece is on which part of the mannequin. */
  wear: Partial<Record<Slot, string>>;
};

const PICKS_KEY = "drape_picks_v1";
const OUTFIT_KEY = "drape_outfit_v1";
const MAX_PICKS = 60;
const EVENT = "drape:picks";

const EMPTY_PICKS: PickItem[] = [];
const EMPTY_OUTFIT: Outfit = { form: "women", wear: {} };

let picksCache: PickItem[] | null = null;
let outfitCache: Outfit | null = null;
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked (private mode): the change still lives in memory for this visit */
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PICKS_KEY) picksCache = null;
    if (e.key === OUTFIT_KEY) outfitCache = null;
    if (e.key === PICKS_KEY || e.key === OUTFIT_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function isPick(v: unknown): v is PickItem {
  return !!v && typeof v === "object" && typeof (v as PickItem).slug === "string" && typeof (v as PickItem).title === "string";
}

export function getPicks(): PickItem[] {
  if (typeof window === "undefined") return EMPTY_PICKS;
  if (!picksCache) {
    const raw = read<unknown>(PICKS_KEY, []);
    picksCache = Array.isArray(raw) ? raw.filter(isPick) : [];
  }
  return picksCache;
}

export function getOutfit(): Outfit {
  if (typeof window === "undefined") return EMPTY_OUTFIT;
  if (!outfitCache) {
    const raw = read<Partial<Outfit>>(OUTFIT_KEY, EMPTY_OUTFIT);
    outfitCache = { form: raw.form === "men" ? "men" : "women", wear: raw.wear && typeof raw.wear === "object" ? raw.wear : {} };
  }
  return outfitCache;
}

function setPicks(next: PickItem[]) {
  picksCache = next.slice(0, MAX_PICKS);
  write(PICKS_KEY, picksCache);
  // Pieces that are no longer saved come off the mannequin too.
  const outfit = getOutfit();
  const slugs = new Set(picksCache.map((p) => p.slug));
  const wear = Object.fromEntries(Object.entries(outfit.wear).filter(([, slug]) => slug && slugs.has(slug)));
  if (Object.keys(wear).length !== Object.keys(outfit.wear).length) setOutfit({ ...outfit, wear });
  emit();
}

export function setOutfit(next: Outfit) {
  outfitCache = next;
  write(OUTFIT_KEY, next);
  emit();
}

export function isPicked(slug: string): boolean {
  return getPicks().some((p) => p.slug === slug);
}

/** Adds or removes a piece. Returns true when it is now saved. */
export function togglePick(item: Omit<PickItem, "savedAt">): boolean {
  const picks = getPicks();
  const saved = picks.some((p) => p.slug === item.slug);
  if (saved) setPicks(picks.filter((p) => p.slug !== item.slug));
  else setPicks([{ ...item, savedAt: Date.now() }, ...picks]);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { saved: !saved, title: item.title } }));
  return !saved;
}

export function removePick(slug: string) {
  setPicks(getPicks().filter((p) => p.slug !== slug));
}

export function clearPicks() {
  setPicks([]);
  setOutfit({ ...getOutfit(), wear: {} });
}

/** Replaces saved copies with fresh data from the server; pieces no longer listed are dropped. */
export function refreshPicks(fresh: Omit<PickItem, "savedAt">[]) {
  const bySlug = new Map(fresh.map((p) => [p.slug, p]));
  const next = getPicks()
    .filter((p) => bySlug.has(p.slug))
    .map((p) => ({ ...p, ...bySlug.get(p.slug)!, savedAt: p.savedAt }));
  setPicks(next);
}

export function wearPick(slug: string, slot: Slot) {
  const outfit = getOutfit();
  const wear: Outfit["wear"] = { ...outfit.wear };
  // A piece is worn in one place at a time.
  for (const s of SLOTS) if (wear[s] === slug) delete wear[s];
  wear[slot] = slug;
  // A dress replaces top and bottom; a top or bottom replaces the dress.
  if (slot === "dress") {
    delete wear.top;
    delete wear.bottom;
  }
  if (slot === "top" || slot === "bottom") delete wear.dress;
  setOutfit({ ...outfit, wear });
}

export function takeOff(slug: string) {
  const outfit = getOutfit();
  const wear = Object.fromEntries(Object.entries(outfit.wear).filter(([, s]) => s !== slug));
  setOutfit({ ...outfit, wear });
}

export function undress() {
  setOutfit({ ...getOutfit(), wear: {} });
}

export function setForm(form: Form) {
  setOutfit({ ...getOutfit(), form });
}

/** Where a piece most likely goes on the mannequin, from its category and name. */
export function defaultSlot(item: Pick<PickItem, "category" | "title">): Slot {
  const c = item.category ?? "";
  const t = item.title.toLowerCase();
  if (c === "footwear" || /\b(boot|sneaker|shoe|sandal|slide|heel|loafer|trainer)s?\b/.test(t)) return "feet";
  if (c === "dresses" || /\bdress\b/.test(t)) return "dress";
  if (c === "outerwear" || /\b(jacket|coat|puffer|parka|blazer|windbreaker|vest|gilet)\b/.test(t)) return "outer";
  if (c === "bottoms" || /\b(pants|trousers|jeans|skirt|shorts|cargo|leggings|flares?)\b/.test(t)) return "bottom";
  if (c === "accessories") {
    if (/\b(glasses|shades|sunglasses|cap|hat|beanie|clip|clips|earring|necklace|choker|headband|mask|visor)\b/.test(t)) return "head";
    return "hand";
  }
  return "top";
}

export function usePicks(): PickItem[] {
  return useSyncExternalStore(subscribe, getPicks, () => EMPTY_PICKS);
}

export function useOutfit(): Outfit {
  return useSyncExternalStore(subscribe, getOutfit, () => EMPTY_OUTFIT);
}

export function usePicked(slug: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getPicks().some((p) => p.slug === slug),
    () => false,
  );
}

/** Listen for saves and removals anywhere on the page (for the little notice). */
export function onPicksChange(handler: (detail: { saved: boolean; title: string }) => void) {
  const fn = (e: Event) => handler((e as CustomEvent<{ saved: boolean; title: string }>).detail);
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
