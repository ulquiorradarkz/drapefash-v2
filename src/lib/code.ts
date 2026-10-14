/**
 * Item IDs ("codes"): short labels such as DRP-014 that the owner gives each piece.
 * Shared by the dashboard (validation), the database layer (lookup) and the storefront (search).
 */

export const CODE_PREFIX = "DRP";
export const CODE_PATTERN = /^[A-Z0-9]([A-Z0-9-]{0,22}[A-Z0-9])?$/;

/** "drp 14", " Drp_014 " → "DRP-14" / "DRP-014". Returns "" when nothing usable is left. */
export function normalizeCode(input: string): string {
  return input
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s_./]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export function isCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

/**
 * The codes a search term could mean, most likely first. "14" also tries DRP-014 and DRP-14,
 * so a visitor can type just the number they saw.
 */
export function codeCandidates(term: string): string[] {
  const raw = term.trim();
  if (!raw || raw.length > 24 || /\s.*\s/.test(raw)) return [];
  const code = normalizeCode(raw);
  if (!isCode(code)) return [];
  const out = [code];
  if (/^\d{1,6}$/.test(code)) {
    out.push(`${CODE_PREFIX}-${code.padStart(3, "0")}`, `${CODE_PREFIX}-${code}`);
  }
  // "DRP2", "DRP-2", "drp 2" → DRP-002 and DRP-2 (and the joined form).
  const prefixed = /^([A-Z]+)-?(\d+)$/.exec(code);
  if (prefixed) {
    const [, letters, digits] = prefixed;
    out.push(`${letters}-${digits.padStart(3, "0")}`, `${letters}-${digits}`, `${letters}${digits}`);
  }
  return [...new Set(out)];
}

/** Next free code after the highest DRP-number already used. */
export function nextCode(used: (string | null | undefined)[]): string {
  let max = 0;
  for (const c of used) {
    const m = c ? new RegExp(`^${CODE_PREFIX}-(\\d+)$`).exec(c) : null;
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${CODE_PREFIX}-${String(max + 1).padStart(3, "0")}`;
}
