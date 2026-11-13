import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { handleApi } from '../packages/server/src/index';

const designDir = resolve(__dirname, '../design');

/** Serves the original design files at /design-src/* so the viewer can render them. */
const serveDesign = (): Plugin => ({
  name: 'serve-design',
  configureServer(server) {
    server.middlewares.use('/design-src', (req, res, next) => {
      const file = join(designDir, decodeURIComponent((req.url ?? '').split('?')[0]!));
      if (!file.startsWith(designDir) || !existsSync(file)) return next();
      res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : file.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream');
      res.end(readFileSync(file));
    });
  },
});

/**
 * Serves /api/* (reel reading, live hotels, maps) from @staystory/server. Keys come from .env.local at the repo root
 * and stay on the server: they are never sent to the browser. Works in `vite` and `vite preview`.
 */
const api = (env: Record<string, string>): Plugin => {
  const mount = (server: { middlewares: { use: (path: string, fn: any) => void } }): void => { server.middlewares.use('/api', async (req: any, res: any, next: any) => {
    try {
      const url = new URL(`/api${req.url}`, 'http://localhost');
      let body: unknown;
      if (req.method === 'POST') {
        const chunks: Buffer[] = []; let size = 0;
        for await (const c of req) { size += c.length; if (size > 64_000) { res.statusCode = 413; return res.end('{"error":"Too large"}'); } chunks.push(c); }
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { res.statusCode = 400; return res.end('{"error":"Invalid JSON"}'); }
      }
      const out = await handleApi(req.method, url, body, env);
      if (!out) return next();
      res.statusCode = out.status;
      for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
      res.end(typeof out.body === 'string' ? out.body : Buffer.from(out.body));
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Server error' })); }
  }); };
  return { name: 'staystory-api', configureServer: mount, configurePreviewServer: mount };
};

// One origin for hotel, creator and traveler so they share a single mock marketplace in localStorage.
export default defineConfig(({ mode }) => ({
  root: __dirname,
  publicDir: 'public',
  plugins: [react(), serveDesign(), api(loadEnv(mode, resolve(__dirname, '..'), ''))],
  server: { port: 5173, fs: { allow: [resolve(__dirname, '..')] } },
  build: {
    rollupOptions: { input: Object.fromEntries(['hotel', 'creator', 'traveler', 'viewer', 'demo'].map((n) => [n, resolve(__dirname, n, 'index.html')]).concat([['compare', resolve(__dirname, 'viewer/compare.html')], ['sweep', resolve(__dirname, 'viewer/sweep.html')]])) },
  },
}));
