"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { safeCallbackUrl, signInErrorCode } from "@/lib/signin";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const callbackUrl = formData.get("callbackUrl");
  const redirectTo = safeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : undefined);
  try {
    await signIn("google", { redirectTo });
  } catch (e) {
    // A provider or setup failure (for example a missing AUTH_GOOGLE_ID) comes back to the sign-in page with
    // a plain message and the same return address. Anything else, including the redirect to Google, goes on.
    if (e instanceof AuthError) {
      redirect(`/signin?error=${signInErrorCode(e.type)}&callbackUrl=${encodeURIComponent(redirectTo)}`);
    }
    throw e;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/signin" });
}
