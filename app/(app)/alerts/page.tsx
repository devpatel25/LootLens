import type { Metadata } from "next";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Price-drop and low-size alerts will show here.</p>
    </>
  );
}
