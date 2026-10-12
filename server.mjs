import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.mjs';

const root = dirname(fileURLToPath(import.meta.url));
export async function makeServer(dataFile = resolve(root, '.local/state.json')) {
  const store = await createStore(dataFile);
  const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
  const send = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, mode: 'simulation' });
      if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, await store.snapshot());
      if (req.method === 'GET' && assets[url.pathname]) {
        const [file, mime] = assets[url.pathname];
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
        return res.end(await readFile(resolve(root, 'public', file)));
      }
      if (req.method !== 'POST') return send(res, 404, { error: 'Not found' });
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, { error: 'Origin not allowed' });
      if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'JSON required' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 16000) return send(res, 413, { error: 'Request too large' });
      }
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'JSON object required' });
      if (url.pathname === '/api/tasks') {
        if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 2000 || typeof body.key !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.key)) return send(res, 400, { error: 'Provide a request and a valid unique key' });
        return send(res, 201, await store.create(body.text.trim(), body.key));
      }
      const task = url.pathname.match(/^\/api\/tasks\/([a-f0-9-]+)\/(approve|reject|run)$/);
      if (task) return send(res, 200, await store.act(task[1], task[2]));
      const connector = url.pathname.match(/^\/api\/connectors\/(calendar|mail)$/);
      if (connector && typeof body.enabled === 'boolean') return send(res, 200, await store.connector(connector[1], body.enabled));
      return send(res, 404, { error: 'Not found' });
    } catch (error) {
      if (error.code) { console.error('Storage or server error:', error.code); return send(res, 500, { error: 'Storage operation failed' }); }
      send(res, 409, { error: error.message });
    }
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await makeServer(process.env.AUTOMATOR_DATA_FILE);
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '127.0.0.1', () => console.log(`Automator local prototype running on port ${port}; all connectors are simulated.`));
}
