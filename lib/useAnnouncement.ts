"use client";

import { useCallback, useState } from "react";

/**
 * A polite status message for a role="status" region. Render it as <span key={seq}>{message}</span>: each
 * announcement gets a fresh seq, so screen readers read a repeated message again.
 */
export function useAnnouncement(): [{ message: string; seq: number }, (text: string) => void] {
  const [announcement, setAnnouncement] = useState({ message: "", seq: 0 });
  const announce = useCallback((text: string) => setAnnouncement((a) => ({ message: text, seq: a.seq + 1 })), []);
  return [announcement, announce];
}
