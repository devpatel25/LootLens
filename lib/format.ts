const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** USD for display only. Prices stay unrounded numbers everywhere else (AGENTS.md section 2). */
export function formatUsd(amount: number): string {
  return usd.format(amount);
}
