// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootError from "@/app/error";
import GlobalError from "@/app/global-error";
import LogoMark from "@/components/LogoMark";
import SessionUserMenu from "@/components/SessionUserMenu";
import UserMenu from "@/components/UserMenu";

const auth = vi.hoisted(() => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth", () => auth);
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("redirect called"); }), usePathname: () => "/wishlist" }));

afterEach(cleanup);

describe("LogoMark", () => {
  it("is a decorative icon with no text, so link names match visible text", () => {
    const { container } = render(<LogoMark className="size-7" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).toBe("");
  });
});

describe("UserMenu (review)", () => {
  const props = { name: "Demo Shopper", email: "demo@lootlens.test", signOutAction: vi.fn() };

  it("aria-controls always points at an element in the page, hidden while closed", () => {
    render(<UserMenu {...props} />);
    const toggle = screen.getByRole("button", { name: /Account menu/ });
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!);
    expect(panel).not.toBeNull();
    expect(panel!.hidden).toBe(true);
    fireEvent.click(toggle);
    expect(panel!.hidden).toBe(false);
  });

  it("closes when keyboard focus leaves the menu", () => {
    render(
      <>
        <UserMenu {...props} />
        <a href="#after">after</a>
      </>,
    );
    const toggle = screen.getByRole("button", { name: /Account menu/ });
    fireEvent.click(toggle);
    const signOut = screen.getByRole("button", { name: "Sign out" });
    fireEvent.blur(signOut, { relatedTarget: screen.getByRole("link", { name: "after" }) });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open while focus moves inside it", () => {
    render(<UserMenu {...props} />);
    const toggle = screen.getByRole("button", { name: /Account menu/ });
    fireEvent.click(toggle);
    fireEvent.blur(toggle, { relatedTarget: screen.getByRole("button", { name: "Sign out" }) });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("SessionUserMenu", () => {
  it("shows the menu for a session", async () => {
    auth.auth.mockResolvedValueOnce({ user: { id: "u1", name: "Demo Shopper", email: "d@x.test" } });
    render(await SessionUserMenu());
    expect(screen.getByRole("button", { name: "Account menu for Demo Shopper" })).toBeTruthy();
  });

  it("without a session shows a Sign in link instead of redirecting (the proxy keeps the return address)", async () => {
    auth.auth.mockResolvedValueOnce(null);
    render(await SessionUserMenu());
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/signin");
  });
});

describe("root error boundaries", () => {
  it("app/error.tsx catches layout errors with the shared error state", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<RootError error={new Error("auth failed")} retry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("LootLens could not load.");
    expect(screen.queryByText("auth failed")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("app/global-error.tsx renders its own html and body", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<GlobalError error={new Error("x")} retry={() => {}} />, { container: document });
    expect(container.querySelector("html")).not.toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("LootLens could not load.");
  });
});
