#!/usr/bin/env node
// Interactive preview in a real browser: serves the project and prints scrubber URLs (Ctrl+C to stop).
//   node tools/preview.mjs [--port 8757]
import http from 'node:http';
import { parseArgs, ROOT } from './lib/browser.mjs';
import { startServer } from './lib/server.mjs';

const a = parseArgs();
const srv = await startServer(ROOT);
const port = parseInt(a.port || '8757', 10);
// tiny proxy on a stable port -> the random-port static server
http.createServer((req, res) => {
  const p = http.request(srv.url + req.url, { method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  req.pipe(p);
}).listen(port, '127.0.0.1', () => {
  const base = `http://127.0.0.1:${port}/index.html`;
  console.log(`16:9 full edit : ${base}?preview=1&fmt=16x9&audio=assets/audio/scratch-102bpm.wav`);
  console.log(`9:16 social    : ${base}?preview=1&fmt=9x16&audio=assets/audio/scratch-102bpm.wav`);
  console.log('(add &durScale=1.3 to test timing robustness)');
});
