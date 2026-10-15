/** Classes of the clothes segmentation model (ATR), shared by the server that writes masks and the fitting room. */
export const LABEL = {
  background: 0,
  hat: 1,
  hair: 2,
  sunglasses: 3,
  upper: 4,
  skirt: 5,
  pants: 6,
  dress: 7,
  belt: 8,
  leftShoe: 9,
  rightShoe: 10,
  face: 11,
  leftLeg: 12,
  rightLeg: 13,
  leftArm: 14,
  rightArm: 15,
  bag: 16,
  scarf: 17,
} as const;

/** Stored masks hold class × LABEL_STEP in a grey PNG. */
export const LABEL_STEP = 14;

/** Everything a person can wear, for when the expected class is missing (a top labelled as a dress…). */
export const CLOTHING = [LABEL.upper, LABEL.skirt, LABEL.pants, LABEL.dress, LABEL.belt, LABEL.scarf];

/** Short, stable cache key for an image address (FNV-1a), so a new product photo gets a new mask URL. */
export function imageKey(src: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Address of a product's mask (the first product picture), relative to the site. */
export function maskUrl(slug: string, src: string): string {
  return `/api/fitting/${encodeURIComponent(slug)}?v=${imageKey(src)}`;
}
