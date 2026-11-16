/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub */
import type { AlertKind } from "@/lib/types";

export type WatchRule = { targetPrice: number | null; baselinePrice: number; lowStockAt: number };
export type WatchNow = { price: number | null; stock: number };

export function evaluateWatch(_watch: WatchRule, _now: WatchNow): { priceCondMet: boolean; stockCondMet: boolean } {
  return { priceCondMet: false, stockCondMet: false };
}

export function alertKindForStock(_stock: number): Extract<AlertKind, "low_size" | "out_of_stock"> {
  return "low_size";
}
