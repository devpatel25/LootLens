// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ItemError from "@/app/(app)/items/[id]/error";
import ItemLoading from "@/app/(app)/items/[id]/loading";
import ItemNotFound from "@/app/(app)/items/[id]/not-found";
import ComparisonTable from "@/components/ComparisonTable";
import ItemDetailView from "@/components/ItemDetailView";
import fixture from "@/fixtures/comparison.json";
import { formatUsd } from "@/lib/format";
import type { ItemComparison } from "@/lib/types";

afterEach(cleanup);

const demo = () => structuredClone(fixture) as ItemComparison;
const row = (name: RegExp) => screen.getByRole("row", { name });
const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

describe("formatUsd", () => {
  it("formats USD with two decimals for display", () => {
    expect(formatUsd(60)).toBe("$60.00");
    expect(formatUsd(84.99)).toBe("$84.99");
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(14.989999999999998)).toBe("$14.99");
  });
});

describe("ComparisonTable (populated)", () => {
  it("has a caption and a column for each fact the shopper compares", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(screen.getByRole("table", { name: "Prices for Adidas Samba OG at every store" })).toBeTruthy();
    for (const name of ["Store", "Condition", "Price", "Size 9 stock", "Source", "Link"]) {
      expect(screen.getByRole("columnheader", { name })).toBeTruthy();
    }
  });

  it("lists one row per listing, lowest price first", () => {
    render(<ComparisonTable comparison={demo()} />);
    const rows = bodyRows();
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => within(r).getByRole("rowheader").textContent)).toEqual([
      expect.stringContaining("Facebook Marketplace"),
      expect.stringContaining("Amazon"),
      expect.stringContaining("Walmart"),
      expect.stringContaining("Adidas"),
      expect.stringContaining("KickSwap"),
    ]);
  });

  it("puts a text Cheapest badge only on the listing the API chose", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(screen.getAllByText("Cheapest")).toHaveLength(1);
    expect(within(row(/Facebook Marketplace/)).getByText("Cheapest")).toBeTruthy();
  });

  it("trusts cheapestListingId over its own math", () => {
    const c = demo();
    c.cheapestListingId = "lst-walmart";
    render(<ComparisonTable comparison={c} />);
    expect(within(row(/Walmart/)).getByText("Cheapest")).toBeTruthy();
    expect(within(row(/Facebook Marketplace/)).queryByText("Cheapest")).toBeNull();
  });

  it("tags condition, with used and resale called out", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(within(row(/Facebook Marketplace/)).getByText("Used")).toBeTruthy();
    expect(within(row(/KickSwap/)).getByText("Resale")).toBeTruthy();
    expect(within(row(/Walmart/)).getByText("New")).toBeTruthy();
  });

  it("shows formatted prices", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(within(row(/Amazon/)).getByText("$84.99")).toBeTruthy();
    expect(within(row(/Facebook Marketplace/)).getByText("$60.00")).toBeTruthy();
  });

  it("marks listings out of stock in the saved size and shows counts for the rest", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(within(row(/Amazon/)).getByText("Out of stock")).toBeTruthy();
    expect(within(row(/Adidas/)).getByText("4 in stock")).toBeTruthy();
    expect(within(row(/Facebook Marketplace/)).getByText("1 in stock")).toBeTruthy();
  });

  it("labels the source of every listing", () => {
    render(<ComparisonTable comparison={demo()} />);
    for (const r of bodyRows()) expect(within(r).getByText("Demo")).toBeTruthy();
  });

  it("links out to each store in a new tab, safely", () => {
    render(<ComparisonTable comparison={demo()} />);
    const link = within(row(/Amazon/)).getByRole("link", { name: /View at Amazon/ });
    expect(link.getAttribute("href")).toBe(demo().listings.find((l) => l.id === "lst-amazon")!.url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.textContent).toContain("opens in a new tab");
  });

  it("can scroll sideways on small screens with the keyboard", () => {
    render(<ComparisonTable comparison={demo()} />);
    const region = screen.getByRole("region", { name: "Prices for Adidas Samba OG at every store" });
    expect(region.getAttribute("tabindex")).toBe("0");
  });
});

