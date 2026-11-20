export default function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-12 text-sm text-zinc-600 dark:text-zinc-300">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 motion-reduce:animate-none dark:border-zinc-600 dark:border-t-zinc-200"
      />
      <span>{label}…</span>
    </div>
  );
}
