import type { Code as DbCode, Item as DbItem, Listing as DbListing, Store as DbStore, UserSettings } from "@/lib/generated/prisma/client";
import type { Code, Item, Listing, Settings, Store } from "@/lib/types";

export function toStore(_s: DbStore): Store {
  return {} as Store;
}
export function toItem(_i: DbItem): Item {
  return {} as Item;
}
export function toListing(_l: DbListing): Listing {
  return {} as Listing;
}
export function toCode(_c: DbCode & { store: DbStore }): Code {
  return {} as Code;
}
export function toSettings(_s: UserSettings): Settings {
  return { freshnessHours: 24, firstOrderEligible: false };
}
