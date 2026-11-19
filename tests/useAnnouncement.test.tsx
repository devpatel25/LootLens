// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAnnouncement } from "@/lib/useAnnouncement";

describe("useAnnouncement", () => {
  it("gives a new seq for every announcement, even with the same text, so it is read again", () => {
    const { result } = renderHook(() => useAnnouncement());
    act(() => result.current[1]("Saved."));
    expect(result.current[0]).toEqual({ message: "Saved.", seq: 1 });
    act(() => result.current[1]("Saved."));
    expect(result.current[0]).toEqual({ message: "Saved.", seq: 2 });
  });
});
