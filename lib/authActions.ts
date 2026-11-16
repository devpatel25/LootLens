"use server";

import { signIn, signOut } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/signin";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const callbackUrl = formData.get("callbackUrl");
  await signIn("google", { redirectTo: safeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : undefined) });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/signin" });
}
