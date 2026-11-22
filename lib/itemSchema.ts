import { z } from "zod";

/** Most items one user can keep. POST /api/items answers 409 item_limit at this count. */
export const MAX_ITEMS_PER_USER = 100;

const url = z.url({ protocol: /^https?$/ }).nullable().optional();

/** Fits Decimal(10,2): positive, at most 99999.99 and whole cents. */
export const moneySchema = z
  .number()
  .positive()
  .max(99999.99)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "at most 2 decimal places");

// The form splits sizes on commas, so a comma inside one size could never be edited back.
const size = z.string().trim().min(1).max(20).refine((s) => !s.includes(","), "a size cannot contain a comma");

const base = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  sizes: z
    .array(size)
    .min(1)
    .max(12)
    .refine((a) => new Set(a).size === a.length, "sizes must be unique"),
  selectedSize: size,
  typicalPrice: moneySchema,
  imageUrl: url,
  sourceUrl: url,
});

export const itemSchema = base.refine((i) => i.sizes.includes(i.selectedSize), {
  path: ["selectedSize"],
  message: "selectedSize must be one of sizes",
});
export const itemPatchSchema = base.partial();
export const idParams = z.object({ id: z.string().min(1).max(64) });
