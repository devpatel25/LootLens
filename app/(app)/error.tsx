"use client";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  void error; void retry;
  return null;
}
