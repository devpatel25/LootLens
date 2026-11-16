export const DEFAULT_AFTER_SIGNIN = "/wishlist";

const BASE = "http://lootlens.invalid";

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Keeps a callbackUrl only when it is a same-site path. Anything else falls back to the wishlist. */
export function safeCallbackUrl(raw: string | string[] | undefined): string {
  const value = first(raw);
  if (!value.startsWith("/")) return DEFAULT_AFTER_SIGNIN;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_AFTER_SIGNIN;
  }
  if (decoded.startsWith("//") || decoded.includes("\\")) return DEFAULT_AFTER_SIGNIN;

  const url = new URL(value, BASE);
  if (url.origin !== BASE) return DEFAULT_AFTER_SIGNIN;
  if (url.pathname === "/signin" || url.pathname.startsWith("/signin/")) return DEFAULT_AFTER_SIGNIN;

  return url.pathname + url.search;
}

const MESSAGES: Record<string, string> = {
  AccessDenied: "Google sign-in was cancelled or denied. Try again.",
  Configuration: "Sign-in is not set up correctly on the server. Try again later.",
};

/** Plain message for an Auth.js `?error=` code, or null when there is no error. */
export function signInErrorMessage(code: string | string[] | undefined): string | null {
  const value = first(code);
  if (!value) return null;
  return MESSAGES[value] ?? "Sign-in did not finish. Try again.";
}
