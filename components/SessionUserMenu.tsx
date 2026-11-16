import { redirect } from "next/navigation";
import { connection } from "next/server";
import UserMenu from "@/components/UserMenu";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/authActions";

/** Reads the session, so it must sit inside <Suspense> (cacheComponents is on). */
export default async function SessionUserMenu() {
  // Auth.js touches crypto before it reads cookies; mark the request as dynamic first so prerendering stops here.
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return <UserMenu name={session.user.name ?? null} email={session.user.email ?? null} signOutAction={signOutAction} />;
}
