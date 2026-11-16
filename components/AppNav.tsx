"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";

export { NAV_ITEMS, isCurrent } from "@/components/NavBar";

/** Reads the URL, so AppShell renders it inside <Suspense> with a NavBar fallback. */
export default function AppNav() {
  return <NavBar pathname={usePathname()} />;
}
