"use client";

import type { CodeState } from "@/lib/codeStatus";
import type { Code } from "@/lib/types";

export type CodeCardProps = {
  code: Code;
  state: CodeState;
  now: string;
  busy: boolean;
  onMark: (status: "live" | "dead") => void;
  onCopied: (code: string) => void;
};

export default function CodeCard(props: CodeCardProps) {
  void props;
  return null;
}
