import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Freshness window and first-order options will show here.</p>
    </>
  );
}
