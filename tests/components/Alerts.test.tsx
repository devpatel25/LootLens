// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AlertsError from "@/app/(app)/alerts/error";
import AlertsLoading from "@/app/(app)/alerts/loading";
import AlertsBadge from "@/components/AlertsBadge";
import AlertsView, { POLL_MS } from "@/components/AlertsView";
import RefreshButton from "@/components/RefreshButton";
import WatchPanel from "@/components/WatchPanel";
import alertsFixture from "@/fixtures/alerts.json";
import comparisonFixture from "@/fixtures/comparison.json";
import type { WatchWithItem } from "@/lib/alertsData";
import { ALERTS_CHANGED } from "@/lib/alertText";
import type { AlertsResponse, ItemComparison, Watch } from "@/lib/types";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/alerts" }));

const NOW = "2026-10-29T16:00:00.000Z";
const item = () => (structuredClone(comparisonFixture) as ItemComparison).item;
const alerts = () => structuredClone(alertsFixture) as AlertsResponse;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const watch: Watch = {
  id: "watch-samba", itemId: "item-samba", size: "9", targetPrice: null, lowStockAt: 3, baselinePrice: 60, active: true,
  createdAt: "2026-10-28T12:00:00.000Z",
};
const watches = (): WatchWithItem[] => [{ ...watch, itemName: "Adidas Samba OG" }];

