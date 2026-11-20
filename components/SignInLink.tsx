"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signInUrl } from "@/lib/signin";

/** "Sign in" link that keeps the current page, with its query, as the return address. Render inside <Suspense>. */
export default function SignInLink() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return (
    <Link
      href={signInUrl(pathname, search ? `?${search}` : "")}
      className="text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
    >
      Sign in
    </Link>
  );
}
