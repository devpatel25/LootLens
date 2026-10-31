import fixture from "@/fixtures/comparison.json";

export type Condition = "new" | "used" | "resale";

export type Item = {
  id: string;
  name: string;
  category: string;
  sizes: string[];
  selectedSize: string;
  typicalPrice: number;
};

export type Store = { id: string; name: string; domain: string };

export type Listing = {
  id: string;
  itemId: string;
  storeId: string;
  price: number;
  condition: Condition;
  url: string;
  stockBySize: Record<string, number>;
  updatedAt: string;
};

export type ComparisonData = {
  demo: boolean;
  label: string;
  item: Item;
  stores: Store[];
  listings: Listing[];
};

export type ComparisonRow = {
  listing: Listing;
  store: Store;
  stock: number;
  inStock: boolean;
  /** Positive when cheaper than the item's typical price, negative when more expensive. */
  savings: number;
  savingsPercent: number;
};

export type Comparison = {
  item: Item;
  size: string;
  demo: boolean;
  label: string;
  /** In-stock rows first (cheapest first), then out-of-stock rows (cheapest first). */
  rows: ComparisonRow[];
  lowest: ComparisonRow | null;
  lowestNew: ComparisonRow | null;
};

export const LOW_STOCK_THRESHOLD = 2;

export function loadComparisonData(): ComparisonData {
  return fixture as ComparisonData;
}

const toCents = (dollars: number) => Math.round(dollars * 100);

/** Falls back to the item's default size when the requested one isn't offered. */
export function resolveSize(item: Item, requested: string | undefined): string {
  return requested !== undefined && item.sizes.includes(requested)
    ? requested
    : item.selectedSize;
}

export function compareListings(data: ComparisonData, size: string): Comparison {
  const { item } = data;
  if (!item.sizes.includes(size)) {
    throw new Error(`Size "${size}" is not offered for ${item.id}`);
  }
  const storesById = new Map(data.stores.map((s) => [s.id, s]));
  const typicalCents = toCents(item.typicalPrice);

  const rows: ComparisonRow[] = data.listings
    .filter((l) => l.itemId === item.id)
    .map((listing) => {
      const store = storesById.get(listing.storeId);
      if (!store) {
        throw new Error(`Listing ${listing.id} references unknown store ${listing.storeId}`);
      }
      const stock = listing.stockBySize[size] ?? 0;
      const savingsCents = typicalCents - toCents(listing.price);
      return {
        listing,
        store,
        stock,
        inStock: stock > 0,
        savings: savingsCents / 100,
        savingsPercent: typicalCents > 0 ? Math.round((savingsCents / typicalCents) * 100) : 0,
      };
    })
    .sort(
      (a, b) =>
        Number(b.inStock) - Number(a.inStock) ||
        toCents(a.listing.price) - toCents(b.listing.price) ||
        a.store.name.localeCompare(b.store.name),
    );

  const available = rows.filter((r) => r.inStock);
  return {
    item,
    size,
    demo: data.demo,
    label: data.label,
    rows,
    lowest: available[0] ?? null,
    lowestNew: available.find((r) => r.listing.condition === "new") ?? null,
  };
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatPrice(dollars: number): string {
  return usd.format(dollars);
}
