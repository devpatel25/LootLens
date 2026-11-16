import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

/** The signed-in user's id for a server page. Call inside <Suspense>. Redirects to /signin without a session. */
export async function requirePageUserId(returnTo = "/wishlist"): Promise<string> {
  void returnTo;
  await connection();
  const id = (await auth())?.user?.id;
  if (!id) redirect("/signin");
  return id;
}
