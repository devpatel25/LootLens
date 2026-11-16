// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppNav, { NAV_ITEMS } from "@/components/AppNav";
import AppShell from "@/components/AppShell";
import UserMenu from "@/components/UserMenu";

const nav = vi.hoisted(() => ({ pathname: "/wishlist" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

afterEach(cleanup);
beforeEach(() => {
  nav.pathname = "/wishlist";
});

describe("AppNav", () => {
  it("links to every main screen", () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(["Wishlist", "Codes", "Alerts", "Settings"]);
    render(<AppNav />);
    const main = screen.getByRole("navigation", { name: "Main" });
    for (const { label, href } of NAV_ITEMS) {
      expect(within(main).getByRole("link", { name: label }).getAttribute("href")).toBe(href);
    }
  });

  it("marks only the current screen", () => {
    nav.pathname = "/codes";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Codes" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Wishlist" }).getAttribute("aria-current")).toBeNull();
  });

  it("keeps Wishlist current on an item page", () => {
    nav.pathname = "/items/abc";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Wishlist" }).getAttribute("aria-current")).toBe("page");
  });

  it("does not mark a screen whose name only starts the same way", () => {
    nav.pathname = "/codes-archive";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Codes" }).getAttribute("aria-current")).toBeNull();
  });
});

describe("UserMenu", () => {
  const signOutAction = vi.fn();

  it("starts closed and opens on click", () => {
    render(<UserMenu name="Demo Shopper" email="demo@lootlens.test" signOutAction={signOutAction} />);
    const toggle = screen.getByRole("button", { name: "Account menu for Demo Shopper" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("demo@lootlens.test")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("closes on Escape and returns focus to the toggle", () => {
    render(<UserMenu name="Demo Shopper" email="demo@lootlens.test" signOutAction={signOutAction} />);
    const toggle = screen.getByRole("button", { name: /Account menu/ });
    fireEvent.click(toggle);
    fireEvent.keyDown(screen.getByRole("button", { name: "Sign out" }), { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("puts Sign out inside a form so it works without client JS", () => {
    render(<UserMenu name="Demo Shopper" email="demo@lootlens.test" signOutAction={signOutAction} />);
    fireEvent.click(screen.getByRole("button", { name: /Account menu/ }));
    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button.closest("form")).not.toBeNull();
    expect(button.getAttribute("type")).toBe("submit");
  });

  it("falls back to the email, then a generic label, when the name is missing", () => {
    const { unmount } = render(<UserMenu name={null} email="x@y.test" signOutAction={signOutAction} />);
    expect(screen.getByRole("button", { name: "Account menu for x@y.test" })).toBeTruthy();
    unmount();
    render(<UserMenu name={null} email={null} signOutAction={signOutAction} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toBeTruthy();
  });
});

describe("AppShell", () => {
  it("renders header, main nav, user menu slot, and the page content", () => {
    render(
      <AppShell userMenu={<span>menu slot</span>}>
        <h1>Wishlist</h1>
      </AppShell>,
    );
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "LootLens home" }).getAttribute("href")).toBe("/wishlist");
    expect(within(header).getByText("menu slot")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(within(screen.getByRole("main")).getByRole("heading", { name: "Wishlist" })).toBeTruthy();
  });

  it("offers a skip link to the main content", () => {
    render(
      <AppShell userMenu={null}>
        <p>content</p>
      </AppShell>,
    );
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip.getAttribute("href")).toBe("#main");
    expect(screen.getByRole("main").id).toBe("main");
  });
});
