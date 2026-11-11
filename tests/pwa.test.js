'use strict';
// C5: boleh dipasang sebagai aplikasi (manifest + ikon). Tiada service worker: tiada kod atau data lapuk disimpan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const F = path.join(__dirname, '..', 'frontend');

test('manifest sah, ikon wujud dengan saiz betul, dan setiap halaman memautkannya', () => {
  const m = JSON.parse(fs.readFileSync(path.join(F, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone'); assert.equal(m.start_url, 'utama.html'); assert.equal(m.scope, './', 'laluan relatif: berfungsi di Netlify dan GitHub Pages');
  assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512') && m.icons.some((i) => i.purpose === 'maskable'));
  m.icons.forEach((i) => {
    const b = fs.readFileSync(path.join(F, i.src));
    assert.equal(b.toString('ascii', 1, 4), 'PNG');
    assert.equal(b.readUInt32BE(16) + 'x' + b.readUInt32BE(20), i.sizes, i.src);
  });
  fs.readdirSync(F).filter((f) => f.endsWith('.html')).forEach((f) => {
    const h = fs.readFileSync(path.join(F, f), 'utf8');
    assert.ok(h.includes('<link rel="manifest" href="manifest.webmanifest">'), f);
    assert.ok(h.includes('apple-touch-icon'), f);
  });
});

test('tiada service worker didaftarkan (elak kod lapuk selepas kemas kini)', () => {
  const semua = fs.readdirSync(F).filter((f) => f.endsWith('.html')).map((f) => fs.readFileSync(path.join(F, f), 'utf8'))
    .concat(fs.readdirSync(path.join(F, 'js')).map((f) => fs.readFileSync(path.join(F, 'js', f), 'utf8'))).join('\n');
  assert.ok(!/serviceWorker\s*\.\s*register/.test(semua));
});
