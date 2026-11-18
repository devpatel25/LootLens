import { Suspense, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import SessionUserMenu from "@/components/SessionUserMenu";

// Allowed to block on the server, so the nav (which reads the URL) is in the first HTML with the current
// tab marked. Page data below still streams behind each page's loading.tsx or its own <Suspense>.
export const instant = false;

function UserMenuPlaceholder() {
  return <span aria-hidden="true" className="size-9 animate-pulse rounded-full bg-zinc-200 motion-reduce:animate-none dark:bg-zinc-800" />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      userMenu={
        <Suspense fallback={<UserMenuPlaceholder />}>
          <SessionUserMenu />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
