// Tiny static HTTP server (ES modules don't load from file://). Used by all tools.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};

/** Start a static server on a random free port. Returns { url, close() }. */
export function startServer(root) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      let p = path.normalize(path.join(root, decodeURIComponent(u.pathname)));
      if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { res.writeHead(404); return res.end('not found: ' + u.pathname); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}
