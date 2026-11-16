import type { Alert, Watch } from "@/lib/types";

/** One plain sentence for an alert. Stub. */
export function alertText(alert: Pick<Alert, "kind" | "detail">): string {
  void alert;
  return "";
}

/** One plain sentence describing what a watch alerts on. Stub. */
export function watchSummary(watch: Pick<Watch, "size" | "targetPrice" | "baselinePrice" | "lowStockAt">): string {
  void watch;
  return "";
}

/** Window event other components listen for to refetch alerts (the nav badge). */
export const ALERTS_CHANGED = "lootlens:alerts-changed";
