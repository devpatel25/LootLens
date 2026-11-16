// Type-level checks: this file fails `npm run typecheck` if Alert stops being a union on kind.
import { describe, expect, it } from "vitest";
import type { Alert } from "@/lib/types";

const base = {
  id: "a",
  watchId: null,
  itemId: "i",
  itemName: "n",
  size: "9",
  read: false,
  createdAt: "2026-10-29T16:00:00.000Z",
};

describe("Alert union", () => {
  it("accepts the documented detail for each kind", () => {
    const ok: Alert[] = [
      { ...base, kind: "price_drop", detail: { from: 90, to: 60 } },
      { ...base, kind: "low_size", detail: { qty: 1 } },
      { ...base, kind: "out_of_stock", detail: { qty: 0 } },
    ];
    expect(ok).toHaveLength(3);
  });

  it("rejects wrong detail for a kind", () => {
    const bad: Alert[] = [
      // @ts-expect-error price_drop needs from and to
      { ...base, kind: "price_drop", detail: {} },
      // @ts-expect-error out_of_stock quantity is always 0
      { ...base, kind: "out_of_stock", detail: { qty: 5 } },
      // @ts-expect-error alerts carry the saved size
      { id: "a", watchId: null, itemId: "i", itemName: "n", read: false, createdAt: "x", kind: "low_size", detail: { qty: 1 } },
    ];
    expect(bad).toHaveLength(3);
  });
});
