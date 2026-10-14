import { z } from "zod";
import { GENDERS, STORES, TRANSLATED_LOCALES, type ProductTranslations } from "@/lib/types";
import { isCode, normalizeCode } from "@/lib/code";

/** Item ID, stored in capitals ("drp 14" → "DRP-14"). Empty means "no ID yet". */
const itemCode = z
  .string()
  .max(40)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v || !v.trim()) return null;
    const code = normalizeCode(v);
    if (!isCode(code)) {
      ctx.addIssue({ code: "custom", message: "Use 2–24 letters, numbers or dashes, e.g. DRP-014" });
      return z.NEVER;
    }
    return code;
  });

/** Name and description in the other six languages. Empty fields are dropped. */
const translations = z
  .partialRecord(
    z.enum(TRANSLATED_LOCALES),
    z.object({
      title: z.string().trim().max(300).optional(),
      description: z.string().trim().max(5000).optional(),
    }),
  )
  .optional()
  .transform((value) => {
    const out: ProductTranslations = {};
    for (const [locale, t] of Object.entries(value ?? {}) as [keyof ProductTranslations, { title?: string; description?: string }][]) {
      const entry = { ...(t.title ? { title: t.title } : {}), ...(t.description ? { description: t.description } : {}) };
      if (Object.keys(entry).length) out[locale] = entry;
    }
    return out;
  });

const httpUrl = z
  .string()
  .trim()
  .url("Enter a full link starting with https://")
  .refine((v) => /^https?:\/\//i.test(v), "Link must start with http:// or https://");

const optionalHttpUrl = z
  .union([httpUrl, z.literal("")])
  .optional()
  .transform((v) => (v ? v : null));

const money = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Enter a valid price" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

export const productInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  code: itemCode,
  slug: z
    .string()
    .trim()
    .max(90)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and dashes")
    .optional()
    .default(""),
  description: z.string().trim().max(5000).optional().default(""),
  price: money,
  original_price: money,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "3-letter currency code, e.g. USD")
    .default("USD"),
  images: z.array(httpUrlOrPath()).max(12).default([]),
  category_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  store: z.enum(STORES).default("other"),
  source_url: optionalHttpUrl,
  affiliate_url: httpUrl,
  gender: z.enum(GENDERS).default("unisex"),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  translations,
  rehost_images: z.boolean().optional().default(true),
});

function httpUrlOrPath() {
  return z
    .string()
    .trim()
    .refine((v) => /^https?:\/\//i.test(v) || /^\/[\w\-./]+$/.test(v), "Invalid image URL");
}

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductParsed = z.output<typeof productInputSchema>;

export const productPatchSchema = productInputSchema.partial().extend({
  rehost_images: z.boolean().optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and dashes")
    .optional()
    .default(""),
  gender: z.enum(GENDERS).default("unisex"),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export const importRequestSchema = z.object({
  url: z.string().trim().min(1, "Paste a product link").max(2000),
  affiliate_url: z.string().trim().max(2000).optional().default(""),
});
