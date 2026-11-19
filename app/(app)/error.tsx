"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Never show the raw message: in production it is a generic digest, and in dev it can leak details.
  return <ErrorState message="This screen could not load." onRetry={retry} />;
}
