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

  const hostOf = (value: string | undefined): string => {
    try {
      return new URL(value ?? "").hostname;
    } catch {
      return "";
    }
  };
  const hostname = hostOf(env.DATABASE_URL);
  if (!hostname) {
    throw new Error("assertNonProdDb: DATABASE_URL missing or unparsable");
  }

  const unpooled = env.DATABASE_URL_UNPOOLED?.trim();
  const unpooledHost = unpooled ? hostOf(unpooled) : "";
  if (unpooled && !unpooledHost) {
    throw new Error("assertNonProdDb: DATABASE_URL_UNPOOLED unparsable");
  }

  // PROD_DB_HOST may be a bare host, host:port, or a full URL.
  const rawProd = env.PROD_DB_HOST?.trim();
  const prod = rawProd
    ? rawProd.includes("://")
      ? hostOf(rawProd)
      : rawProd.replace(/:\d+$/, "")
    : "";
  if (rawProd && !prod) {
    throw new Error("assertNonProdDb: PROD_DB_HOST unparsable");
  }
  // Neon pooled and direct hosts differ only by "-pooler" on the first label.
  const norm = (h: string) =>
    h.toLowerCase().replace(/\.$/, "").replace(/^([^.]*)-pooler(?=\.|$)/, "$1");
  if (prod) {
    if (norm(hostname) === norm(prod)) {
      throw new Error("assertNonProdDb: DATABASE_URL host matches PROD_DB_HOST");
    }
    if (unpooledHost && norm(unpooledHost) === norm(prod)) {
      throw new Error("assertNonProdDb: DATABASE_URL_UNPOOLED host matches PROD_DB_HOST");
    }
  }
}
