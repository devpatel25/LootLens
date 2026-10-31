import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">LootLens</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Price and promo-code tracker. Work in progress.
      </p>
      <Link href="/compare/item-samba" className="text-sm font-medium underline">
        Compare prices: Adidas Samba OG (demo data)
      </Link>
    </main>
  );
}
