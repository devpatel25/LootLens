"use client";

import type { Code } from "@/lib/types";

export type CodesViewProps = { codes: Code[]; showDead: boolean; freshnessHours: number; now: string };

export default function CodesView(props: CodesViewProps) {
  void props;
  return null;
}
