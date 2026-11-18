"use client";

import Link from "next/link";

/** "Sign in" link that keeps the current page as the return address (stub for the red step). */
export default function SignInLink() {
  return (
    <Link href="/signin" className="text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300">
      Sign in
    </Link>
  );
}
