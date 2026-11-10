'use strict';
// Pratonton GitHub Pages: skrip penyediaan memasukkan API_URL dan CSP <meta> tanpa mengubah frontend/.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { sedia } = require('../scripts/sedia-pages');

const URL_CONTOH = 'https://script.google.com/macros/s/AKfycbContohSahaja123/exec';

test('sedia-pages: API_URL dan ECUTI_URL dimasukkan, CSP meta pada setiap halaman, frontend asal tidak berubah', () => {
  const asal = fs.readFileSync(path.join(__dirname, '..', 'frontend/js/config.js'), 'utf8');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-'));
  const r = sedia(path.join(d, 'out'), { API_URL: URL_CONTOH, ECUTI_URL: 'https://webake.github.io/e-Cuti-SMIAAG/' });
  const cfg = fs.readFileSync(path.join(d, 'out/js/config.js'), 'utf8');
  assert.match(cfg, /API_URL: "https:\/\/script\.google\.com\/macros\/s\/AKfycbContohSahaja123\/exec"/);
  assert.match(cfg, /ECUTI_URL: "https:\/\/webake\.github\.io\/e-Cuti-SMIAAG\/"/);
  assert.ok(r.halaman >= 17);
  const idx = fs.readFileSync(path.join(d, 'out/index.html'), 'utf8');
  assert.match(idx, /<meta http-equiv="Content-Security-Policy" content="default-src 'self';[^"]*connect-src 'self' https:\/\/script\.google\.com/);
  assert.ok(!/frame-ancestors/.test(idx));
  assert.ok(!fs.existsSync(path.join(d, 'out/_headers')));
  assert.equal(fs.readFileSync(path.join(__dirname, '..', 'frontend/js/config.js'), 'utf8'), asal);
  fs.rmSync(d, { recursive: true, force: true });
});

test('sedia-pages: menolak API_URL kosong atau bukan Apps Script', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-'));
  assert.throws(() => sedia(path.join(d, 'o'), {}), /API_URL/);
  assert.throws(() => sedia(path.join(d, 'o'), { API_URL: 'https://jahat.example/exec' }), /API_URL/);
  assert.throws(() => sedia(path.join(d, 'o'), { API_URL: URL_CONTOH, ECUTI_URL: "javascript:alert(1)" }), /ECUTI_URL/);
  fs.rmSync(d, { recursive: true, force: true });
});
