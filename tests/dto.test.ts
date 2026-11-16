import { describe, expect, it } from "vitest";
import { toAlert } from "@/lib/dto";

const row = (kind: "PRICE_DROP" | "LOW_SIZE" | "OUT_OF_STOCK", detail: object) =>
  ({
    id: "al1", userId: "u", itemId: "i1", watchId: null, size: "M", kind, detail, read: false,
    createdAt: new Date("2026-10-01T10:00:00Z"), item: { name: "Jacket" },
  }) as unknown as Parameters<typeof toAlert>[0];

describe("toAlert", () => {
  it("carries size and shapes price_drop detail", () => {
    expect(toAlert(row("PRICE_DROP", { from: 60, to: 50, junk: 1 }))).toEqual({
      id: "al1", watchId: null, itemId: "i1", itemName: "Jacket", size: "M", kind: "price_drop",
      detail: { from: 60, to: 50 }, read: false, createdAt: "2026-10-01T10:00:00.000Z",
    });
  });
  it("shapes low_size detail to qty", () => {
    expect(toAlert(row("LOW_SIZE", { qty: 2, junk: 1 }))).toMatchObject({ kind: "low_size", size: "M", detail: { qty: 2 } });
  });
  it("shapes out_of_stock detail to qty 0", () => {
    expect(toAlert(row("OUT_OF_STOCK", { qty: 0 }))).toMatchObject({ kind: "out_of_stock", size: "M", detail: { qty: 0 } });
  });
});
