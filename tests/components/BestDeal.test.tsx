// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsError from "@/app/(app)/settings/error";
import SettingsLoading from "@/app/(app)/settings/loading";
import BestDealCard from "@/components/BestDealCard";
import CodeCard from "@/components/CodeCard";
import ItemDetailView from "@/components/ItemDetailView";
import SettingsForm from "@/components/SettingsForm";
import comparisonFixture from "@/fixtures/comparison.json";
import codesFixture from "@/fixtures/codes.json";
import { CONDITION_TAG } from "@/components/styles";
import type { Code, ItemComparison } from "@/lib/types";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/settings" }));

const demo = () => structuredClone(comparisonFixture) as ItemComparison;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const card = () => screen.getByRole("region", { name: "Best deal" });
const line = (label: string) => within(card()).getByRole("row", { name: new RegExp(`^${label}`) });

beforeEach(() => {
  router.refresh.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => json(200, { data: { freshnessHours: 24, firstOrderEligible: false } })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BestDealCard", () => {
  it("shows price minus the best code minus cashback, equal to the total from the API", () => {
    render(<BestDealCard comparison={demo()} />);
    expect(within(card()).getByText("Best total of the stores shown: $57.00 at Adidas")).toBeTruthy();
    expect(line("Price").textContent).toContain("$100.00");
    expect(line("Code SAMBA40").textContent).toContain("$40.00");
    expect(line("Cashback DemoCash 5%").textContent).toContain("$3.00");
    expect(line("Total").textContent).toContain("$57.00");
  });

  it("reads discounts as minus amounts for screen readers", () => {
    render(<BestDealCard comparison={demo()} />);
    const cell = within(line("Code SAMBA40")).getByRole("cell");
    expect(cell.textContent).toContain("minus $40.00");
    expect(within(cell).getByText("\u2212").getAttribute("aria-hidden")).toBe("true");
  });

  it("says amounts are rounded, so a one-cent gap between the parts and the total is explained", () => {
    const c = demo();
    // Walmart $92.50 with 10% off and 2% cashback: parts show 92.50, 9.25, 1.67; the total is 81.585 -> $81.59.
    c.bestDeal = {
      listingId: "lst-walmart", price: 92.5, code: { id: "x", code: "SAVE10", discount: 9.25 },
      cashback: { provider: "DemoCash", ratePct: 2, amount: 1.665 }, total: 81.585,
    };
    render(<BestDealCard comparison={c} />);
    expect(line("Cashback DemoCash 2%").textContent).toContain("$1.67");
    expect(line("Total").textContent).toContain("$81.59");
    expect(within(card()).getByText("Amounts are rounded to the cent, so the lines may not add up exactly.")).toBeTruthy();
  });

  it("flags a low-trust best deal store", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-kickswap", price: 118, code: null, cashback: null, total: 118 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("Low-trust")).toBeTruthy();
  });

  it("does not claim no stock when the best deal's listing is missing", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-gone", price: 1, code: null, cashback: null, total: 1 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).queryByText(/in stock/)).toBeNull();
    expect(within(card()).getByText("The best deal could not be shown. Refresh the page to try again.")).toBeTruthy();
  });

  it("uses the API's total, rounded only for display", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-adidas", price: 19.99, code: { id: "x", code: "FIVE", discount: 5 }, cashback: null, total: 14.989999999999998 };
    render(<BestDealCard comparison={c} />);
    expect(line("Total").textContent).toContain("$14.99");
  });

  it("says when no code applies and when there is no cashback", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-fbm", price: 60, code: null, cashback: null, total: 60 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("Best total of the stores shown: $60.00 at Facebook Marketplace")).toBeTruthy();
    expect(line("Code").textContent).toContain("No code applies");
    expect(line("Cashback").textContent).toContain("No cashback");
  });

  it("explains cashback is paid later by the provider", () => {
    render(<BestDealCard comparison={demo()} />);
    expect(within(card()).getByText("Cashback is paid back later by DemoCash, not taken off at checkout.")).toBeTruthy();
  });

  it("empty: says no store has the size", () => {
    const c = demo();
    c.bestDeal = null;
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("No store shown has size 9 in stock, so there is no best deal yet.")).toBeTruthy();
  });

  it("links to the settings that change which codes count", () => {
    render(<BestDealCard comparison={demo()} />);
    expect(within(card()).getByRole("link", { name: "Code settings" }).getAttribute("href")).toBe("/settings");
  });

  it("labels the best-deal listing's condition and demo source, like the table", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-fbm", price: 60, code: null, cashback: null, total: 60 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("Used")).toBeTruthy();
    expect(within(card()).getByText("Demo")).toBeTruthy();
  });

  it("when the best total is at a low-trust store, says why and names the best trusted total", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-kickswap", price: 118, code: null, cashback: null, total: 118 };
    c.bestTrustedDeal = { listingId: "lst-fbm", price: 60, code: null, cashback: null, total: 60 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("Low-trust")).toBeTruthy();
    expect(within(card()).getByText(/no HTTPS, under 20 photo reviews, and rating under 3\.5/)).toBeTruthy();
    expect(within(card()).getByText("Best trusted total of the stores shown: $60.00 at Facebook Marketplace")).toBeTruthy();
  });

  it("does not claim no trusted stock when the best trusted deal's listing is missing", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-kickswap", price: 118, code: null, cashback: null, total: 118 };
    c.bestTrustedDeal = { listingId: "lst-gone", price: 60, code: null, cashback: null, total: 60 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("The best trusted deal could not be shown. Refresh the page to try again.")).toBeTruthy();
    expect(within(card()).queryByText(/No trusted store shown has size/)).toBeNull();
  });

  it("ends the low-trust sentence when no reasons are listed", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-kickswap", price: 118, code: null, cashback: null, total: 118 };
    c.stores = c.stores.map((s) => (s.trust.lowTrust ? { ...s, trust: { lowTrust: true, reasons: [] } } : s));
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("This store looks low-trust.")).toBeTruthy();
  });

  it("uses the same condition chip colours as the comparison table (Resale is violet everywhere)", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-kickswap", price: 118, code: null, cashback: null, total: 118 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("Resale").className).toContain(CONDITION_TAG.resale.className);
  });

  it("says so when no trusted store has the size", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-kickswap", price: 118, code: null, cashback: null, total: 118 };
    c.bestTrustedDeal = null;
    render(<BestDealCard comparison={c} />);
    expect(within(card()).getByText("No trusted store shown has size 9 in stock.")).toBeTruthy();
  });

  it("shows the rounding note only when the rounded lines do not add up", () => {
    const c = demo();
    c.bestDeal = { listingId: "lst-fbm", price: 60, code: null, cashback: null, total: 60 };
    render(<BestDealCard comparison={c} />);
    expect(within(card()).queryByText(/rounded to the cent/)).toBeNull();
  });

  it("is part of Item Detail", () => {
    render(<ItemDetailView comparison={demo()} />);
    expect(card()).toBeTruthy();
  });
});

