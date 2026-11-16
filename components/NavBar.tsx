import Link from "next/link";
import AlertsBadge from "@/components/AlertsBadge";
import type { ReactNode } from "react";
import { isUnder } from "@/lib/paths";

type NavItem = { href: string; label: string; also?: string[]; icon: ReactNode; badge?: boolean };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/wishlist",
    label: "Wishlist",
    also: ["/items"],
    icon: <path {...stroke} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  },
  {
    href: "/codes",
    label: "Codes",
    icon: (
      <>
        <path {...stroke} d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      </>
    ),
  },
  {
    href: "/alerts",
    label: "Alerts",
    badge: true,
    icon: <path {...stroke} d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4a2 2 0 0 0 4 0" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <>
        <circle {...stroke} cx="12" cy="12" r="3" />
        <path {...stroke} d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1" />
      </>
    ),
  },
];

export function isCurrent(pathname: string, item: Pick<NavItem, "href" | "also">): boolean {
  return [item.href, ...(item.also ?? [])].some((base) => isUnder(pathname, base));
}

/** The Main nav. `pathname` null renders it with nothing marked current. */
export default function NavBar({ pathname }: { pathname: string | null }) {
  return (

    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-14 md:z-auto md:h-[calc(100dvh-3.5rem)] md:self-start md:overflow-y-auto md:border-t-0 md:border-r md:bg-transparent md:pb-0 md:backdrop-blur-none dark:border-zinc-800 dark:bg-zinc-950/95 md:dark:bg-transparent"
    >
      <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1 md:p-3">
        {NAV_ITEMS.map((item) => {
          const current = pathname !== null && isCurrent(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                aria-describedby={item.badge ? "nav-alerts-unread" : undefined}
                className={[
                  "relative flex flex-col items-center gap-1 px-2 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700",
                  "md:flex-row md:gap-3 md:rounded-lg md:px-3 md:text-sm",
                  current
                    ? "text-emerald-800 md:bg-emerald-50 dark:text-emerald-300 md:dark:bg-emerald-950"
                    : "text-zinc-600 hover:text-zinc-900 md:hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 md:dark:hover:bg-zinc-900",
                ].join(" ")}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 md:size-5">
                  {item.icon}
                </svg>
                <span>{item.label}</span>
                {item.badge && <AlertsBadge describedById="nav-alerts-unread" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
