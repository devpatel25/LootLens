import { itemSchema } from "@/lib/itemSchema";
import type { Item } from "@/lib/types";

export const CATEGORIES = [
  { value: "shoes", label: "Shoes" },
  { value: "clothes", label: "Clothes" },
  { value: "tech", label: "Tech" },
  { value: "other", label: "Other" },
];

export type ItemFormValues = {
  name: string;
  category: string;
  sizes: string;
  selectedSize: string;
  typicalPrice: string;
  sourceUrl: string;
};

export type ItemBody = {
  name: string;
  category: string;
  sizes: string[];
  selectedSize: string;
  typicalPrice: number;
  sourceUrl: string | null;
};

export type ItemFormErrors = Partial<Record<keyof ItemFormValues, string>>;

export const EMPTY_FORM: ItemFormValues = { name: "", category: "", sizes: "", selectedSize: "", typicalPrice: "", sourceUrl: "" };

const MESSAGES: Record<keyof ItemFormValues, string> = {
  name: "Enter a name.",
  category: "Pick a category.",
  sizes: "Enter at least one size.",
  selectedSize: "Pick your size from the sizes.",
  typicalPrice: "Enter a price like 49.99.",
  sourceUrl: "Enter a full link that starts with https://",
};

/** "8, 9 ,10" -> ["8", "9", "10"]: trimmed, no blanks, no repeats, order kept. */
export function parseSizes(text: string): string[] {
  return [...new Set(text.split(",").map((s) => s.trim()).filter(Boolean))];
}

export function formValuesFromItem(item: Item): ItemFormValues {
  return {
    name: item.name,
    category: item.category,
    sizes: item.sizes.join(", "),
    selectedSize: item.selectedSize,
    typicalPrice: String(item.typicalPrice),
    sourceUrl: item.sourceUrl ?? "",
  };
}

/** Validates with the same zod schema the API uses, and maps problems to one plain message per field. */
export function toItemBody(values: ItemFormValues): { ok: true; body: ItemBody } | { ok: false; errors: ItemFormErrors } {
  const price = values.typicalPrice.trim();
  const body: ItemBody = {
    name: values.name.trim(),
    category: values.category.trim(),
    sizes: parseSizes(values.sizes),
    selectedSize: values.selectedSize.trim(),
    typicalPrice: price === "" ? Number.NaN : Number(price),
    sourceUrl: values.sourceUrl.trim() || null,
  };
  const r = itemSchema.safeParse(body);
  if (r.success) return { ok: true, body };

  const errors: ItemFormErrors = {};
  for (const issue of r.error.issues) {
    const field = issue.path[0] as keyof ItemFormValues | undefined;
    if (field && field in MESSAGES) errors[field] = MESSAGES[field];
  }
  // The "size must be in sizes" rule only runs once the fields parse, so check it here too.
  if (body.selectedSize && body.sizes.length > 0 && !body.sizes.includes(body.selectedSize)) {
    errors.selectedSize = MESSAGES.selectedSize;
  }
  if (!body.selectedSize) errors.selectedSize = MESSAGES.selectedSize;
  return { ok: false, errors };
}
