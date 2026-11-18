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
  /** 1 when it is the whole screen (not-found), 3 when it sits inside a section that has its own h2. */
  headingLevel?: 1 | 2 | 3;
}) {
  const Heading = (["h1", "h2", "h3"] as const)[headingLevel - 1];
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      <Heading className="text-lg font-semibold">{title}</Heading>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      {action}
    </section>
  );
}
