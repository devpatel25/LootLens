import { describe, expect, it } from "vitest";
import { CATEGORIES, EMPTY_FORM, formValuesFromItem, parseSizes, toItemBody, type ItemFormValues } from "@/lib/itemForm";
import type { Item } from "@/lib/types";

const good: ItemFormValues = {
  name: "  Trail shoes ",
  category: "shoes",
  sizes: "8, 9 ,10",
  selectedSize: "9",
  typicalPrice: "120.50",
  sourceUrl: "",
};

describe("parseSizes", () => {
  it("splits on commas, trims, drops blanks and repeats, keeps order", () => {
    expect(parseSizes(" 8, 9,,10 , 9 ")).toEqual(["8", "9", "10"]);
    expect(parseSizes("")).toEqual([]);
    expect(parseSizes("One size")).toEqual(["One size"]);
  });
});

describe("CATEGORIES", () => {
  it("covers what the seed and stories use", () => {
    expect(CATEGORIES.map((c) => c.value)).toEqual(["shoes", "clothes", "tech", "other"]);
  });
});

describe("toItemBody", () => {
  it("builds the API body from valid input", () => {
    expect(toItemBody(good)).toEqual({
      ok: true,
      body: { name: "Trail shoes", category: "shoes", sizes: ["8", "9", "10"], selectedSize: "9", typicalPrice: 120.5, sourceUrl: null },
    });
  });

  it("keeps a product link", () => {
    const r = toItemBody({ ...good, sourceUrl: "https://example.com/p/1" });
    expect(r.ok && r.body.sourceUrl).toBe("https://example.com/p/1");
  });

  it("reports one plain message per bad field", () => {
    const r = toItemBody({ ...EMPTY_FORM, sourceUrl: "ftp://x" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual({
      name: "Enter a name.",
      category: "Pick a category.",
      sizes: "Enter at least one size.",
      selectedSize: "Pick your size from the sizes.",
      typicalPrice: "Enter a price like 49.99.",
      sourceUrl: "Enter a full link that starts with https://",
    });
  });

  it("rejects a saved size that is not in the list", () => {
    const r = toItemBody({ ...good, selectedSize: "11" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ selectedSize: "Pick your size from the sizes." });
  });

  it("explains too many sizes and too-long sizes", () => {
    const many = Array.from({ length: 13 }, (_, i) => String(i + 1)).join(", ");
    const r1 = toItemBody({ ...good, sizes: many, selectedSize: "1" });
    expect(!r1.ok && r1.errors.sizes).toBe("Use at most 12 sizes.");
    const r2 = toItemBody({ ...good, sizes: "9, " + "x".repeat(21), selectedSize: "9" });
    expect(!r2.ok && r2.errors.sizes).toBe("Each size can be at most 20 characters.");
  });

  it.each(["0", "-5", "abc", "12.345", "100000"])("rejects price %s", (typicalPrice) => {
    const r = toItemBody({ ...good, typicalPrice });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.typicalPrice).toBe("Enter a price like 49.99.");
  });
});

describe("formValuesFromItem", () => {
  it("fills the form from an item", () => {
    const item: Item = {
      id: "i1", name: "Denim jacket", category: "clothes", sizes: ["S", "M"], selectedSize: "M", typicalPrice: 65,
      imageUrl: null, sourceUrl: null, createdAt: "", updatedAt: "",
    };
    expect(formValuesFromItem(item)).toEqual({
      name: "Denim jacket", category: "clothes", sizes: "S, M", selectedSize: "M", typicalPrice: "65", sourceUrl: "",
    });
  });
});
