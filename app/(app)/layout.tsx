import { Suspense, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import SessionUserMenu from "@/components/SessionUserMenu";

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
