'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const sso = require('./lib/sso');

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, 'public');
const ICON_DIR = path.join(__dirname, 'data', 'icons');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function sendJson(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendFile(res, file, cache) {
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cache || 'no-cache',
      'Content-Length': buf.length,
    });
    res.end(buf);
  });
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        resolve(null);
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === '/next' || pathname.startsWith('/next/')) {
      const rest = pathname.slice('/next'.length);
      return redirect(res, (rest.startsWith('/') ? rest : '/' + rest) + url.search);
    }

    if (pathname === '/legacy') {
      return redirect(res, '/legacy/' + url.search);
    }

    if (pathname === '/api/state' && req.method === 'GET') {
      return sendJson(res, 200, sso.getState());
    }

    if (pathname === '/api/connect' && req.method === 'POST') {
      const body = await readJson(req);
      if (body && body.cookie) {
        const result = await sso.importCookie(String(body.cookie));
        return sendJson(res, result.ok ? 200 : 400, result);
      }
      sso.login();
      return sendJson(res, 200, { ok: true, connecting: true });
    }

    if (pathname === '/api/refresh' && req.method === 'POST') {
      const result = await sso.scrape({ headless: true, fresh: true });
      return sendJson(res, 200, { ...result, state: sso.getState() });
    }

    if (pathname.startsWith('/go/') && req.method === 'GET') {
      const id = pathname.slice(4);
      const bookmark = sso.getState().google.find((a) => a.id === id);
      if (bookmark) return redirect(res, bookmark.url);
      const target = await sso.launchUrl(id);
      if (target) return redirect(res, target);
      return redirect(res, '/?status=expired');
    }

    if (pathname.startsWith('/icons/')) {
      const name = path.basename(pathname);
      return sendFile(res, path.join(ICON_DIR, name), 'public, max-age=31536000, immutable');
    }

    if (pathname === '/') {
      return sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 'no-store');
    }

    const safe = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
    const target = path.join(PUBLIC_DIR, safe);
    if (!target.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    if (pathname.endsWith('/')) {
      const indexFile = path.join(target, 'index.html');
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return sendFile(res, indexFile, 'no-cache');
      }
    }
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return sendFile(res, target, 'no-cache');
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message || 'Server error' });
    else res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SSO Lite running at http://localhost:${PORT}`);
  sso.init();
});
