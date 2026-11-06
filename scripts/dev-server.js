#!/usr/bin/env node
'use strict';
/*
 * Pelayan dev tempatan: jalankan frontend + backend SEBENAR (fail .gs) atas Sheets palsu dalam memori.
 * Untuk mencuba sistem tanpa Google. Data hilang bila pelayan ditutup. Data contoh jelas palsu.
 *
 *   npm run dev            -> http://localhost:8080
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { loadReady } = require('../tests/helpers/load-gas');

const PORT = +process.env.PORT || 8080;
const FRONT = path.join(__dirname, '..', 'frontend');
const { ctx } = loadReady({ realClock: true });

// Akaun contoh (palsu). Superadmin perlu setuju PDPA dan tukar kata laluan semasa log masuk pertama.
const sa = ctx._ciptaAkaunDalaman('SA001', 'Superadmin Contoh', 'tetap', 'superadmin', 'setup');
const g1 = ctx._ciptaAkaunDalaman('SM901', 'Guru Contoh Satu', 'tetap', 'guru', 'setup');
const ad = ctx._ciptaAkaunDalaman('AD901', 'Pentadbir Contoh', 'kontrak', 'pentadbir', 'setup');

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ctx.handleRequest(body)));
    });
    return;
  }
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/js/config.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end("window.APP_CONFIG = { API_URL: '/api', SESSION_KEY: 'smiaag_session', REQUEST_TIMEOUT_MS: 25000 };");
    return;
  }
  const file = path.normalize(path.join(FRONT, url === '/' ? 'index.html' : url));
  if (!file.startsWith(FRONT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('Tiada'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Pelayan dev: http://localhost:${PORT}  (data dalam memori, palsu)`);
  console.log(`  Superadmin  SA001 / ${sa.password}`);
  console.log(`  Pentadbir   AD901 / ${ad.password}`);
  console.log(`  Guru        SM901 / ${g1.password}`);
});
