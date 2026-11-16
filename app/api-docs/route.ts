import { createHash } from "node:crypto";

const V = "5.35.0"; // swagger-ui-dist, loaded from unpkg so nothing is installed
const CDN = `https://unpkg.com/swagger-ui-dist@${V}`;
// SRI hashes of the exact files above. Recompute when V changes.
const JS_SRI = "sha384-gjRm0bEPMeTmMh5jT2cHccIwCUZSTd8YC+j0d0sXw0MdGEfScduGpSyF3ZSSLkX9";
const CSS_SRI = "sha384-WlYgdmXYOOBWL5apwjDEZwN+U3HmXSSu5R6V5aGxEcf7z+KuRNwBhoxKVN1i3D5I";

const init = `SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });`;
const initHash = createHash("sha256").update(init).digest("base64");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LootLens API</title>
<link rel="stylesheet" href="${CDN}/swagger-ui.css" integrity="${CSS_SRI}" crossorigin="anonymous">
</head>
<body>
<div id="swagger-ui"></div>
<script src="${CDN}/swagger-ui-bundle.js" integrity="${JS_SRI}" crossorigin="anonymous"></script>
<script>${init}</script>
</body>
</html>
`;

// Swagger UI sets inline style attributes at runtime, so style-src keeps 'unsafe-inline'.
const csp = [
  "default-src 'none'",
  `script-src https://unpkg.com 'sha256-${initHash}'`,
  "style-src https://unpkg.com 'unsafe-inline'",
  "img-src 'self' data: https://unpkg.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join("; ");

export function GET() {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": csp } });
}
