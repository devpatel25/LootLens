import type { TrustReason } from "@/lib/types";

/** Plain words for each trustFlags reason. Stub. */
export function trustReasonText(reason: TrustReason): string {
  void reason;
  return "";
}

/** "no HTTPS, under 20 photo reviews, and rating under 3.5". Stub. */
export function trustReasonsSentence(reasons: TrustReason[]): string {
  void reasons;
  return "";
}
