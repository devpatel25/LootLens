// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CodesError from "@/app/(app)/codes/error";
import CodesLoading from "@/app/(app)/codes/loading";
import CodeCard from "@/components/CodeCard";
import CodesView from "@/components/CodesView";
import liveFixture from "@/fixtures/codes.json";
import allFixture from "@/fixtures/codes-all.json";
import type { Code } from "@/lib/types";

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/codes" }));

const NOW = "2026-10-29T16:00:00.000Z";
const live = () => structuredClone(liveFixture) as Code[];
const all = () => structuredClone(allFixture) as Code[];
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const card = (code: string) => screen.getByRole("listitem", { name: `Code ${code}` });
const writeText = vi.fn(async () => {});

beforeEach(() => {
  router.refresh.mockReset();
  router.push.mockReset();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  vi.stubGlobal("fetch", vi.fn(async () => json(200, { data: {} })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CodeCard", () => {
  const samba = () => live().find((c) => c.code === "SAMBA40")!;
  const renderCard = (code: Code, state: "live" | "dead" | "stale" | "expired" = "live") => {
    const onMark = vi.fn();
    const onCopied = vi.fn();
    render(
      <ul>
        <CodeCard code={code} state={state} now={NOW} busy={false} onMark={onMark} onCopied={onCopied} />
      </ul>,
    );
    return { onMark, onCopied };
  };

  it("shows the code, discount, store, terms, and when it was checked", () => {
    renderCard(samba());
    const c = card("SAMBA40");
    expect(within(c).getByText("SAMBA40")).toBeTruthy();
    expect(within(c).getByText(samba().label)).toBeTruthy();
    expect(within(c).getByText("Adidas")).toBeTruthy();
    expect(within(c).getByText("Min spend $80.00")).toBeTruthy();
    expect(within(c).getByText("Ends in 31d")).toBeTruthy();
    expect(within(c).getByText("checked 3h ago")).toBeTruthy();
  });

  it("lists first-order-only as a term", () => {
    renderCard(live().find((c) => c.code === "WELCOME50")!);
    expect(within(card("WELCOME50")).getByText("First order only")).toBeTruthy();
  });

  it("says when there are no extra terms", () => {
    renderCard({ ...samba(), minSpend: null, expiresAt: null, firstOrderOnly: false });
    expect(within(card("SAMBA40")).getByText("No extra terms")).toBeTruthy();
  });

  it("copies the code to the clipboard", async () => {
    const { onCopied } = renderCard(samba());
    fireEvent.click(screen.getByRole("button", { name: "Copy code SAMBA40" }));
    await waitFor(() => expect(onCopied).toHaveBeenCalledWith("SAMBA40"));
    expect(writeText).toHaveBeenCalledWith("SAMBA40");
  });

  it("live code offers Mark dead; dead code offers Mark alive with a Dead tag", () => {
    const { onMark } = renderCard(samba());
    fireEvent.click(screen.getByRole("button", { name: "Mark dead SAMBA40" }));
    expect(onMark).toHaveBeenCalledWith("dead", "Mark dead SAMBA40");
    cleanup();
    const dead = all().find((c) => c.code === "OLD25")!;
    const r = renderCard(dead, "dead");
    expect(within(card("OLD25")).getByText("Dead")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mark alive OLD25" }));
    expect(r.onMark).toHaveBeenCalledWith("live", "Mark alive OLD25");
  });

  it("a dead code whose end date has passed says Ended, not Ends in", () => {
    renderCard({ ...all().find((c) => c.code === "OLD25")!, expiresAt: "2026-10-01T00:00:00.000Z" }, "dead");
    const c = card("OLD25");
    expect(within(c).getByText("Ended")).toBeTruthy();
    expect(within(c).queryByText(/Ends in/)).toBeNull();
  });

  it("a dead code past its end date cannot be marked alive (it would stamp an ended code as working)", () => {
    const ended = { ...all().find((c) => c.code === "OLD25")!, expiresAt: "2026-10-01T00:00:00.000Z" };
    renderCard(ended, "dead");
    expect(screen.queryByRole("button", { name: "Mark alive OLD25" })).toBeNull();
  });

  it("a code not checked recently can be confirmed with Still works, or marked dead", () => {
    const { onMark } = renderCard(all().find((c) => c.code === "STALE15")!, "stale");
    fireEvent.click(screen.getByRole("button", { name: "Still works STALE15" }));
    expect(onMark).toHaveBeenCalledWith("live", "Still works STALE15");
    expect(screen.getByRole("button", { name: "Mark dead STALE15" })).toBeTruthy();
  });

  it("tags stale and expired codes; an expired code cannot be marked", () => {
    renderCard(all().find((c) => c.code === "STALE15")!, "stale");
    expect(within(card("STALE15")).getByText("Not checked recently")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark dead STALE15" })).toBeTruthy();
    cleanup();
    renderCard(all().find((c) => c.code === "EXPIRED20")!, "expired");
    expect(within(card("EXPIRED20")).getByText("Expired")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Mark (dead|alive) EXPIRED20$/ })).toBeNull();
  });
});

describe("CodesView", () => {
  // The device clock agrees with the fixture's server time, as it does in a real visit. A big gap makes the
  // view refresh once (tested in tests/useServerClock.test.tsx), which would add to the refresh counts here.
  beforeEach(() => vi.useFakeTimers({ now: new Date(NOW), toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());
  const view = (codes: Code[], showDead = false) =>
    render(<CodesView codes={codes} showDead={showDead} freshnessHours={24} now={NOW} />);
  // "Dead" as a whole word: getByText("Dead") alone would not match DEADDEAL, but keep it explicit.
  // Cards only: each card also holds a nested Terms list.
  const listed = () => {
    const list = screen.getByRole("list", { name: "Codes" });
    return within(list)
      .getAllByRole("listitem")
      .filter((li) => li.parentElement === list)
      .map((li) => li.getAttribute("aria-label"));
  };

  it("populated: heading, Demo data badge, freshness note, one card per code", () => {
    view(live());
    expect(screen.getByRole("heading", { level: 1, name: "Codes" })).toBeTruthy();
    const header = screen.getByRole("heading", { level: 1, name: "Codes" }).closest("div")!.parentElement!;
    expect(within(header).getByText("Demo data")).toBeTruthy();
    expect(within(header).getByText("Codes checked in the last 24 hours that still work.")).toBeTruthy();
    expect(listed()).toEqual(["Code SAMBA40", "Code WELCOME50", "Code SAVE30"]);
  });

  it("Show dead codes is off by default and toggling it changes the URL", () => {
    view(live());
    const toggle = screen.getByRole("checkbox", { name: "Show dead codes" });
    expect((toggle as HTMLInputElement).checked).toBe(false);
    fireEvent.click(toggle);
    expect(router.push).toHaveBeenCalledWith("/codes?showDead=true");
  });

  it("with Show dead codes on, lists every code with its state, and can turn it off", () => {
    view(all(), true);
    expect(listed()).toHaveLength(6);
    expect(within(card("OLD25")).getByText("Dead")).toBeTruthy();
    expect(within(card("STALE15")).getByText("Not checked recently")).toBeTruthy();
    expect(within(card("EXPIRED20")).getByText("Expired")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Show dead codes" }));
    expect(router.push).toHaveBeenCalledWith("/codes");
  });

  it("filters by store and by search, and can clear both", () => {
    const codes = [...live(), { ...live()[0], id: "x", code: "WALMART5", storeId: "store-walmart", storeName: "Walmart", label: "5% off" }];
    view(codes);
    fireEvent.change(screen.getByLabelText("Store"), { target: { value: "Walmart" } });
    expect(listed()).toEqual(["Code WALMART5"]);
    fireEvent.change(screen.getByLabelText("Store"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Search codes"), { target: { value: "welcome" } });
    expect(listed()).toEqual(["Code WELCOME50"]);
    fireEvent.change(screen.getByLabelText("Search codes"), { target: { value: "zzz" } });
    expect(screen.getByRole("heading", { name: "No codes match" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(listed()).toHaveLength(4);
  });

  it("empty: explains why there are no codes", () => {
    view([]);
    expect(screen.getByRole("heading", { name: "No live codes right now" })).toBeTruthy();
  });

  it("Mark dead hides the code at once, then saves and refreshes", async () => {
    let finish: (r: Response) => void = () => {};
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((r) => (finish = r)));
    view(live());
    fireEvent.click(screen.getByRole("button", { name: "Mark dead SAMBA40" }));
    expect(listed()).toEqual(["Code WELCOME50", "Code SAVE30"]);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/codes/code-adidas-40");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ status: "dead" });
    await act(async () => finish(json(200, { data: {} })));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("Marked SAMBA40 dead.");
  });

  it("brings the code back and explains when Mark dead fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "boom" } }));
    view(live());
    fireEvent.click(screen.getByRole("button", { name: "Mark dead SAMBA40" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong. Try again.");
    expect(listed()).toContain("Code SAMBA40");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("Mark alive on a dead code shows it as live right away", async () => {
    view(all(), true);
    fireEvent.click(screen.getByRole("button", { name: "Mark alive OLD25" }));
    expect(within(card("OLD25")).queryByText("Dead")).toBeNull();
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual({ status: "live" });
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });

  it("after a refresh, the server's data wins over an earlier optimistic mark", async () => {
    const { rerender } = view(all(), true);
    fireEvent.click(screen.getByRole("button", { name: "Mark alive OLD25" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    // Someone else marked it dead again; the refreshed props carry a newer check time.
    const fresh = all().map((c) => (c.code === "OLD25" ? { ...c, status: "dead" as const, lastCheckedAt: "2026-10-29T15:59:00.000Z" } : c));
    rerender(<CodesView codes={fresh} showDead freshnessHours={24} now={NOW} />);
    expect(within(card("OLD25")).getByText("Dead", { exact: true })).toBeTruthy();
  });

  it("a failed mark restores the earlier optimistic state, not the stale server one", async () => {
    view(all(), true);
    fireEvent.click(screen.getByRole("button", { name: "Mark alive OLD25" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "x" } }));
    fireEvent.click(screen.getByRole("button", { name: "Mark dead OLD25" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(within(card("OLD25")).queryByText("Dead", { exact: true })).toBeNull();
    expect(screen.getByRole("button", { name: "Mark dead OLD25" })).toBeTruthy();
  });

  it("marking a code dead while filtered keeps the filter and moves focus to the list", async () => {
    view(live());
    fireEvent.change(screen.getByLabelText("Store"), { target: { value: "Adidas" } });
    const button = screen.getByRole("button", { name: "Mark dead SAMBA40" });
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("list", { name: "Codes" })));
    expect(listed()).toEqual(["Code WELCOME50", "Code SAVE30"]);
    expect((screen.getByLabelText("Store") as HTMLSelectElement).value).toBe("Adidas");
  });

  it("keeps the selected store in the menu after its codes leave the list", () => {
    const { rerender } = view(live());
    fireEvent.change(screen.getByLabelText("Store"), { target: { value: "Adidas" } });
    rerender(<CodesView codes={[]} showDead={false} freshnessHours={24} now={NOW} />);
    expect((screen.getByLabelText("Store") as HTMLSelectElement).value).toBe("Adidas");
  });

  it("hides a live code once the clock passes its freshness window, without a reload", () => {
    vi.useFakeTimers({ now: new Date(NOW), toFake: ["Date", "setInterval", "clearInterval"] });
    try {
      view(live());
      expect(listed()).toHaveLength(3);
      act(() => {
        vi.setSystemTime(new Date("2026-10-30T14:00:00.000Z"));
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.queryByRole("list", { name: "Codes" })).toBeNull();
      expect(screen.getByRole("heading", { name: "No live codes right now" })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("the toggle keeps search text", () => {
    const { rerender } = view(live());
    fireEvent.change(screen.getByLabelText("Search codes"), { target: { value: "save" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Show dead codes" }));
    rerender(<CodesView codes={all()} showDead freshnessHours={24} now={NOW} />);
    expect((screen.getByLabelText("Search codes") as HTMLInputElement).value).toBe("save");
    expect((screen.getByRole("checkbox", { name: "Show dead codes" }) as HTMLInputElement).checked).toBe(true);
  });

  it("with Show dead codes on and no codes, does not tell you to turn it on", () => {
    view([], true);
    expect(screen.getByRole("heading", { name: "No codes yet" })).toBeTruthy();
    expect(screen.queryByText(/Turn on Show dead codes/)).toBeNull();
  });

  it("a device clock that runs fast does not hide codes the server called live", () => {
    // The device thinks it is 20 hours later than the server does.
    vi.useFakeTimers({ now: new Date("2026-10-30T12:00:00.000Z"), toFake: ["Date", "setInterval", "clearInterval"] });
    try {
      const { rerender } = view(live());
      // A 20-hour gap is not trusted until the page has asked the server again; the refresh brings a fresh time.
      expect(router.refresh).toHaveBeenCalledTimes(1);
      rerender(<CodesView codes={live()} showDead={false} freshnessHours={24} now="2026-10-29T16:00:01.000Z" />);
      act(() => vi.advanceTimersByTime(60_000));
      expect(listed()).toHaveLength(3);
      expect(within(card("SAMBA40")).getByText("checked 3h ago")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a newer server time after a refresh is used at once", () => {
    const { rerender } = view(live());
    rerender(<CodesView codes={live()} showDead={false} freshnessHours={24} now="2026-10-29T18:00:00.000Z" />);
    expect(within(card("SAMBA40")).getByText("checked 5h ago")).toBeTruthy();
  });

  it("when Mark dead fails, focus goes back to that code's button", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "x" } }));
    view(live());
    const button = screen.getByRole("button", { name: "Mark dead SAMBA40" });
    button.focus();
    fireEvent.click(button);
    await screen.findByRole("alert");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Mark dead SAMBA40" })));
  });

  it("a failed Mark dead on a code not checked recently returns focus to Mark dead, not to Still works", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "x" } }));
    view(all(), true);
    fireEvent.click(screen.getByRole("button", { name: "Mark dead STALE15" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Mark dead STALE15" })));
  });

  it("a code with a quote or backslash in it still gets focus back after a failed mark, without crashing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "x" } }));
    const odd = live().map((c) => (c.code === "SAMBA40" ? { ...c, code: 'SAM"BA\\40' } : c));
    view(odd);
    const name = 'Mark dead SAM"BA\\40';
    fireEvent.click(screen.getByRole("button", { name }));
    await screen.findByRole("alert");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name })));
  });

  it("announces a copy", async () => {
    view(live());
    fireEvent.click(screen.getByRole("button", { name: "Copy code SAVE30" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Copied SAVE30."));
  });

  it("explains when the clipboard is blocked", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    view(live());
    fireEvent.click(screen.getByRole("button", { name: "Copy code SAVE30" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Could not copy. Select the code and copy it yourself.");
  });
});

describe("Codes route states", () => {
  it("loading.tsx announces loading", () => {
    render(<CodesLoading />);
    expect(screen.getByRole("status").textContent).toContain("Loading codes");
  });

  it("error.tsx shows an alert and retries", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CodesError error={new Error("x")} retry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("Codes could not load.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
