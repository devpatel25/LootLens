// Production smoke test: run after a deploy to check the live site answers the way it should.
//   SMOKE_URL=https://your-app.vercel.app npm run smoke
// It only reads public or signed-out responses. It never signs in and never changes data.
// A preview behind Vercel deployment protection answers with a login page; run it against an open URL.
// What it cannot see from outside: whether CRON_SECRET is set and whether DEMO_MODE is off. A missing secret
// and a wrong one both answer 401, and the proxy answers 401 to every signed-out API call before the demo gate
// runs. Check both in the Vercel project settings, and that the cron job's last run succeeded.
// None of the checks touch the database, so a broken database connection will not show up here.

const base = (process.env.SMOKE_URL ?? process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Set SMOKE_URL (or pass the URL) to the deployed site, for example https://lootlens.vercel.app");
  process.exit(2);
}

// Every request gives up after 10 seconds, so a hung deploy fails the run instead of hanging it.
const get = (path, init = {}) => fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(10_000) });

const checks = [
  {
    name: "health endpoint answers ok",
    run: async () => {
      const res = await get("/api/health");
      const body = await res.json();
      return res.status === 200 && body.status === "ok" ? null : `got ${res.status} ${JSON.stringify(body)}`;
    },
  },
  {
    name: "sign-in page loads",
    run: async () => {
      const res = await get("/signin");
      const html = await res.text();
      return res.status === 200 && html.includes("Sign in to LootLens") && html.includes("Continue with Google")
        ? null
        : `got ${res.status}, expected the sign-in heading and Google button`;
    },
  },
  {
    name: "signed-out page visit is sent to sign-in",
    run: async () => {
      const res = await get("/wishlist", { redirect: "manual" });
      const to = res.headers.get("location") ?? "";
      return res.status >= 300 && res.status < 400 && to.includes("/signin") ? null : `got ${res.status} to "${to}"`;
    },
  },
  {
    name: "signed-out API call gets a JSON 401",
    run: async () => {
      const res = await get("/api/items");
      const body = await res.json().catch(() => null);
      return res.status === 401 && body?.error?.code === "unauthorized" ? null : `got ${res.status} ${JSON.stringify(body)}`;
    },
  },
  {
    // Shows the endpoint is not open to anyone. It cannot tell whether CRON_SECRET is set (see the note above).
    name: "cron endpoint refuses a call without the secret",
    run: async () => {
      const res = await get("/api/cron/refresh");
      return res.status === 401 ? null : `got ${res.status}, expected 401`;
    },
  },
  {
    name: "demo simulate refuses signed-out callers",
    run: async () => {
      const res = await get("/api/demo/simulate", { method: "POST" });
      // The proxy answers 401 before the demo gate runs, so this shows the endpoint is not open to the
      // public. It would pass with DEMO_MODE on as well: that is a Vercel settings check (see the note above).
      return res.status === 401 ? null : `got ${res.status}, expected 401`;
    },
  },
];

let failed = 0;
for (const check of checks) {
  try {
    const problem = await check.run();
    if (problem) {
      failed++;
      console.log(`FAIL  ${check.name}: ${problem}`);
    } else {
      console.log(`ok    ${check.name}`);
    }
  } catch (e) {
    failed++;
    console.log(`FAIL  ${check.name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(failed === 0 ? `\nAll ${checks.length} smoke checks passed for ${base}` : `\n${failed} of ${checks.length} smoke checks failed for ${base}`);
process.exit(failed === 0 ? 0 : 1);
