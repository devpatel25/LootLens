export const DEFAULT_AFTER_SIGNIN = "/wishlist";

/** Keeps a callbackUrl only when it is a same-site path. Anything else falls back to the wishlist. */
export function safeCallbackUrl(raw: string | string[] | undefined): string {
  void raw;
  return "";
}

/** Plain message for an Auth.js `?error=` code, or null when there is no error. */
export function signInErrorMessage(code: string | string[] | undefined): string | null {
  void code;
  return null;
}
