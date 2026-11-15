import type { Mock } from "vitest";
import { auth } from "@/lib/auth";

// The calling test file must declare vi.mock("@/lib/auth", () => ({ auth: vi.fn() })).
export function signInAs(id: string | null): void {
  (auth as unknown as Mock).mockResolvedValue(id === null ? null : { user: { id } });
}
