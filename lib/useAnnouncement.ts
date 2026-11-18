"use client";

/** A polite status message that is announced again even when the text repeats (stub for the red step). */
export function useAnnouncement(): [{ message: string; seq: number }, (text: string) => void] {
  return [{ message: "", seq: 0 }, () => {}];
}
