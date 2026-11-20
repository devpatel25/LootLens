import { createHash } from "node:crypto";

// swagger-ui-dist 5.35.0, vendored in public/swagger-ui (see LICENSE there).
const BASE = "/swagger-ui";
// SRI hashes of the vendored files. Recompute when the files change.
const JS_SRI = "sha384-gjRm0bEPMeTmMh5jT2cHccIwCUZSTd8YC+j0d0sXw0MdGEfScduGpSyF3ZSSLkX9";
const CSS_SRI = "sha384-WlYgdmXYOOBWL5apwjDEZwN+U3HmXSSu5R6V5aGxEcf7z+KuRNwBhoxKVN1i3D5I";

const init = `SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui", validatorUrl: null });`;
const initHash = createHash("sha256").update(init).digest("base64");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LootLens API</title>
<link rel="stylesheet" href="${BASE}/swagger-ui.css" integrity="${CSS_SRI}" crossorigin="anonymous">
</head>
<body>
<div id="swagger-ui"></div>
<script src="${BASE}/swagger-ui-bundle.js" integrity="${JS_SRI}" crossorigin="anonymous"></script>
<script>${init}</script>
</body>
</html>
`;

// form-action 'none': both Authorize forms in the bundle call preventDefault in onSubmit, so no real submit happens.
// Swagger UI sets inline style attributes at runtime, so style-src keeps 'unsafe-inline'.
const csp = [
  "default-src 'none'",
  `script-src 'self' 'sha256-${initHash}'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export function GET() {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": csp, "x-content-type-options": "nosniff" },
  });
}
