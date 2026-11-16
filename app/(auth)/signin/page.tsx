import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import SignInCard from "@/components/SignInCard";
import { auth } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/authActions";
import { DEFAULT_AFTER_SIGNIN, safeCallbackUrl, signInErrorMessage } from "@/lib/signin";

export const metadata: Metadata = { title: "Sign in" };

async function SignInContent({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  // Auth.js touches crypto before it reads cookies; stop prerendering here.
  await connection();
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const session = await auth();
  if (session?.user?.id) redirect(callbackUrl);
  return <SignInCard action={signInWithGoogle} callbackUrl={callbackUrl} error={signInErrorMessage(params.error)} />;
}

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <Suspense fallback={<SignInCard action={signInWithGoogle} callbackUrl={DEFAULT_AFTER_SIGNIN} error={null} />}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
