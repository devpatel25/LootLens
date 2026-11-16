/** Whether a store needs a separate Fictional label. Stub. */
export function needsFictionalLabel(store: { name: string; fictional: boolean }): boolean {
  void store;
  return false;
}

/** Store name for prose and links, marked "(fictional)" when needed. Stub. */
export function storeLabel(store: { name: string; fictional: boolean }): string {
  return store.name;
}
