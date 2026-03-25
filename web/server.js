const { createServer } = require("http");
const { parse } = require("url");
const path = require("path");
const fs = require("fs");
const next = require("next");

const app = next({ dir: __dirname, dev: false });
const handle = app.getRequestHandler();
const publicDir = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".css": "text/css",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

app.prepare().then(() => {
  const port = parseInt(process.env.PORT || "3000", 10);
  const hostname = process.env.HOSTNAME || "0.0.0.0";

  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname || "/";

    // Serve public/ files directly (manifest.json, sw.js, icons, etc.)
    const publicPath = path.join(publicDir, pathname);
    if (pathname !== "/" && !pathname.startsWith("/_next")) {
      try {
        const stat = fs.statSync(publicPath);
        if (stat.isFile()) {
          const ext = path.extname(publicPath).toLowerCase();
          const mime = MIME_TYPES[ext] || "application/octet-stream";
          res.setHeader("Content-Type", mime);
          res.setHeader("Cache-Control", "public, max-age=86400");
          fs.createReadStream(publicPath).pipe(res);
          return;
        }
      } catch {
        // Not a public file — fall through to Next.js
      }
    }

    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> EchoStats ready on http://${hostname}:${port}`);
  });
});
