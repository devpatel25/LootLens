import Link from "next/link";
import { connection } from "next/server";
import UserMenu from "@/components/UserMenu";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/authActions";

/**
 * Reads the session, so it sits inside <Suspense> (cacheComponents is on). The proxy already sends signed-out
 * visits to /signin with their return address, so if the session is somehow missing here we show a plain
 * Sign in link rather than redirecting and losing that address.
 */
export default async function SessionUserMenu() {
  // Auth.js touches crypto before it reads cookies; mark the request as dynamic first so prerendering stops here.
  await connection();
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <Link href="/signin" className="text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300">
        Sign in
      </Link>
    );
  }
  return <UserMenu name={session.user.name ?? null} email={session.user.email ?? null} signOutAction={signOutAction} />;
}
