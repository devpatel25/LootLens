import { reauthUrl } from "@/lib/signin";

/** Sends the browser to sign in again, back to the current page afterwards. Browser only. */
export function signInAgain(): void {
  window.location.assign(reauthUrl(window.location.pathname, window.location.search));
}
