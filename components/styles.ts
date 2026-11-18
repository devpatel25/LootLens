/**
 * Shared Tailwind class strings, so a focus or contrast fix is made once. Colour variants are added at the
 * call site (for example a red text colour on a destructive button).
 */

/** Small outlined button (Copy, Mark dead, Edit, Clear filters). */
export const smallButton =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800";

/** Text input or select in a form (item sheet, codes search). Invalid fields get a red border. */
export const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 aria-[invalid=true]:border-red-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:aria-[invalid=true]:border-red-400";

/** Base for text chips and tags; add border, background, and text colours at the call site. */
export const chip = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold";
