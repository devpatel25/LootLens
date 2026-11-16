const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** USD for display only. Prices stay unrounded numbers everywhere else (AGENTS.md section 2). */
export function formatUsd(amount: number): string {
  return usd.format(amount);
}

/** "checked 3h ago" style text. Stub. */
export function checkedAgo(iso: string, now: Date): string {
  void iso; void now;
  return "";
}

/** "Nov 30" style date. Stub. */
export function formatShortDate(iso: string): string {
  void iso;
  return "";
}
