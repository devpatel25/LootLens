// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ComparisonTable from "@/components/ComparisonTable";
import { getDemoComparison } from "@/lib/demoData";
import type { ItemComparison } from "@/lib/types";

afterEach(cleanup);

function demo(): ItemComparison {
  const comparison = getDemoComparison("item-samba");
  if (!comparison) throw new Error("fixture item missing");
  return comparison;
}

function row(name: RegExp) {
  return screen.getByRole("row", { name });
}

describe("ComparisonTable", () => {
  it("shows a column for each fact the shopper compares", () => {
    render(<ComparisonTable comparison={demo()} />);
    for (const name of ["Store", "Condition", "Price", "Size 9 stock", "Source", "Link"]) {
      expect(screen.getByRole("columnheader", { name })).toBeTruthy();
    }
  });

  it("lists every store, cheapest first", () => {
    render(<ComparisonTable comparison={demo()} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByText("Facebook Marketplace")).toBeTruthy();
  });

  it("marks only the cheapest listing in stock for the saved size", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(screen.getAllByText("Cheapest")).toHaveLength(1);
    expect(within(row(/Facebook Marketplace/)).getByText("Cheapest")).toBeTruthy();
  });

  it("does not mark a cheaper store that is out of stock in the saved size", () => {
    render(<ComparisonTable comparison={demo()} />);
    const amazon = row(/Amazon/);
    expect(within(amazon).getByText("$84.99")).toBeTruthy();
    expect(within(amazon).getByText("Out of stock")).toBeTruthy();
    expect(within(amazon).queryByText("Cheapest")).toBeNull();
  });

  it("tags used and resale listings", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(within(row(/Facebook Marketplace/)).getByText("Used")).toBeTruthy();
    expect(within(row(/KickSwap/)).getByText("Resale")).toBeTruthy();
    expect(within(row(/Adidas/)).getByText("New")).toBeTruthy();
  });

  it("keeps the fictional store labelled fictional", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(within(row(/KickSwap/)).getByText(/fictional/i)).toBeTruthy();
  });

  it("labels the source of every listing", () => {
    render(<ComparisonTable comparison={demo()} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    for (const r of rows) expect(within(r).getByText("Demo")).toBeTruthy();
  });

  it("formats prices as USD and shows stock counts", () => {
    render(<ComparisonTable comparison={demo()} />);
    const walmart = row(/Walmart/);
    expect(within(walmart).getByText("$92.50")).toBeTruthy();
    expect(within(walmart).getByText("2 in stock")).toBeTruthy();
  });

  it("links each row to the store listing", () => {
    render(<ComparisonTable comparison={demo()} />);
    const link = screen.getByRole("link", { name: "View Adidas listing" });
    expect(link.getAttribute("href")).toBe("https://example.com/demo/adidas-samba");
  });

  it("explains what Cheapest means using only what the data supports", () => {
    render(<ComparisonTable comparison={demo()} />);
    expect(
      screen.getByText("Cheapest marks the lowest price among the stores shown with size 9 in stock."),
    ).toBeTruthy();
  });

  it("shows an empty state when no store lists the item", () => {
    render(<ComparisonTable comparison={{ ...demo(), listings: [] }} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("No stores list this item yet.")).toBeTruthy();
  });

  it("shows no Cheapest badge when no store has the saved size in stock", () => {
    const comparison = demo();
    const listings = comparison.listings.map((l) => ({
      ...l,
      stockBySize: { ...l.stockBySize, "9": 0 },
    }));
    render(<ComparisonTable comparison={{ ...comparison, listings }} />);
    expect(screen.queryByText("Cheapest")).toBeNull();
    expect(screen.getByText("No store shown has size 9 in stock.")).toBeTruthy();
  });
});
