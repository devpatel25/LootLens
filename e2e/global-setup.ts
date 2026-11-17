import { execFileSync } from "node:child_process";

// Playwright's CommonJS loader cannot import the Prisma client or the seed, so run them under tsx.
export default function globalSetup(): void {
  execFileSync("npx", ["tsx", "e2e/auth-setup.ts"], { stdio: "inherit" });
}
