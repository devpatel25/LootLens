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

const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** "no HTTPS, under 20 photo reviews, and rating under 3.5"; with capitalize, "No HTTPS, ..." for a sentence. */
export function trustReasonsSentence(reasons: TrustReason[], opts: { capitalize?: boolean } = {}): string {
  const text = list.format(reasons.map(trustReasonText));
  return opts.capitalize && text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** Kept here too for trust wording callers; the rule lives in lib/storeLabel.ts. */
export { storeLabel } from "@/lib/storeLabel";
