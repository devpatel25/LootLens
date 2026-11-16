import type { Metadata } from "next";

export const metadata: Metadata = { title: "Codes" };

export default function CodesPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Codes</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Live promo codes, checked recently, will show here.</p>
    </>
  );
}