describe("cashback chip on code cards", () => {
  const codes = () => structuredClone(codesFixture) as Code[];
  const renderCard = (code: Code) =>
    render(
      <ul>
        <CodeCard code={code} state="live" now="2026-10-29T16:00:00.000Z" busy={false} onMark={() => {}} onCopied={() => {}} />
      </ul>,
    );

  it("shows provider and rate", () => {
    renderCard(codes()[0]);
    expect(screen.getByText("Cashback: DemoCash 5%")).toBeTruthy();
  });

  it("says No cashback when the store has none", () => {
    renderCard({ ...codes()[0], cashback: null });
    expect(screen.getByText("No cashback")).toBeTruthy();
  });
});

describe("SettingsForm", () => {
  it("shows every freshness option with the saved one selected, and the first-order toggle", () => {
    render(<SettingsForm settings={{ freshnessHours: 24, firstOrderEligible: false }} />);
    const group = screen.getByRole("radiogroup", { name: "Freshness window" });
    expect(within(group).getAllByRole("radio").map((r) => r.getAttribute("value"))).toEqual(["6", "12", "24", "48", "72"]);
    expect(within(group).getByRole<HTMLInputElement>("radio", { name: "24 hours" }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "I can use first-order codes" }).checked).toBe(false);
    expect(screen.getByText(/First-order-only codes do not count toward your best deal while this is off\./)).toBeTruthy();
  });

  it("saves both settings with PATCH, refreshes, and confirms", async () => {
    render(<SettingsForm settings={{ freshnessHours: 24, firstOrderEligible: false }} />);
    fireEvent.click(screen.getByRole("radio", { name: "48 hours" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "I can use first-order codes" }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/settings");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ freshnessHours: 48, firstOrderEligible: true });
    expect(screen.getByRole("status").textContent).toContain("Settings saved.");
  });

  it("shows a plain error and keeps the choices when saving fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "x" } }));
    render(<SettingsForm settings={{ freshnessHours: 24, firstOrderEligible: false }} />);
    fireEvent.click(screen.getByRole("radio", { name: "72 hours" }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Something went wrong. Try again.");
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "72 hours" }).checked).toBe(true);
  });

  it("clears Settings saved. once the user changes something again", async () => {
    render(<SettingsForm settings={{ freshnessHours: 24, firstOrderEligible: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Settings saved."));
    fireEvent.click(screen.getByRole("radio", { name: "6 hours" }));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("locks the choices while saving, so the saved values match what is shown", () => {
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>(() => {}));
    render(<SettingsForm settings={{ freshnessHours: 24, firstOrderEligible: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    // Disabled through <fieldset disabled>, which sets :disabled but not each input's own disabled property.
    expect(screen.getByRole("radio", { name: "72 hours" }).matches(":disabled")).toBe(true);
    expect(screen.getByRole("checkbox", { name: "I can use first-order codes" }).matches(":disabled")).toBe(true);
  });

  it("clears the error once the user changes something", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(500, { error: { code: "internal", message: "x" } }));
    render(<SettingsForm settings={{ freshnessHours: 24, firstOrderEligible: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("radio", { name: "6 hours" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("blocks a second save while one is in flight", () => {
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>(() => {}));
    render(<SettingsForm settings={{ freshnessHours: 24, firstOrderEligible: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Saving…" }).disabled).toBe(true);
  });

  it("route loading.tsx and error.tsx", () => {
    render(<SettingsLoading />);
    expect(screen.getByRole("status").textContent).toContain("Loading settings");
    cleanup();
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<SettingsError error={new Error("x")} retry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("Settings could not load.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
