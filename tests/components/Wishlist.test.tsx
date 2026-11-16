// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WishlistError from "@/app/(app)/wishlist/error";
import WishlistLoading from "@/app/(app)/wishlist/loading";
import ConfirmDialog from "@/components/ConfirmDialog";
import ItemSheet from "@/components/ItemSheet";
import WishlistCard from "@/components/WishlistCard";
import WishlistView from "@/components/WishlistView";
import fixture from "@/fixtures/wishlist.json";
import type { WishlistItem } from "@/lib/types";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/wishlist" }));

const items = () => structuredClone(fixture) as WishlistItem[];
const samba = () => items().find((i) => i.name === "Adidas Samba OG")!;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  router.refresh.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => json(200, { data: {} })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WishlistCard", () => {
  it("shows the item, saved size, and the cheapest price and store from the API", () => {
    render(<ul><WishlistCard item={samba()} onEdit={() => {}} onDelete={() => {}} /></ul>);
    expect(screen.getByRole("link", { name: "Adidas Samba OG" }).getAttribute("href")).toBe("/items/item-samba");
    expect(screen.getByText("Size 9")).toBeTruthy();
    expect(screen.getByText("Cheapest: $60.00 at Facebook Marketplace")).toBeTruthy();
  });

  it("says when no store has the saved size", () => {
    render(<ul><WishlistCard item={{ ...samba(), cheapest: null }} onEdit={() => {}} onDelete={() => {}} /></ul>);
    expect(screen.getByText("No store shown has size 9 in stock")).toBeTruthy();
  });

  it("has named Edit and Delete buttons", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ul><WishlistCard item={samba()} onEdit={onEdit} onDelete={onDelete} /></ul>);
    fireEvent.click(screen.getByRole("button", { name: "Edit Adidas Samba OG" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Adidas Samba OG" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("WishlistView", () => {
  it("populated: lists every item with the Demo data badge", () => {
    render(<WishlistView items={items()} anyDemo />);
    expect(screen.getByRole("heading", { level: 1, name: "Wishlist" })).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Wishlist items" })).getAllByRole("listitem")).toHaveLength(items().length);
    expect(screen.getByText("Demo data")).toBeTruthy();
  });

  it("hides the badge when no listing is demo", () => {
    render(<WishlistView items={items()} anyDemo={false} />);
    expect(screen.queryByText("Demo data")).toBeNull();
  });

  it("empty: invites a new user to add their first item", () => {
    render(<WishlistView items={[]} anyDemo={false} />);
    expect(screen.getByRole("heading", { name: "Your wishlist is empty" })).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Wishlist items" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Add item" }).at(-1)!);
    expect(screen.getByRole("dialog", { name: "Add item" })).toBeTruthy();
  });

  it("Edit opens the sheet filled with the item", () => {
    render(<WishlistView items={items()} anyDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Adidas Samba OG" }));
    const dialog = screen.getByRole("dialog", { name: "Edit item" });
    expect(within(dialog).getByLabelText<HTMLInputElement>("Name").value).toBe("Adidas Samba OG");
  });

  it("Delete asks first, then deletes, refreshes, and announces it", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(200, { data: { id: "item-samba" } }));
    render(<WishlistView items={items()} anyDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Adidas Samba OG" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete Adidas Samba OG?" });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/items/item-samba");
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("DELETE");
    expect(screen.getByRole("status").textContent).toContain("Deleted Adidas Samba OG.");
  });
});

describe("ConfirmDialog", () => {
  it("Cancel closes without confirming", () => {
    const onConfirm = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Delete X?" message="This cannot be undone." confirmLabel="Delete" onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows the error and stays open when the action fails", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    render(<ConfirmDialog open title="Delete X?" message="m" confirmLabel="Delete" onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Could not reach LootLens.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} title="T" message="m" confirmLabel="Delete" onConfirm={async () => {}} onClose={() => {}} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("ItemSheet", () => {
  const fill = (dialog: HTMLElement, values: Record<string, string>) => {
    for (const [label, value] of Object.entries(values)) {
      fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
    }
  };

  it("labels every input", () => {
    render(<ItemSheet open item={null} onClose={() => {}} onSaved={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Add item" });
    for (const label of ["Name", "Category", "Sizes", "Your size", "Typical price (USD)", "Product link (optional)"]) {
      expect(within(dialog).getByLabelText(label)).toBeTruthy();
    }
  });

  it("offers your size from the sizes typed", () => {
    render(<ItemSheet open item={null} onClose={() => {}} onSaved={() => {}} />);
    const dialog = screen.getByRole("dialog");
    fill(dialog, { Sizes: "S, M, L" });
    const options = within(within(dialog).getByLabelText("Your size")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Choose", "S", "M", "L"]);
  });

  it("shows field errors and does not call the API when input is invalid", () => {
    render(<ItemSheet open item={null} onClose={() => {}} onSaved={() => {}} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    const name = within(dialog).getByLabelText("Name");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(name.getAttribute("aria-describedby")!)?.textContent).toBe("Enter a name.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("adds an item with POST and reports the name", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(201, { data: { id: "new" } }));
    const onSaved = vi.fn();
    render(<ItemSheet open item={null} onClose={() => {}} onSaved={onSaved} />);
    const dialog = screen.getByRole("dialog");
    fill(dialog, { Name: "Hoodie", Category: "clothes", Sizes: "S, M", "Your size": "M", "Typical price (USD)": "40" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Hoodie"));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/items");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Hoodie", category: "clothes", sizes: ["S", "M"], selectedSize: "M", typicalPrice: 40, sourceUrl: null,
    });
  });

  it("edits an item with PATCH to its id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(200, { data: { id: "item-samba" } }));
    const onSaved = vi.fn();
    render(<ItemSheet open item={samba()} onClose={() => {}} onSaved={onSaved} />);
    const dialog = screen.getByRole("dialog", { name: "Edit item" });
    fill(dialog, { Name: "Samba OG" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Samba OG"));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/items/item-samba");
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("PATCH");
  });

  it("shows the API's message when the server rejects the save", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(400, { error: { code: "bad_request", message: "name: Too big" } }));
    render(<ItemSheet open item={samba()} onClose={() => {}} onSaved={() => {}} />);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("name: Too big");
  });

  it("Cancel closes", () => {
    const onClose = vi.fn();
    render(<ItemSheet open item={null} onClose={onClose} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Wishlist route states", () => {
  it("loading.tsx announces loading", () => {
    render(<WishlistLoading />);
    expect(screen.getByRole("status").textContent).toContain("Loading wishlist");
  });

  it("error.tsx shows an alert and retries", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<WishlistError error={new Error("x")} retry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("Your wishlist could not load.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
