import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const codeql = read(".github/workflows/codeql.yml");
const dependabot = read(".github/dependabot.yml");

// Text of one top-level `updates:` entry, found by its ecosystem.
function entry(ecosystem: string): string {
  const parts = dependabot.split(/^ {2}- package-ecosystem: /m).slice(1);
  const found = parts.find((p) => p.startsWith(ecosystem));
  if (!found) throw new Error(`no ${ecosystem} entry`);
  return found;
}

describe("codeql workflow", () => {
  const lines = codeql
    .split("\n")
    .filter((l) => /uses:\s*github\/codeql-action\//.test(l));

  it("pins every codeql-action step to the same v4 ref", () => {
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const refs = lines.map((l) => l.match(/@([0-9a-f]{40})/)?.[1]);
    expect(refs.every(Boolean)).toBe(true);
    expect(new Set(refs).size).toBe(1);
    for (const l of lines) expect(l).toContain("# v4.");
  });
});

describe("dependabot config", () => {
  it("groups codeql-action updates of every type together", () => {
    const actions = entry("github-actions");
    const group = actions.match(
      /^ {6}codeql-action:\n((?: {8}.*\n?)+)/m,
    )?.[1];
    expect(group).toBeDefined();
    expect(group).toContain("github/codeql-action*");
    expect(group).not.toContain("update-types");
  });

  it("puts the codeql group before actions-minor-patch", () => {
    const actions = entry("github-actions");
    expect(actions.indexOf("codeql-action:")).toBeGreaterThan(-1);
    expect(actions.indexOf("codeql-action:")).toBeLessThan(
      actions.indexOf("actions-minor-patch:"),
    );
  });

  it.each(["typescript", "eslint", "@types/node"])(
    "holds major bumps of %s",
    (name) => {
      const npm = entry("npm");
      expect(npm).toMatch(
        new RegExp(
          `dependency-name: "${name}"\\n\\s+update-types: \\["version-update:semver-major"\\]`,
        ),
      );
    },
  );
});