describe("ComparisonTable (edge cases)", () => {
  it("on a price tie lists the new listing above the used one", () => {
    const c = demo();
    c.listings = c.listings.map((l) => (l.id === "lst-walmart" ? { ...l, price: 60 } : l));
    c.cheapestListingId = "lst-walmart";
    render(<ComparisonTable comparison={c} />);
    const first = bodyRows()[0];
    expect(within(first).getByRole("rowheader").textContent).toContain("Walmart");
    expect(within(first).getByText("Cheapest")).toBeTruthy();
  });

  it("labels a fictional store even when its name does not say so", () => {
    const c = demo();
    c.stores = c.stores.map((s) => (s.fictional ? { ...s, name: "KickSwap" } : s));
    render(<ComparisonTable comparison={c} />);
    expect(within(row(/KickSwap/)).getByText("Fictional")).toBeTruthy();
    expect(within(row(/Walmart/)).queryByText("Fictional")).toBeNull();
  });

  it("does not repeat the label when the name already says fictional", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(within(row(/KickSwap/)).queryByText("Fictional")).toBeNull();
    expect(within(row(/KickSwap/)).getByRole("rowheader").textContent).toContain("(fictional demo store)");
  });

  it("says so when nothing is in stock in the saved size", () => {
    const c = demo();
    c.cheapestListingId = null;
    render(<ComparisonTable comparison={c} />);
    expect(screen.queryByText("Cheapest")).toBeNull();
    expect(screen.getByText("No store shown has size 9 in stock.")).toBeTruthy();
  });

  it("shows an empty state instead of a table when there are no listings", () => {
    const c = demo();
    c.listings = [];
    c.cheapestListingId = null;
    render(<ComparisonTable comparison={c} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("heading", { name: "No store prices yet" })).toBeTruthy();
  });
});

describe("Dev's review (#31)", () => {
  it("labels a fictional store whose name merely contains the word", () => {
    const c = demo();
    c.stores = c.stores.map((st) => (st.fictional ? { ...st, name: "Nonfictional Books" } : st));
    render(<ComparisonTable comparison={c} />);
    expect(within(row(/Nonfictional Books/)).getByText("Fictional")).toBeTruthy();
  });

  it("marks a fictional store in its outbound link text too", () => {
    const c = demo();
    c.stores = c.stores.map((st) => (st.fictional ? { ...st, name: "KickSwap" } : st));
    render(<ComparisonTable comparison={c} />);
    expect(within(row(/KickSwap/)).getByRole("link", { name: /View at KickSwap \(fictional\)/ })).toBeTruthy();
  });

  it("the empty state heading sits under Compare stores (h3)", () => {
    const c = demo();
    c.listings = [];
    c.cheapestListingId = null;
    render(<ItemDetailView comparison={c} />);
    expect(screen.getByRole("heading", { level: 2, name: "Compare stores" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "No store prices yet" })).toBeTruthy();
  });
});

describe("ItemDetailView", () => {
  it("shows the item name, saved size, and the comparison", () => {
    render(<ItemDetailView comparison={demo()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Adidas Samba OG" })).toBeTruthy();
    expect(screen.getByText("Saved size: 9")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Prices for Adidas Samba OG at every store" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to wishlist" }).getAttribute("href")).toBe("/wishlist");
  });

  it("shows the Demo data badge while any listing is demo", () => {
    render(<ItemDetailView comparison={demo()} />);
    expect(screen.getByText("Demo data")).toBeTruthy();
  });

  it("shows the Demo data badge when there are no listings, since nothing on the page is live", () => {
    const c = demo();
    c.listings = [];
    render(<ItemDetailView comparison={c} />);
    expect(screen.getByText("Demo data")).toBeTruthy();
  });

  it("hides the Demo data badge when every listing is live", () => {
    const c = demo();
    c.listings = c.listings.map((l) => ({ ...l, source: "live" as const }));
    render(<ItemDetailView comparison={c} />);
    expect(screen.queryByText("Demo data")).toBeNull();
  });

  it("describes the cheapest price only as the cheapest of the stores shown", () => {
    render(<ItemDetailView comparison={demo()} />);
    expect(screen.getByText(/Cheapest of the stores shown: \$60\.00 at Facebook Marketplace/)).toBeTruthy();
  });
});

describe("Item Detail route states", () => {
  it("loading.tsx announces that prices are loading", () => {
    render(<ItemLoading />);
    expect(screen.getByRole("status").textContent).toContain("Loading prices");
  });

  it("error.tsx shows an alert and retries", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ItemError error={new Error("db down")} retry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("Prices could not load.");
    expect(screen.queryByText("db down")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("not-found.tsx explains and links back to the wishlist", () => {
    render(<ItemNotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Item not found" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to wishlist" }).getAttribute("href")).toBe("/wishlist");
  });
});
