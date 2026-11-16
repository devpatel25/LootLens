import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { signInUrl } from "@/lib/authConfig";

/**
 * The signed-in user's id for a server page. Call inside <Suspense>. Without a session it goes to sign-in
 * with `returnTo` as the return address, the same way the proxy does (signInUrl).
 */
export async function requirePageUserId(returnTo = "/wishlist"): Promise<string> {
  await connection();
  const id = (await auth())?.user?.id;
  if (!id) redirect(signInUrl(returnTo, ""));
  return id;
}
