// The seed names its made-up stores "Name (fictional demo store)". Only that note counts as already
// labelled; any other name, even one that contains the word, gets the label from store.fictional.
const SEEDED_NOTE = /\(fictional\b[^)]*\)\s*$/i;

/** Whether a store needs a separate Fictional label next to its name. */
export function needsFictionalLabel(store: { name: string; fictional: boolean }): boolean {
  return store.fictional && !SEEDED_NOTE.test(store.name);
}

/** Store name for prose and links, marked "(fictional)" when needed. */
export function storeLabel(store: { name: string; fictional: boolean }): string {
  return needsFictionalLabel(store) ? `${store.name} (fictional)` : store.name;
}
