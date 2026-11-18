// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useServerClock } from "@/lib/useNow";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const DEVICE = new Date("2026-10-29T17:00:00.000Z");
const minutes = (m: number) => m * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

beforeEach(() => {
  router.refresh.mockReset();
  vi.useFakeTimers({ now: DEVICE, toFake: ["Date", "setInterval", "clearInterval"] });
});
afterEach(() => vi.useRealTimers());

describe("useServerClock", () => {
  it("uses a small device clock offset at once, without asking the server again", () => {
    const { result } = renderHook(() => useServerClock(iso(DEVICE.getTime() + minutes(2))));
    expect(result.current.current().getTime()).toBe(DEVICE.getTime() + minutes(2));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  // Back navigation can restore a page whose server time is an hour old. Trusting that gap would keep a code
  // live after its window closed (Story 1), so the device clock is used and the page asks for fresh data once.
  it("does not trust a large gap: uses the device clock and refreshes once", () => {
    const { result, rerender } = renderHook(({ s }) => useServerClock(s), { initialProps: { s: iso(DEVICE.getTime() - minutes(60)) } });
    expect(result.current.current().getTime()).toBe(DEVICE.getTime());
    expect(router.refresh).toHaveBeenCalledTimes(1);
    rerender({ s: iso(DEVICE.getTime() - minutes(60)) });
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("trusts the server time that the refresh brings back, even when the device clock is far off", () => {
    const { result, rerender } = renderHook(({ s }) => useServerClock(s), { initialProps: { s: iso(DEVICE.getTime() - minutes(20 * 60)) } });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    rerender({ s: iso(DEVICE.getTime() - minutes(20 * 60) + 1000) });
    expect(result.current.current().getTime()).toBe(DEVICE.getTime() - minutes(20 * 60) + 1000);
    act(() => vi.advanceTimersByTime(60_000));
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
