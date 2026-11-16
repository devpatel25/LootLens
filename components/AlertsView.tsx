"use client";

import type { WatchWithItem } from "@/lib/alertsData";
import type { AlertsResponse } from "@/lib/types";

export type AlertsViewProps = { data: AlertsResponse; watches: WatchWithItem[]; now: string; anyDemo: boolean };

/** How often the page re-reads alerts from the server. */
export const POLL_MS = 60_000;

export default function AlertsView(props: AlertsViewProps) {
  void props;
  return null;
}
