import type { ReactNode } from "react";

export default function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  void title; void message; void action;
  return null;
}
