import { isUnder } from "@/lib/paths";

export const DEFAULT_AFTER_SIGNIN = "/wishlist";

const BASE = "http://lootlens.invalid";

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Keeps a callbackUrl only when it is a same-site path. Anything else falls back to the wishlist. */
export function safeCallbackUrl(raw: string | string[] | undefined): string {
  const value = first(raw);
  if (!value.startsWith("/")) return DEFAULT_AFTER_SIGNIN;

  const url = new URL(value, BASE);
  if (url.origin !== BASE) return DEFAULT_AFTER_SIGNIN;
  // Only the path decides where we land; the query may hold any text (for example "100%").
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return DEFAULT_AFTER_SIGNIN;
  }
  if (path.startsWith("//") || path.includes("\\")) return DEFAULT_AFTER_SIGNIN;
  // Check the decoded path, the same one the checks above use: /%61pi/items is /api/items.
  if (isUnder(path, "/signin") || isUnder(path, "/api")) return DEFAULT_AFTER_SIGNIN;

  return url.pathname + url.search;
}

// A Map, not an object literal: ?error=__proto__ must not read Object.prototype.
const MESSAGES = new Map<string, string>([
  ["AccessDenied", "Google sign-in was cancelled or denied. Try again."],
  // Auth.js reports a cancel on Google's screen as a failed OAuth callback.
  ["OAuthCallbackError", "Google sign-in was cancelled or did not finish. Try again."],
  ["MissingCSRF", "The sign-in page expired. Try again."],
  ["Configuration", "Sign-in is not set up correctly on the server. Try again later."],
]);

/** The `?error=` code to send for an Auth.js error type: a code we explain, else Configuration (no details). */
export function signInErrorCode(type: string): string {
  return MESSAGES.has(type) ? type : "Configuration";
}

/** The sign-in page with a return address. Client-safe (no Auth.js imports), so links can use it too. */
export function signInUrl(pathname: string, search: string): string {
  return `/signin?callbackUrl=${encodeURIComponent(pathname + search)}`;
}

/**
 * True when a signed-in visit to /signin should still see the page instead of going on: it carries an
 * error to show, or asks to sign in again (`reauth`), for example when the session's user was removed by
 * a demo reset.
 */
export function keepSignInPage(params: URLSearchParams): boolean {
  return params.has("error") || params.has("reauth");
}

/** Plain message for an Auth.js `?error=` code, or null when there is no error. */
export function signInErrorMessage(code: string | string[] | undefined): string | null {
  const value = first(code);
  if (!value) return null;
  return MESSAGES.get(value) ?? "Sign-in did not finish. Try again.";
}
