// Host of a URL (decoded; "" when a host/hostaddr query param could override it), or of a scheme-less "host[:port][/path][?query]" or "user@host" value. "" when unparsable.
export function hostOf(raw: string | undefined): string {
  const v = raw?.trim();
  if (!v) return "";
  try {
    const u = new URL(v.includes("://") ? v : "x://" + v);
    // pg takes the real host from ?host= / ?hostaddr= and percent-decodes the authority host.
    if (u.searchParams.has("host") || u.searchParams.has("hostaddr")) return "";
    return decodeURIComponent(u.hostname);
  } catch {
    return "";
  }
}

// Prisma CLI commands that write to the database. deploy, generate, status, diff and seed stay open.
export function isDestructivePrismaCommand(argv: string[]): boolean {
  return argv.some(
    (a, i) =>
      (a === "migrate" && (argv[i + 1] === "dev" || argv[i + 1] === "reset")) ||
      (a === "migrate" && argv[i + 1] === "resolve") ||
      (a === "db" && (argv[i + 1] === "push" || argv[i + 1] === "execute")),
  );
}

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

  const hostname = hostOf(env.DATABASE_URL);
  if (!hostname) {
    throw new Error("assertNonProdDb: DATABASE_URL missing or unparsable");
  }

  const unpooled = env.DATABASE_URL_UNPOOLED?.trim();
  const unpooledHost = unpooled ? hostOf(unpooled) : "";
  if (unpooled && !unpooledHost) {
    throw new Error("assertNonProdDb: DATABASE_URL_UNPOOLED unparsable");
  }

  // PROD_DB_HOST may be a bare host, host:port, host/path, user@host, or a full URL.
  const rawProd = env.PROD_DB_HOST?.trim();
  const prod = hostOf(rawProd);
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
