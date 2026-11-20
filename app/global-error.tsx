"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";
import "./globals.css";

/** Last resort when the root layout itself fails. It replaces the whole page, so it renders html and body. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-xl p-6">
          <ErrorState message="LootLens could not load. Try again in a moment." onRetry={retry} />
        </main>
      </body>
    </html>
  );
}
