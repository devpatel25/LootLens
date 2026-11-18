/**
 * True when `pathname` is `base` or below it ("/codes" and "/codes/x", not "/codes-archive").
 * The one place this rule lives: the proxy, callbackUrl filtering, and nav highlighting all use it.
 */
export function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}
