/**
 * True when `pathname` is `base` or below it ("/codes" and "/codes/x", not "/codes-archive").
 * The one place this rule lives: the proxy, callbackUrl filtering, and nav highlighting all use it.
 */
export function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}

/**
 * Return address for an Item Detail page. Real item ids are plain letters, digits, _ and -, so such an id is
 * used as it is and anything else (which cannot be an item) goes back to the wishlist. That way it does not
 * matter whether Next hands the route param over encoded or decoded.
 */
export function itemPagePath(id: string): string {
  return /^[\w-]+$/.test(id) ? `/items/${id}` : "/wishlist";
}
