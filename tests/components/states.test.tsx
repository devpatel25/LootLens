// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppError from "@/app/(app)/error";
import AppLoading from "@/app/(app)/loading";
import DemoDataBadge from "@/components/DemoDataBadge";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";

afterEach(cleanup);

describe("DemoDataBadge", () => {
  it("reads Demo data as text, not only colour", () => {
    render(<DemoDataBadge />);
    expect(screen.getByText("Demo data")).toBeTruthy();
  });
});

describe("loading state", () => {
  it("announces loading politely with a label", () => {
    render(<LoadingState label="Loading wishlist" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("Loading wishlist");
  });

  it("route loading.tsx shows the loading state", () => {
    render(<AppLoading />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
  });
});

describe("empty state", () => {
  it("shows a heading, a message, and an optional action", () => {
    render(<EmptyState title="No items yet" message="Add an item to start tracking prices." action={<button>Add item</button>} />);
    expect(screen.getByRole("heading", { name: "No items yet" })).toBeTruthy();
    expect(screen.getByText("Add an item to start tracking prices.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add item" })).toBeTruthy();
  });

  it("leaves out the action when none is given", () => {
    render(<EmptyState title="No alerts" message="Nothing yet." />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("error state", () => {
  it("is announced as an alert with a default message", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong.");
  });

  it("shows a custom message and calls onRetry from Try again", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Could not load codes." onRetry={onRetry} />);
    expect(screen.getByRole("alert").textContent).toContain("Could not load codes.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("hides Try again when there is nothing to retry", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("route error.tsx shows the error state and retries the segment", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AppError error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText("boom")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
