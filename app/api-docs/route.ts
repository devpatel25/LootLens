const V = "5.35.0"; // swagger-ui-dist, loaded from unpkg so nothing is installed
const CDN = `https://unpkg.com/swagger-ui-dist@${V}`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LootLens API</title>
<link rel="stylesheet" href="${CDN}/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="${CDN}/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });</script>
</body>
</html>
`;

export function GET() {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
