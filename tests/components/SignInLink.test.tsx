// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SignInLink from "@/components/SignInLink";

const nav = vi.hoisted(() => ({ pathname: "/items/abc", search: "tab=codes" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

afterEach(cleanup);

describe("SignInLink", () => {
  it("keeps the current page, with its query, as the return address", () => {
    render(<SignInLink />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/signin?callbackUrl=%2Fitems%2Fabc%3Ftab%3Dcodes");
  });

  it("works without a query", () => {
    nav.search = "";
    render(<SignInLink />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/signin?callbackUrl=%2Fitems%2Fabc");
  });
});
