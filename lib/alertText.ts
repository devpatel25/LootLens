import { formatUsd } from "@/lib/format";
import type { Alert, Watch } from "@/lib/types";

/** One plain sentence for an alert. */
export function alertText(alert: Pick<Alert, "kind" | "detail">): string {
  const { kind, detail } = alert;
  if (kind === "price_drop") return `Price dropped from ${formatUsd(detail.from ?? 0)} to ${formatUsd(detail.to ?? 0)}`;
  if (kind === "low_size") return `Only ${detail.qty ?? 0} left in your size`;
  return "Out of stock in your size";
}

/** One plain sentence describing what a watch alerts on. */
export function watchSummary(watch: Pick<Watch, "size" | "targetPrice" | "baselinePrice" | "lowStockAt">): string {
  const price =
    watch.targetPrice === null
      ? `any price drop below ${formatUsd(watch.baselinePrice)}`
      : `when the price is ${formatUsd(watch.targetPrice)} or less`;
  const stock =
    watch.lowStockAt === 0
      ? "when it sells out"
      : `when ${watch.lowStockAt} or fewer ${watch.lowStockAt === 1 ? "is" : "are"} left`;
  return `Size ${watch.size}: ${price}, and ${stock}.`;
}

/** Window event other components listen for to refetch alerts (the nav badge). */
export const ALERTS_CHANGED = "lootlens:alerts-changed";

/** How often the Alerts page and the nav badge re-read alerts. */
export const POLL_MS = 60_000;

/** Tell the rest of the page that alerts may have changed. */
export function announceAlertsChanged(): void {
  window.dispatchEvent(new Event(ALERTS_CHANGED));
}
