// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SignInCard from "@/components/SignInCard";

afterEach(cleanup);

const action = vi.fn();

describe("SignInCard", () => {
  it("has one heading and exactly one button: Continue with Google", () => {
    render(<SignInCard action={action} callbackUrl="/wishlist" error={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Sign in to LootLens" })).toBeTruthy();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain("Continue with Google");
    expect(buttons[0].getAttribute("type")).toBe("submit");
  });

  it("sends the callbackUrl with the form", () => {
    const { container } = render(<SignInCard action={action} callbackUrl="/items/abc" error={null} />);
    const input = container.querySelector<HTMLInputElement>('input[type="hidden"][name="callbackUrl"]');
    expect(input?.value).toBe("/items/abc");
  });

  it("states what we never do with the account", () => {
    render(<SignInCard action={action} callbackUrl="/wishlist" error={null} />);
    expect(screen.getByText(/No password\. No marketing email\./)).toBeTruthy();
  });

  it("shows no alert without an error", () => {
    render(<SignInCard action={action} callbackUrl="/wishlist" error={null} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the error as an alert", () => {
    render(<SignInCard action={action} callbackUrl="/wishlist" error="Sign-in did not finish. Try again." />);
    expect(screen.getByRole("alert").textContent).toContain("Sign-in did not finish. Try again.");
  });
});
