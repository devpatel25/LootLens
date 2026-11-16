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

// Prisma CLI flags that take a separate value. Anything else starting with "-" is treated as a bare flag.
const VALUE_FLAGS = new Set([
  "--config", "--schema", "--generator", "--url", "--telemetry-information",
  "--from-url", "--to-url", "--from-schema", "--to-schema", "--from-migrations", "--to-migrations",
  "--script", "--file", "--shadow-database-url",
]);

// Commands that never write to the database (db seed guards itself). "" means no command, --help or --version. Matched on positional args only.
const SAFE_COMMANDS = ["", "generate", "version", "validate", "format", "migrate deploy", "migrate status", "migrate diff", "db seed"];

// Fail-closed: every Prisma CLI command is guarded unless it is on the safe list above.
// Flags are stripped first, so "migrate --preview-feature reset" is still seen as "migrate reset".
export function isDestructivePrismaCommand(argv: string[]): boolean {
  const positional: string[] = [];
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("-")) positional.push(a);
    else if (!a.includes("=") && VALUE_FLAGS.has(a)) i++;
  }
  return !SAFE_COMMANDS.includes(positional.join(" "));
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

  // URL strips tabs and newlines but pg does not, so the guard and the driver could read different hosts.
  const BAD_CHARS = /[\s\x00-\x1f\x7f]/;
  if (BAD_CHARS.test(env.DATABASE_URL?.trim() ?? "")) {
    throw new Error("assertNonProdDb: DATABASE_URL has whitespace or control characters");
  }
  if (BAD_CHARS.test(env.DATABASE_URL_UNPOOLED?.trim() ?? "")) {
    throw new Error("assertNonProdDb: DATABASE_URL_UNPOOLED has whitespace or control characters");
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
  // Without PROD_DB_HOST there is nothing to compare against, so only loopback hosts may pass.
  if (!prod) {
    const loopback = (h: string) => ["localhost", "127.0.0.1", "[::1]", "::1"].includes(h.toLowerCase());
    if (!loopback(hostname) || (unpooledHost && !loopback(unpooledHost))) {
      throw new Error("assertNonProdDb: PROD_DB_HOST must be set unless the database host is loopback");
    }
  }
  if (prod) {
    if (norm(hostname) === norm(prod)) {
      throw new Error("assertNonProdDb: DATABASE_URL host matches PROD_DB_HOST");
    }
    if (unpooledHost && norm(unpooledHost) === norm(prod)) {
      throw new Error("assertNonProdDb: DATABASE_URL_UNPOOLED host matches PROD_DB_HOST");
    }
  }
}
