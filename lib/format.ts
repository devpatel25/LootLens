const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** USD for display only. Prices stay unrounded numbers everywhere else (AGENTS.md section 2). */
export function formatUsd(amount: number): string {
  return usd.format(amount);
}

/** "checked 3h ago": minutes under an hour, hours under two days, then days. Future times read "just now". */
export function checkedAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "checked just now";
  if (minutes < 60) return `checked ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `checked ${hours}h ago`;
  return `checked ${Math.floor(hours / 24)}d ago`;
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Nov 30". UTC, so the server render and every reader agree on the date. */
export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso));
}
