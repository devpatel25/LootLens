// Production smoke test: run after a deploy to check the live site answers the way it should.
//   SMOKE_URL=https://your-app.vercel.app npm run smoke
// It only reads public or signed-out responses. It never signs in and never changes data.

const base = (process.env.SMOKE_URL ?? process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Set SMOKE_URL (or pass the URL) to the deployed site, for example https://lootlens.vercel.app");
  process.exit(2);
}

const checks = [
  {
    name: "health endpoint answers ok",
    run: async () => {
      const res = await fetch(`${base}/api/health`);
      const body = await res.json();
      return res.status === 200 && body.status === "ok" ? null : `got ${res.status} ${JSON.stringify(body)}`;
    },
  },
  {
    name: "sign-in page loads",
    run: async () => {
      const res = await fetch(`${base}/signin`);
      const html = await res.text();
      return res.status === 200 && html.includes("Sign in to LootLens") && html.includes("Continue with Google")
        ? null
        : `got ${res.status}, expected the sign-in heading and Google button`;
    },
  },
  {
    name: "signed-out page visit is sent to sign-in",
    run: async () => {
      const res = await fetch(`${base}/wishlist`, { redirect: "manual" });
      const to = res.headers.get("location") ?? "";
      return res.status >= 300 && res.status < 400 && to.includes("/signin") ? null : `got ${res.status} to "${to}"`;
    },
  },
  {
    name: "signed-out API call gets a JSON 401",
    run: async () => {
      const res = await fetch(`${base}/api/items`);
      const body = await res.json().catch(() => null);
      return res.status === 401 && body?.error?.code === "unauthorized" ? null : `got ${res.status} ${JSON.stringify(body)}`;
    },
  },
  {
    name: "cron endpoint refuses a call without the secret",
    run: async () => {
      const res = await fetch(`${base}/api/cron/refresh`);
      return res.status === 401 ? null : `got ${res.status}, expected 401`;
    },
  },
  {
    name: "demo actions are off in production",
    run: async () => {
      const res = await fetch(`${base}/api/demo/simulate`, { method: "POST" });
      // Signed out, the proxy answers 401 first; a 200 would mean demo actions are reachable.
      return res.status !== 200 ? null : "got 200, demo simulate must not be reachable";
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
