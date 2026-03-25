// Wrapper that serves /public files, then delegates to Next.js standalone server.
// Next.js standalone server.js does NOT serve public/ files.
const { createServer } = require("http");
const { parse } = require("url");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "public");

const MIME = {
  ".js": "application/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".webp": "image/webp", ".css": "text/css",
  ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

function tryServePublic(req, res) {
  const pathname = parse(req.url || "/").pathname || "/";
  if (pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return false;
  }
  const filePath = path.join(publicDir, pathname);
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      });
      fs.createReadStream(filePath).pipe(res);
      return true;
    }
  } catch { /* fall through */ }
  return false;
}

// Monkey-patch http.createServer so the Next.js standalone server
// goes through our public-file handler first
const http = require("http");
const originalCreateServer = http.createServer;
http.createServer = function(handler) {
  return originalCreateServer(function(req, res) {
    if (tryServePublic(req, res)) return;
    handler(req, res);
  });
};

// Now load the Next.js standalone server (it will call http.createServer)
require("./server.standalone.js");
