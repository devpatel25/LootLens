import { TRUST_MIN_PHOTO_REVIEWS, TRUST_MIN_RATING } from "@/lib/pricing";
import type { TrustReason } from "@/lib/types";

/** Plain words for each trustFlags reason, using the same thresholds as lib/pricing. */
export function trustReasonText(reason: TrustReason): string {
  switch (reason) {
    case "no_https":
      return "no HTTPS";
    case "few_photo_reviews":
      return `under ${TRUST_MIN_PHOTO_REVIEWS} photo reviews`;
    case "low_rating":
      return `rating under ${TRUST_MIN_RATING}`;
  }
}

/** "no HTTPS, under 20 photo reviews, and rating under 3.5" */
export function trustReasonsSentence(reasons: TrustReason[]): string {
  const parts = reasons.map(trustReasonText);
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

/** Store name for prose, marked fictional when the name does not already say so. */
export function storeLabel(store: { name: string; fictional: boolean }): string {
  return store.fictional && !/fictional/i.test(store.name) ? `${store.name} (fictional)` : store.name;
}
