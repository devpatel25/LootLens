import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Shared demo data that is safe on every database, production included: the stores, a set of demo promo
 * codes, and demo listings for items that have none. It only adds. See AGENTS.md (Environments).
 */
export type CatalogCode = {
  storeId: string;
  code: string;
  label: string;
  type: "PCT" | "FLAT";
  value: number;
  minSpend?: number;
  firstOrderOnly?: boolean;
};

export const CATALOG_CODES: CatalogCode[] = [
  { storeId: "store-adidas", code: "SAMBA20", label: "20% off", type: "PCT", value: 20 },
  { storeId: "store-amazon", code: "SAVE25", label: "$25 off orders of $150 or more", type: "FLAT", value: 25, minSpend: 150 },
  { storeId: "store-walmart", code: "SAVE10", label: "10% off", type: "PCT", value: 10 },
  { storeId: "store-target", code: "TARGET10", label: "$10 off orders of $50 or more", type: "FLAT", value: 10, minSpend: 50 },
  { storeId: "store-ae", code: "WELCOME15", label: "15% off your first order", type: "PCT", value: 15, firstOrderOnly: true },
  { storeId: "store-br", code: "BR10", label: "10% off", type: "PCT", value: 10 },
];

export type CatalogResult = { stores: number; codesAdded: number; itemsFilled: number };

/** Stub until the feat commit. */
export async function loadCatalog(db: PrismaClient, now = new Date()): Promise<CatalogResult> {
  void db;
  void now;
  return { stores: 0, codesAdded: 0, itemsFilled: 0 };
}

/** Stub until the feat commit. */
export async function refreshDemoCodes(db: PrismaClient | Prisma.TransactionClient, now = new Date()): Promise<number> {
  void db;
  void now;
  return 0;
}