beforeEach(() => {
  router.refresh.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => json(200, { data: {} })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("WatchPanel", () => {
  const panel = () => screen.getByRole("region", { name: "Price watch" });
  const renderPanel = (w: Watch | null = null, cheapestPrice: number | null = 60) =>
    render(<WatchPanel item={item()} watch={w} cheapestPrice={cheapestPrice} />);

  it("offers any drop by default with a low-stock threshold of 3", () => {
    renderPanel();
    expect(within(panel()).getByRole<HTMLInputElement>("radio", { name: "Any price drop" }).checked).toBe(true);
    expect(within(panel()).getByLabelText<HTMLInputElement>("Target price (USD)").disabled).toBe(true);
    expect(within(panel()).getByLabelText<HTMLInputElement>("Low-stock alert at").value).toBe("3");
  });

  it("creates a watch for the saved size with POST, then refreshes and confirms", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(201, { data: watch }));
    renderPanel();
    fireEvent.click(within(panel()).getByRole("button", { name: "Watch this item" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/watches");
    expect(JSON.parse(String(init?.body))).toEqual({ itemId: "item-samba", size: "9", targetPrice: null, lowStockAt: 3 });
    expect(screen.getByRole("status").textContent).toContain("Watching size 9.");
  });

  it("sends a target price when chosen", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(201, { data: watch }));
    renderPanel();
    fireEvent.click(within(panel()).getByRole("radio", { name: "At or below a target price" }));
    fireEvent.change(within(panel()).getByLabelText("Target price (USD)"), { target: { value: "55.50" } });
    fireEvent.change(within(panel()).getByLabelText("Low-stock alert at"), { target: { value: "0" } });
    fireEvent.click(within(panel()).getByRole("button", { name: "Watch this item" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ targetPrice: 55.5, lowStockAt: 0 });
  });

  it.each([
    ["", "Enter a target price like 49.99."],
    ["abc", "Enter a target price like 49.99."],
    ["60", "Pick a target below today's cheapest price, $60.00."],
    ["75", "Pick a target below today's cheapest price, $60.00."],
  ])("rejects target %s before calling the API", (value, message) => {
    renderPanel();
    fireEvent.click(within(panel()).getByRole("radio", { name: "At or below a target price" }));
    fireEvent.change(within(panel()).getByLabelText("Target price (USD)"), { target: { value } });
    fireEvent.click(within(panel()).getByRole("button", { name: "Watch this item" }));
    expect(within(panel()).getByText(message)).toBeTruthy();
    expect(within(panel()).getByLabelText("Target price (USD)").getAttribute("aria-invalid")).toBe("true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["-1", "51", "2.5", ""])("rejects low-stock %s", (value) => {
    renderPanel();
    fireEvent.change(within(panel()).getByLabelText("Low-stock alert at"), { target: { value } });
    fireEvent.click(within(panel()).getByRole("button", { name: "Watch this item" }));
    expect(within(panel()).getByText("Enter a whole number from 0 to 50.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [409, "watch_exists", "You already watch this item in size 9."],
    [409, "watch_limit", "You can watch up to 10 items. Delete one on the Alerts page first."],
    [400, "no_listing", "No store has size 9 in stock right now, so there is no price to watch."],
    [500, "internal", "Something went wrong. Try again."],
  ])("explains a %s %s from the API", async (status, code, message) => {
    vi.mocked(fetch).mockResolvedValueOnce(json(status, { error: { code, message: "dev text" } }));
    renderPanel();
    fireEvent.click(within(panel()).getByRole("button", { name: "Watch this item" }));
    expect((await within(panel()).findByRole("alert")).textContent).toContain(message);
  });

  it("with no stock in the size, explains instead of showing the form", () => {
    renderPanel(null, null);
    expect(within(panel()).getByText("No store has size 9 in stock right now, so there is no price to watch.")).toBeTruthy();
    expect(within(panel()).queryByRole("button", { name: "Watch this item" })).toBeNull();
  });

  it("an active watch shows what it alerts on and can be deleted after confirming", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(200, { data: { id: "watch-samba" } }));
    renderPanel(watch);
    expect(within(panel()).getByText("Size 9: any price drop below $60.00, and when 3 or fewer are left.")).toBeTruthy();
    fireEvent.click(within(panel()).getByRole("button", { name: "Delete watch" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete this watch?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/watches/watch-samba");
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("DELETE");
  });
});

describe("RefreshButton", () => {
  it("shows progress, then refreshes the page and tells other parts alerts changed", async () => {
    let finish: (r: Response) => void = () => {};
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((r) => (finish = r)));
    const changed = vi.fn();
    window.addEventListener(ALERTS_CHANGED, changed);
    render(<RefreshButton itemId="item-samba" />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Refreshing…" }).disabled).toBe(true);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/items/item-samba/refresh");
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("POST");
    await act(async () => finish(json(200, { data: { comparison: {}, alertsCreated: 1 } })));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("Prices updated. 1 new alert.");
    window.removeEventListener(ALERTS_CHANGED, changed);
  });

  it.each([
    [0, "Prices updated."],
    [2, "Prices updated. 2 new alerts."],
  ])("counts %i new alerts", async (n, text) => {
    vi.mocked(fetch).mockResolvedValueOnce(json(200, { data: { comparison: {}, alertsCreated: n } }));
    render(<RefreshButton itemId="item-samba" />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain(text));
  });

  it.each([
    [45, "Prices were refreshed a moment ago. Try again in 45 seconds."],
    [120, "Prices were refreshed a moment ago. Try again in 2 minutes."],
    [61, "Prices were refreshed a moment ago. Try again in 2 minutes."],
  ])("explains the rate limit with the wait (%i s)", async (retryAfterSeconds, text) => {
    vi.mocked(fetch).mockResolvedValueOnce(json(429, { error: { code: "rate_limited", message: "x", retryAfterSeconds } }));
    render(<RefreshButton itemId="item-samba" />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain(text));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("shows an error alert when the refresh fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "x" } }));
    render(<RefreshButton itemId="item-samba" />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Something went wrong. Try again.");
  });
});

describe("AlertsView", () => {
  const view = (data = alerts(), w = watches()) => render(<AlertsView data={data} watches={w} now={NOW} anyDemo />);
  const group = (name: string) => screen.getByRole("region", { name });

  it("populated: groups alerts by item with unread counts and plain text", () => {
    view();
    expect(screen.getByRole("heading", { level: 1, name: "Alerts" })).toBeTruthy();
    expect(screen.getByText("3 unread")).toBeTruthy();
    expect(screen.getByText("Demo data")).toBeTruthy();
    const samba = group("Adidas Samba OG");
    expect(within(samba).getByRole("link", { name: "Adidas Samba OG" }).getAttribute("href")).toBe("/items/item-samba");
    expect(within(samba).getByText("2 unread")).toBeTruthy();
    expect(within(samba).getByText("Price dropped from $84.99 to $60.00")).toBeTruthy();
    expect(within(samba).getByText("Only 1 left in your size")).toBeTruthy();
    expect(within(samba).getAllByText("New")).toHaveLength(2);
    expect(within(samba).getByText("1h ago")).toBeTruthy();
    expect(within(group("Nike Pegasus 41")).getByText("Out of stock in your size")).toBeTruthy();
  });

  it("Mark read saves, refreshes, and tells the badge", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(200, { data: {} }));
    const changed = vi.fn();
    window.addEventListener(ALERTS_CHANGED, changed);
    view();
    fireEvent.click(screen.getByRole("button", { name: "Mark read: Price dropped from $84.99 to $60.00" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/alerts/alert-1");
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual({ read: true });
    expect(changed).toHaveBeenCalled();
    window.removeEventListener(ALERTS_CHANGED, changed);
  });

  it("a read alert offers Mark unread, and Clear read alerts removes them", async () => {
    const data = alerts();
    data.groups[0].alerts[0].read = true;
    data.groups[0].unread = 1;
    data.unreadCount = 2;
    vi.mocked(fetch).mockResolvedValueOnce(json(200, { data: { deleted: 1 } }));
    view(data);
    expect(screen.getByRole("button", { name: "Mark unread: Price dropped from $84.99 to $60.00" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear read alerts" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/alerts/clear");
    expect(screen.getByRole("status").textContent).toContain("Cleared 1 read alert.");
  });

  it("hides Clear read alerts when nothing is read", () => {
    view();
    expect(screen.queryByRole("button", { name: "Clear read alerts" })).toBeNull();
  });

  it("empty: explains how alerts appear", () => {
    view({ groups: [], unreadCount: 0 }, []);
    expect(screen.getByRole("heading", { name: "No alerts yet" })).toBeTruthy();
    expect(screen.getByText("No active watches.")).toBeTruthy();
  });

  it("lists active watches and deletes one after confirming", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(200, { data: { id: "watch-samba" } }));
    view();
    const list = screen.getByRole("list", { name: "Active watches" });
    expect(within(list).getByText("Size 9: any price drop below $60.00, and when 3 or fewer are left.")).toBeTruthy();
    fireEvent.click(within(list).getByRole("button", { name: "Delete watch for Adidas Samba OG" }));
    fireEvent.click(within(screen.getByRole("alertdialog", { name: "Delete the watch for Adidas Samba OG?" })).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/watches/watch-samba");
    expect(screen.getByRole("status").textContent).toContain("Deleted the watch for Adidas Samba OG.");
  });

  it("re-reads alerts from the server every 60 seconds", () => {
    vi.useFakeTimers();
    view();
    expect(POLL_MS).toBe(60_000);
    act(() => vi.advanceTimersByTime(60_000));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(60_000));
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });
});

describe("AlertsBadge", () => {
  it("shows the unread count and describes it in words", async () => {
    vi.mocked(fetch).mockResolvedValue(json(200, { data: { groups: [], unreadCount: 3 } }));
    render(<AlertsBadge describedById="badge-desc" />);
    expect(await screen.findByText("3")).toBeTruthy();
    expect(document.getElementById("badge-desc")?.textContent).toBe("3 unread alerts");
  });

  it("shows nothing at zero or when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValue(json(200, { data: { groups: [], unreadCount: 0 } }));
    const { container, unmount } = render(<AlertsBadge describedById="badge-desc" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.textContent).toBe("");
    unmount();
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    const r = render(<AlertsBadge describedById="badge-desc" />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(r.container.textContent).toBe("");
  });

  it("refetches when told alerts changed", async () => {
    vi.mocked(fetch).mockResolvedValue(json(200, { data: { groups: [], unreadCount: 1 } }));
    render(<AlertsBadge describedById="badge-desc" />);
    await screen.findByText("1");
    vi.mocked(fetch).mockResolvedValue(json(200, { data: { groups: [], unreadCount: 4 } }));
    act(() => {
      window.dispatchEvent(new Event(ALERTS_CHANGED));
    });
    expect(await screen.findByText("4")).toBeTruthy();
  });
});

describe("Alerts route states", () => {
  it("loading and error", () => {
    render(<AlertsLoading />);
    expect(screen.getByRole("status").textContent).toContain("Loading alerts");
    cleanup();
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AlertsError error={new Error("x")} retry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("Alerts could not load.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
