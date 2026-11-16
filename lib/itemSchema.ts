import { z } from "zod";

const url = z.url({ protocol: /^https?$/ }).nullable().optional();

const base = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  sizes: z
    .array(z.string().trim().min(1).max(20))
    .min(1)
    .max(12)
    .refine((a) => new Set(a).size === a.length, "sizes must be unique"),
  selectedSize: z.string(),
  typicalPrice: z.number().positive(),
  imageUrl: url,
  sourceUrl: url,
});

export const itemSchema = base.refine((i) => i.sizes.includes(i.selectedSize), {
  path: ["selectedSize"],
  message: "selectedSize must be one of sizes",
});
export const itemPatchSchema = base.partial();
export const idParams = z.object({ id: z.string().min(1).max(64) });
