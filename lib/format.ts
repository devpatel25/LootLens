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

/** "Ends in 31d": relative, so no reader's timezone can shift the end to a different day. */
export function endsIn(iso: string, now: Date): string {
  const hours = Math.floor((Date.parse(iso) - now.getTime()) / 3_600_000);
  if (hours < 1) return "Ends in under an hour";
  if (hours < 48) return `Ends in ${hours}h`;
  return `Ends in ${Math.floor(hours / 24)}d`;
}

/** "3h ago", "just now". Stub. */
export function ago(iso: string, now: Date): string {
  void iso; void now;
  return "";
}
