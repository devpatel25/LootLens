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
    expect(within(c).getByText("Ends Nov 30")).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: "Mark SAMBA40 dead" }));
    expect(onMark).toHaveBeenCalledWith("dead");
    cleanup();
    const dead = all().find((c) => c.code === "OLD25")!;
    const r = renderCard(dead, "dead");
    expect(within(card("OLD25")).getByText("Dead")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mark OLD25 alive" }));
    expect(r.onMark).toHaveBeenCalledWith("live");
  });

  it("tags stale and expired codes; an expired code cannot be marked", () => {
    renderCard(all().find((c) => c.code === "STALE15")!, "stale");
    expect(within(card("STALE15")).getByText("Not checked recently")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark STALE15 dead" })).toBeTruthy();
    cleanup();
    renderCard(all().find((c) => c.code === "EXPIRED20")!, "expired");
    expect(within(card("EXPIRED20")).getByText("Expired")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Mark EXPIRED20/ })).toBeNull();
  });
});

describe("CodesView", () => {
  const view = (codes: Code[], showDead = false) =>
    render(<CodesView codes={codes} showDead={showDead} freshnessHours={24} now={NOW} />);
  const listed = () =>
    within(screen.getByRole("list", { name: "Codes" }))
      .getAllByRole("listitem")
      .map((li) => li.getAttribute("aria-label"));

  it("populated: heading, Demo data badge, freshness note, one card per code", () => {
    view(live());
    expect(screen.getByRole("heading", { level: 1, name: "Codes" })).toBeTruthy();
    expect(screen.getByText("Demo data")).toBeTruthy();
    expect(screen.getByText("Codes checked in the last 24 hours that still work.")).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: "Mark SAMBA40 dead" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Mark SAMBA40 dead" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong. Try again.");
    expect(listed()).toContain("Code SAMBA40");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("Mark alive on a dead code shows it as live right away", async () => {
    view(all(), true);
    fireEvent.click(screen.getByRole("button", { name: "Mark OLD25 alive" }));
    expect(within(card("OLD25")).queryByText("Dead")).toBeNull();
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual({ status: "live" });
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
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
