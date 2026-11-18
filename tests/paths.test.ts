import { describe, expect, it } from "vitest";
import { itemPagePath } from "@/lib/paths";

describe("itemPagePath", () => {
  it.each(["abc123", "cm1x_Y-2"])("keeps a plain item id %s as it is", (id) => {
    expect(itemPagePath(id)).toBe(`/items/${id}`);
  });

  // Real item ids are plain letters, digits, _ and -. Anything else cannot be an item, so the return address
  // is the wishlist, and whether Next hands the param over encoded or decoded no longer matters.
  it.each(["a%2Fb", "a/b", "a b", "%E2%9C%93", ""])("sends the id %j back to the wishlist", (id) => {
    expect(itemPagePath(id)).toBe("/wishlist");
  });
});
