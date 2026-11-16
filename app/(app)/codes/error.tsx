"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState message="Codes could not load." onRetry={retry} />;
}
