import { describe, expect, it } from "vitest";
import { CATEGORIES, EMPTY_FORM, formValuesFromItem, itemPatch, parseSizes, toItemBody, type ItemFormValues } from "@/lib/itemForm";
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
      sourceUrl: "Enter a full link that starts with https:// or http://",
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

  it("accepts a price with spaces around it", () => {
    const r = toItemBody({ ...good, typicalPrice: " 12.50 " });
    expect(r.ok && r.body.typicalPrice).toBe(12.5);
  });

  it.each([
    ["0", "Enter a price above $0."],
    ["100000", "Enter a price of $99,999.99 or less."],
    ["12.345", "Use at most 2 decimal places, like 49.99."],
    ["$40", "Enter numbers only, like 49.99, with no $ or commas."],
    ["1,299", "Enter numbers only, like 49.99, with no $ or commas."],
    ["-5", "Enter a price above $0."],
    ["abc", "Enter numbers only, like 49.99, with no $ or commas."],
  ])("explains what is wrong with price %s", (typicalPrice, message) => {
    const r = toItemBody({ ...good, typicalPrice });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.typicalPrice).toBe(message);
  });

  it("asks for a price when it is empty", () => {
    const r = toItemBody({ ...good, typicalPrice: "" });
    expect(!r.ok && r.errors.typicalPrice).toBe("Enter a price like 49.99.");
  });

  it("says a too-long category is too long, not missing (an old category can be longer than the list allows)", () => {
    const r = toItemBody({ ...good, category: "x".repeat(41) });
    expect(!r.ok && r.errors.category).toBe("Use a category of at most 40 characters.");
  });

  it.each(["0x20", "1e3", "12."])("rejects price %s", (typicalPrice) => {
    const r = toItemBody({ ...good, typicalPrice });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.typicalPrice).toBe("Enter numbers only, like 49.99, with no $ or commas.");
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

describe("editing: only what changed is sent", () => {
  const original: Item = {
    id: "i1", name: "Samba", category: "shoes", sizes: ["42,5", "43"], selectedSize: "42,5", typicalPrice: 100,
    imageUrl: null, sourceUrl: null, createdAt: "", updatedAt: "",
  };

  it("keeps sizes that contain a comma when the sizes field was not touched", () => {
    const values = { ...formValuesFromItem(original), name: "Samba OG" };
    const r = toItemBody(values, original);
    expect(r.ok && r.body.sizes).toEqual(["42,5", "43"]);
  });

  it("sends only the fields whose text changed, so another tab's size change is not undone", () => {
    const values = { ...formValuesFromItem(original), name: "Samba OG" };
    const r = toItemBody(values, original);
    expect(r.ok && itemPatch(original, values, r.body)).toEqual({ name: "Samba OG" });
  });

  it("sends nothing when nothing changed", () => {
    const values = formValuesFromItem(original);
    const r = toItemBody(values, original);
    expect(r.ok && itemPatch(original, values, r.body)).toEqual({});
  });

  it("sends the sizes and the chosen size when both changed", () => {
    const values = { ...formValuesFromItem(original), sizes: "43, 44", selectedSize: "44" };
    const r = toItemBody(values, original);
    expect(r.ok && itemPatch(original, values, r.body)).toEqual({ sizes: ["43", "44"], selectedSize: "44" });
  });
});
