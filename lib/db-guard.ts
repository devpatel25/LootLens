// Fail-closed: throws unless the env is clearly non-production. Messages never include URL or host values.
export function assertNonProdDb(
  env: Record<string, string | undefined> = process.env,
): void {
  if (env.DB_TARGET !== "local" && env.DB_TARGET !== "ci" && env.DB_TARGET !== "preview") {
    throw new Error("assertNonProdDb: DB_TARGET must be local|ci|preview");
  }
  if (env.VERCEL_ENV === "production") {
    throw new Error("assertNonProdDb: VERCEL_ENV is production");
  }

  let hostname = "";
  try {
    hostname = new URL(env.DATABASE_URL ?? "").hostname;
  } catch {
    // falls through to the empty-hostname check
  }
  if (!hostname) {
    throw new Error("assertNonProdDb: DATABASE_URL missing or unparsable");
  }

  const prod = env.PROD_DB_HOST?.trim();
  // Neon pooled and direct hosts differ only by "-pooler" on the first label.
  const norm = (h: string) => h.toLowerCase().replace(/^([^.]*)-pooler(?=\.|$)/, "$1");
  if (prod && norm(hostname) === norm(prod)) {
    throw new Error("assertNonProdDb: DATABASE_URL host matches PROD_DB_HOST");
  }
}
