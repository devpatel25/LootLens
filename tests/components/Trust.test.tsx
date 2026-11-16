// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ComparisonTable from "@/components/ComparisonTable";
import ItemDetailView from "@/components/ItemDetailView";
import fixture from "@/fixtures/comparison.json";
import type { ItemComparison } from "@/lib/types";

afterEach(cleanup);

const demo = () => structuredClone(fixture) as ItemComparison;
const row = (name: RegExp) => screen.getByRole("row", { name });

/** Same data, but the low-trust KickSwap listing is the cheapest in stock. */
function cheapestIsLowTrust(): ItemComparison {
  const c = demo();
  c.listings = c.listings.map((l) => (l.id === "lst-kickswap" ? { ...l, price: 29 } : l));
  c.cheapestListingId = "lst-kickswap";
  c.cheapestTrustedListingId = "lst-fbm";
  return c;
}

describe("trust signs in the comparison table", () => {
  it("has Seller and Trust columns", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(screen.getByRole("columnheader", { name: "Seller" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Trust" })).toBeTruthy();
  });

  it("shows seller name, HTTPS, and photo-review count on every row", () => {
    render(<ComparisonTable comparison={demo()} />);
    const adidas = row(/Adidas Official/);
    expect(within(adidas).getByText("Adidas Official")).toBeTruthy();
    expect(within(adidas).getByText("HTTPS")).toBeTruthy();
    expect(within(adidas).getByText("420 photo reviews")).toBeTruthy();
    const kick = row(/KickSwap/);
    expect(within(kick).getByText("No HTTPS")).toBeTruthy();
    expect(within(kick).getByText("4 photo reviews")).toBeTruthy();
  });

  it("says 1 photo review, not 1 photo reviews", () => {
    const c = demo();
    c.stores = c.stores.map((st) => (st.id === "store-adidas" ? { ...st, photoReviewCount: 1 } : st));
    render(<ComparisonTable comparison={c} />);
    expect(within(row(/Adidas Official/)).getByText("1 photo review")).toBeTruthy();
  });

  it("shows the Low-trust label next to the store name, visible without scrolling the table", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(within(within(row(/KickSwap/)).getByRole("rowheader")).getByText("Low-trust")).toBeTruthy();
  });

  it("puts a text Low-trust label and the reasons on stores that fail trustFlags, and only there", () => {
    render(<ComparisonTable comparison={demo()} />);
    const kick = row(/KickSwap/);
    expect(within(kick).getByText("Low-trust")).toBeTruthy();
    expect(within(kick).getByText("No HTTPS, under 20 photo reviews, and rating under 3.5")).toBeTruthy();
    expect(screen.getAllByText("Low-trust")).toHaveLength(1);
  });
});

describe("unknown store (Dev's review)", () => {
  it("says the trust is unknown instead of looking as safe as a trusted store", () => {
    const c = demo();
    c.listings = c.listings.map((l) => (l.id === "lst-walmart" ? { ...l, storeId: "store-missing" } : l));
    render(<ComparisonTable comparison={c} />);
    expect(within(row(/Unknown store/)).getByText("Trust unknown")).toBeTruthy();
  });
});

describe("cheapest trusted alternative", () => {
  it("warns when the cheapest store is low-trust and names the cheapest trusted one", () => {
    render(<ItemDetailView comparison={cheapestIsLowTrust()} />);
    const note = screen.getByRole("note", { name: "Trust warning" });
    expect(note.textContent).toContain("The cheapest store shown, KickSwap (fictional demo store), looks low-trust: no HTTPS, under 20 photo reviews, and rating under 3.5.");
    expect(note.textContent).toContain("Cheapest trusted store shown: $60.00 at Facebook Marketplace.");
  });

  it("says so when no trusted store has the size", () => {
    const c = cheapestIsLowTrust();
    c.cheapestTrustedListingId = null;
    render(<ItemDetailView comparison={c} />);
    expect(screen.getByRole("note", { name: "Trust warning" }).textContent).toContain("No trusted store shown has size 9 in stock.");
  });

  it("shows no warning when the cheapest store is trusted", () => {
    render(<ItemDetailView comparison={demo()} />);
    expect(screen.queryByRole("note", { name: "Trust warning" })).toBeNull();
  });

  it("labels fictional stores in the warning and in the trusted alternative", () => {
    const c = cheapestIsLowTrust();
    c.stores = c.stores.map((st) =>
      st.fictional ? { ...st, name: "KickSwap" } : st.id === "store-fbm" ? { ...st, name: "SwapShop", fictional: true } : st,
    );
    render(<ItemDetailView comparison={c} />);
    const note = screen.getByRole("note", { name: "Trust warning" }).textContent;
    expect(note).toContain("The cheapest store shown, KickSwap (fictional), looks low-trust");
    expect(note).toContain("Cheapest trusted store shown: $60.00 at SwapShop (fictional).");
  });

  it("labels a fictional cheapest store as fictional in the summary line", () => {
    const c = cheapestIsLowTrust();
    c.stores = c.stores.map((s) => (s.fictional ? { ...s, name: "KickSwap" } : s));
    render(<ItemDetailView comparison={c} />);
    expect(screen.getByText(/Cheapest of the stores shown: \$29\.00 at KickSwap \(fictional\)/)).toBeTruthy();
  });
});
