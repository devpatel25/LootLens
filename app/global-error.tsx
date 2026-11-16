"use client";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  void error; void retry;
  return null;
}
