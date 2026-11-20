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
  sourceUrl: "Enter a full link that starts with https:// or http://",
};

// Per issue, where one field can fail in more than one way (an old category can be longer than the list allows).
const BY_CODE: Partial<Record<keyof ItemFormValues, Partial<Record<string, string>>>> = {
  name: { too_big: "Use a name of at most 120 characters." },
  category: { too_big: "Use a category of at most 40 characters." },
};

/** What is wrong with the price text, or null when it is a valid price. */
function priceMessage(raw: string): string | null {
  if (!raw) return MESSAGES.typicalPrice;
  if (/^\d+\.\d{3,}$/.test(raw)) return "Use at most 2 decimal places, like 49.99.";
  if (/^-\d/.test(raw)) return "Enter a price above $0.";
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return "Enter numbers only, like 49.99, with no $ or commas.";
  const n = Number(raw);
  if (n <= 0) return "Enter a price above $0.";
  if (n > 99999.99) return "Enter a price of $99,999.99 or less.";
  return null;
}

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

/**
 * The sizes the form stands for. While the sizes text is still what the item showed, the item's own list is
 * kept, so a size saved with a comma before #67 ("42,5") is not split into two: the schema rejects it and the
 * user is asked to retype the sizes.
 */
export function sizesFrom(values: ItemFormValues, original?: Item): string[] {
  return original && values.sizes === formValuesFromItem(original).sizes ? original.sizes : parseSizes(values.sizes);
}

/** Same sizes, in any order. */
export function sameSizes(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s) => b.includes(s));
}

/**
 * The fields to PATCH: only those whose form text changed since the sheet opened. A name edit then cannot
 * undo sizes another tab added, which would also delete that size's watch and alerts.
 */
export function itemPatch(original: Item, values: ItemFormValues, body: ItemBody): Partial<ItemBody> {
  const before = formValuesFromItem(original);
  const patch: Partial<Record<keyof ItemBody, unknown>> = {};
  for (const key of Object.keys(before) as (keyof ItemFormValues)[]) {
    if (values[key] !== before[key]) patch[key] = body[key];
  }
  return patch as Partial<ItemBody>;
}

/** Validates with the same zod schema the API uses, and maps problems to one plain message per field. */
export function toItemBody(
  values: ItemFormValues,
  original?: Item,
): { ok: true; body: ItemBody } | { ok: false; errors: ItemFormErrors } {
  const price = values.typicalPrice.trim();
  const body: ItemBody = {
    name: values.name.trim(),
    category: values.category.trim(),
    sizes: sizesFrom(values, original),
    selectedSize: values.selectedSize.trim(),
    // Digits with up to two decimals only: Number() alone would accept "0x20" ($32) or "1e3" ($1,000).
    typicalPrice: /^\d+(\.\d{1,2})?$/.test(price) ? Number(price) : Number.NaN,
    sourceUrl: values.sourceUrl.trim() || null,
  };
  const r = itemSchema.safeParse(body);
  if (r.success) return { ok: true, body };

  const errors: ItemFormErrors = {};
  for (const issue of r.error.issues) {
    const field = issue.path[0] as keyof ItemFormValues | undefined;
    if (!field || !(field in MESSAGES) || errors[field]) continue;
    errors[field] = field === "typicalPrice" ? (priceMessage(price) ?? MESSAGES.typicalPrice) : (BY_CODE[field]?.[issue.code] ?? MESSAGES[field]);
    if (field === "sizes" && issue.code === "custom" && issue.path.length > 1) errors.sizes = "A size can't contain a comma. Retype the sizes with commas only between them.";
    else if (field === "sizes" && issue.path.length > 1) errors.sizes = "Each size can be at most 20 characters.";
    else if (field === "sizes" && issue.code === "too_big") errors.sizes = "Use at most 12 sizes.";
  }
  // The "size must be in sizes" rule only runs once the fields parse, so check it here too.
  if (body.selectedSize && body.sizes.length > 0 && !body.sizes.includes(body.selectedSize)) {
    errors.selectedSize = MESSAGES.selectedSize;
  }
  return { ok: false, errors };
}
