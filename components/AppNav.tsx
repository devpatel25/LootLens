"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";

/** The Main nav with the current tab marked. NAV_ITEMS and isCurrent live in components/NavBar.tsx. */
export default function AppNav() {
  return <NavBar pathname={usePathname()} />;
}
