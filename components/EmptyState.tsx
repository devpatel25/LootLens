import type { ReactNode } from "react";

export default function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      {action}
    </section>
  );
}
