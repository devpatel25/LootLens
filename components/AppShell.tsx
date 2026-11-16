import Link from "next/link";
import type { ReactNode } from "react";
import AppNav from "@/components/AppNav";
import LogoMark from "@/components/LogoMark";

/** Signed-in frame: header with the user menu, bottom tab bar on mobile, left sidebar from md up. */
export default function AppShell({ userMenu, children }: { userMenu: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-[14rem_1fr] md:grid-rows-[auto_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow dark:focus:bg-zinc-900"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur md:col-span-2 dark:border-zinc-800 dark:bg-zinc-950/95">
        <Link
          href="/wishlist"
          aria-label="LootLens home"
          className="flex items-center gap-2 rounded-md text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {/* An icon, not a letter: the visible text stays "LootLens", inside the name "LootLens home" (WCAG 2.5.3). */}
          <LogoMark />
          <span>LootLens</span>
        </Link>
        {userMenu}
      </header>
      {/* No <Suspense> needed: app/(app)/layout.tsx sets instant = false, so this renders in the first HTML. */}
      <AppNav />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 focus:outline-none md:px-8 md:pb-10">
        {children}
      </main>
    </div>
  );
}
