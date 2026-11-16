"use client";

export default function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  void message; void onRetry;
  return null;
}
