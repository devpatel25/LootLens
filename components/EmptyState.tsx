import type { ReactNode } from "react";

export default function EmptyState({
  title,
  message,
  action,
  headingLevel = 2,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  /** Use 1 when the empty state is the whole screen (for example not-found). */
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      <Heading className="text-lg font-semibold">{title}</Heading>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      {action}
    </section>
  );
}
