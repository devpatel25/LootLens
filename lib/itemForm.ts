import type { Item } from "@/lib/types";

export const CATEGORIES = [] as { value: string; label: string }[];

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

export function parseSizes(text: string): string[] {
  void text;
  return [];
}

export function formValuesFromItem(item: Item): ItemFormValues {
  void item;
  return EMPTY_FORM;
}

export function toItemBody(values: ItemFormValues): { ok: true; body: ItemBody } | { ok: false; errors: ItemFormErrors } {
  void values;
  return { ok: false, errors: {} };
}
