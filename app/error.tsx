"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";

/** Catches errors from layouts below the root, such as the session read in app/(app)/layout.tsx. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto max-w-xl p-6">
      <ErrorState message="LootLens could not load. Try again in a moment." onRetry={retry} />
    </main>
  );
}
