import type { Prisma } from "@/lib/generated/prisma/client";

export function generateDemoListings(
  _item: { name: string; sizes: string[]; selectedSize: string; typicalPrice: number },
  _storeIds: string[],
): Prisma.ListingCreateManyItemInput[] {
  return [];
}
