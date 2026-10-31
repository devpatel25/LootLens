// Shared API response types (the API contract). UI builds against these.

export type DataSource = "live" | "demo";

export type ListingCondition = "new" | "used" | "resale";

export type Item = {
  id: string;
  name: string;
  category: string;
  sizes: string[];
  selectedSize: string;
  typicalPrice: number;
};

export type Store = {
  id: string;
  name: string;
  domain: string;
};

export type Listing = {
  id: string;
  itemId: string;
  storeId: string;
  /** USD. Round only for display. */
  price: number;
  condition: ListingCondition;
  url: string;
  /** Units in stock keyed by size. A missing size means none in stock. */
  stockBySize: Record<string, number>;
  updatedAt: string;
  source: DataSource;
};

/** GET /api/items/[id]/listings */
export type ItemComparison = {
  item: Item;
  stores: Store[];
  listings: Listing[];
};
