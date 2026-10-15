import type { Fit, Slot } from "@/lib/picks";
import type { FabricKind } from "@/lib/fitting/garment-texture";

/**
 * How a saved piece is worn on the 3D mannequin: which draped garment model, cut how (sleeve length,
 * cropped hem, trouser length) and how loose. Read from the piece's name and category, and, for trousers
 * in a photo, from how wide the legs are; the visitor can override the fit.
 *
 * The garment models (public/models/garments/<body>/<mesh>.glb) are cloth simulations made in Blender
 * (see scripts/garments/README.md): fitted / regular / oversized tops, slim / straight / baggy trousers…
 */

export type Mesh =
  | "top_fitted"
  | "top_regular"
  | "top_oversized"
  | "outer_regular"
  | "outer_puffer"
  | "bottom_slim"
  | "bottom_straight"
  | "bottom_baggy"
  | "skirt_mini"
  | "skirt_midi"
  | "dress_mini"
  | "dress_long"
  | "shoes"
  | "hat_beanie"
  | "hat_cap"
  | "bag";

export type GarmentStyle = {
  mesh: Mesh;
  fabric: FabricKind;
  /** How far the sleeves reach: 1 to the wrist, about 0.25 a T-shirt sleeve, -1 none at all (not even a cap). */
  sleeve: number;
  /** Hide everything below this height (fraction of body height): cropped tops, shorts, low shoes. */
  below: number;
  /** Hide everything above this height: tube tops, low shoes. */
  above: number;
  /** The print shows on the back too (trousers, skirts: same fabric all round). */
  backPrint: boolean;
  /** Fabric look: soft knit, denim / twill, shiny nylon (puffers), leather (shoes). */
  finish: "knit" | "denim" | "nylon" | "leather";
  /** The fit can be changed (tops and trousers). */
  fitAdjustable: boolean;
};

/** Hem heights of the models (fraction of body height), for layering. */
export const MESH_HEM: Partial<Record<Mesh, number>> = {
  top_fitted: 0.53,
  top_regular: 0.512,
  top_oversized: 0.488,
  outer_regular: 0.505,
  outer_puffer: 0.525,
};

const has = (t: string, re: RegExp) => re.test(t);

export function styleFor(slot: Slot, title: string, category: string | null, fit: Fit, legRatio: number | null): GarmentStyle | null {
  const t = `${title} ${category ?? ""}`.toLowerCase();
  const base = { sleeve: 1, below: 0, above: 2, backPrint: false, finish: "knit" as const, fitAdjustable: false };

  if (slot === "top") {
    const loose = has(t, /oversi[sz]|boxy|loose|baggy|drop.?shoulder|relaxed|slouch/);
    const close = has(t, /\bcrop|fitted|slim|bodycon|baby.?tee|corset|tank|cami|tube|bandeau|bustier|halter|ribbed|second.?skin|skinny/);
    const pick = fit === "close" ? "top_fitted" : fit === "regular" ? "top_regular" : fit === "loose" ? "top_oversized" : loose ? "top_oversized" : close ? "top_fitted" : "top_regular";
    const none = has(t, /tank|cami|halter|sleeveless|\btube|bandeau|corset|bustier|strapless|bralette|vest top|camisole/);
    const long = has(t, /long.?sleeve|longsleeve|hoodie|sweatshirt|sweater|jumper|cardigan|turtleneck|thermal|pullover|knit top/);
    const cropped = has(t, /\bcrop|cropped|baby.?tee|bralette|bandeau|\btube/);
    const tube = has(t, /\btube|bandeau|strapless|bustier/);
    return {
      ...base,
      mesh: pick,
      fabric: "top",
      sleeve: none ? -1 : long ? 1 : 0.26,
      below: cropped ? 0.622 : 0,
      above: tube ? 0.712 : 2,
      fitAdjustable: true,
    };
  }

  if (slot === "outer") {
    const puffer = has(t, /puffer|down\b|padded|quilt|bubble/);
    const vest = has(t, /\bvest|gilet|sleeveless/);
    return { ...base, mesh: puffer ? "outer_puffer" : "outer_regular", fabric: "top", sleeve: vest ? -1 : 1, finish: puffer ? "nylon" : "knit" };
  }

  if (slot === "dress") {
    const long = has(t, /maxi|midi|long|gown|floor/);
    return { ...base, mesh: long ? "dress_long" : "dress_mini", fabric: "dress", backPrint: true };
  }

  if (slot === "bottom") {
    if (has(t, /skirt/)) {
      const long = has(t, /midi|maxi|long/);
      return { ...base, mesh: long ? "skirt_midi" : "skirt_mini", fabric: "skirt", backPrint: true };
    }
    const baggyWord = has(t, /baggy|wide|loose|oversi[sz]|flare|palazzo|parachute|cargo|balloon|barrel|jorts|skater|hip.?hop/);
    const slimWord = has(t, /skinny|slim|legging|pencil|bodycon|tight|stretch|jegging/);
    const auto = baggyWord ? "bottom_baggy" : slimWord ? "bottom_slim" : legRatio !== null && legRatio > 0.98 ? "bottom_baggy" : legRatio !== null && legRatio < 0.68 ? "bottom_slim" : "bottom_straight";
    const mesh = fit === "close" ? "bottom_slim" : fit === "regular" ? "bottom_straight" : fit === "loose" ? "bottom_baggy" : auto;
    const shorts = has(t, /shorts|jorts|bermuda|hot.?pants/);
    const knee = has(t, /bermuda|jorts|long shorts|knee/);
    const capri = has(t, /capri|cropped|ankle/);
    return {
      ...base,
      mesh,
      fabric: "pants",
      below: shorts ? (knee ? 0.29 : 0.355) : capri ? 0.1 : 0,
      backPrint: true,
      finish: has(t, /jean|denim|cargo|twill|jorts/) ? "denim" : "knit",
      fitAdjustable: true,
    };
  }

  if (slot === "feet") {
    const knee = has(t, /knee|thigh|over.?the|tall boot/);
    const boot = has(t, /boot/);
    const ankle = has(t, /ankle|chelsea|combat/);
    const low = has(t, /sandal|slide|heel|pump|flat|loafer|mule|slipper|ballet/);
    const above = knee ? 0.186 : boot && !ankle ? 0.16 : boot || ankle ? 0.09 : low ? 0.045 : 0.07;
    return { ...base, mesh: "shoes", fabric: "shoes", above, backPrint: true, finish: "leather" };
  }

  if (slot === "head") {
    if (has(t, /glass|shades|goggle|earring|clip|necklace|choker|mask/)) return null; // printed on, see mannequin-scene
    if (has(t, /\bcap\b|baseball|trucker|snapback|visor/)) return { ...base, mesh: "hat_cap", fabric: "hat", backPrint: true };
    if (has(t, /beanie|bonnet|knit hat|\bhat\b|bucket|balaclava|beret/)) return { ...base, mesh: "hat_beanie", fabric: "hat", backPrint: true };
    return null; // glasses, earrings, clips: printed on, see mannequin-scene
  }

  if (slot === "hand") {
    if (!has(t, /bag|purse|tote|clutch|pouch|baguette|satchel|backpack|wallet/)) return null; // belts, keyrings…: not shown
    return { ...base, mesh: "bag", fabric: "bag", sleeve: 1, finish: "leather" };
  }
  return null;
}
