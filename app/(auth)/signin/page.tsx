import type { Metadata } from "next";
import SignInCard from "@/components/SignInCard";
import { signInWithGoogle } from "@/lib/authActions";
import { safeCallbackUrl, signInErrorMessage } from "@/lib/signin";

export const metadata: Metadata = { title: "Sign in" };

// Render on the server before sending, with no streaming boundary: the callbackUrl and any error are in the
// first HTML, so sign-in works before JavaScript loads. Signed-in visitors never reach this page; the proxy
// sends them on to their callbackUrl (lib/authConfig.ts routeDecision).
export const instant = false;

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const params = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <SignInCard action={signInWithGoogle} callbackUrl={safeCallbackUrl(params.callbackUrl)} error={signInErrorMessage(params.error)} />
    </main>
  );
}
