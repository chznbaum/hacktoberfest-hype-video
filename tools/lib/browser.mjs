// Shared: start the static server + Chromium page(s) with the engine booted.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Parse --key value / --flag args into an object (numbers stay strings; caller converts). */
export function parseArgs(argv = process.argv.slice(2)) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const s = argv[i];
    if (s.startsWith('--')) {
      const [k, v] = s.slice(2).split('=');
      if (v !== undefined) a[k] = v;
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) a[k] = argv[++i];
      else a[k] = true;
    } else a._.push(s);
  }
  return a;
}

const LAUNCH_ARGS = ['--disable-gpu', '--disable-dev-shm-usage', '--font-render-hinting=none', '--force-color-profile=srgb',
  '--disable-lcd-text', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];

/** Launch a browser, open index.html, wait for the engine. Returns { browser, page, server, close }. */
export async function openEngine({ durScale = 1, server = null, viewport = { width: 1920, height: 1080 } } = {}) {
  const srv = server || (await startServer(ROOT));
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push(String(e)));
  await page.goto(`${srv.url}/index.html?durScale=${durScale}`);
  let err = null;
  try {
    await page.waitForFunction(() => window.engineReady || window.__error, null, { timeout: 15000 });
    err = await page.evaluate(async () => {
      try { await window.engineReady; return window.__error || null; } catch (e) { return window.__error || String(e); }
    });
  } catch (e) {
    err = 'engine did not start (module failed to load?): ' + e.message;
  }
  if (err) {
    await browser.close();
    if (!server) await srv.close();
    throw new Error('ENGINE BOOT FAILED:\n' + err + (logs.length ? '\n' + logs.join('\n') : ''));
  }
  return {
    browser, page, server: srv, logs,
    close: async () => { await browser.close(); if (!server) await srv.close(); },
  };
}

/** dataURL -> Buffer */
export const dataUrlToBuffer = (u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
