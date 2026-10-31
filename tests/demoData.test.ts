import { describe, expect, it } from "vitest";
import { getDemoComparison } from "@/lib/demoData";

describe("getDemoComparison", () => {
  it("returns the fixture item with every listing labelled demo", () => {
    const comparison = getDemoComparison("item-samba");
    expect(comparison?.item.name).toBe("Adidas Samba OG");
    expect(comparison?.listings).toHaveLength(5);
    expect(comparison?.listings.every((l) => l.source === "demo")).toBe(true);
  });

  it("returns null for an unknown item", () => {
    expect(getDemoComparison("nope")).toBeNull();
  });
});
