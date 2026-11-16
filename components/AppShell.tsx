import type { ReactNode } from "react";

export default function AppShell({ userMenu, children }: { userMenu: ReactNode; children: ReactNode }) {
  void userMenu;
  return <>{children}</>;
}
