#!/usr/bin/env node
'use strict';
// Sediakan salinan frontend/ untuk GitHub Pages (dipanggil oleh .github/workflows/pages.yml).
//   - masukkan API_URL (wajib) dan ECUTI_URL (pilihan) ke js/config.js daripada pemboleh ubah persekitaran
//   - GitHub Pages tidak membaca _headers: masukkan CSP yang sama sebagai <meta> (tanpa frame-ancestors,
//     yang tidak disokong dalam meta). Header lain (X-Frame-Options dll.) hanya ada di Netlify.
// Guna: API_URL=... [ECUTI_URL=...] node scripts/sedia-pages.js <folder-keluaran>
const fs = require('node:fs');
const path = require('node:path');

function sedia(keluar, env) {
  const API_URL = env.API_URL || '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(API_URL)) {
    throw new Error('API_URL mesti URL Web App Apps Script yang berakhir /exec (Settings > Secrets and variables > Actions > Variables)');
  }
  if (env.ECUTI_URL && !/^https:\/\/[^\s'"]+$/.test(env.ECUTI_URL)) throw new Error('ECUTI_URL mesti bermula https://');
  const src = path.join(__dirname, '..', 'frontend');
  fs.rmSync(keluar, { recursive: true, force: true });
  fs.cpSync(src, keluar, { recursive: true });

  const cfgF = path.join(keluar, 'js', 'config.js');
  let cfg = fs.readFileSync(cfgF, 'utf8');
  const asal = cfg;
  cfg = cfg.replace(/API_URL: '[^']*'/, 'API_URL: ' + JSON.stringify(API_URL));
  if (env.ECUTI_URL) cfg = cfg.replace(/ECUTI_URL: '[^']*'/, 'ECUTI_URL: ' + JSON.stringify(env.ECUTI_URL));
  if (cfg === asal || !cfg.includes(API_URL)) throw new Error('API_URL tidak dapat dimasukkan ke js/config.js');
  fs.writeFileSync(cfgF, cfg);

  const headers = fs.readFileSync(path.join(src, '_headers'), 'utf8');
  const m = /Content-Security-Policy:\s*(.+)/.exec(headers);
  if (!m) throw new Error('CSP tiada dalam frontend/_headers');
  const csp = m[1].trim().replace(/;\s*frame-ancestors[^;]*/, '');
  const meta = '<meta http-equiv="Content-Security-Policy" content="' + csp.replace(/"/g, '&quot;') + '">';
  let n = 0;
  fs.readdirSync(keluar).filter((f) => f.endsWith('.html')).forEach((f) => {
    const p = path.join(keluar, f);
    const s = fs.readFileSync(p, 'utf8');
    if (!/<head>/i.test(s)) throw new Error('tiada <head>: ' + f);
    fs.writeFileSync(p, s.replace(/<head>/i, '<head>\n  ' + meta));
    n++;
  });
  fs.rmSync(path.join(keluar, '_headers'), { force: true });
  return { halaman: n };
}

if (require.main === module) {
  try {
    const r = sedia(process.argv[2] || '_site', process.env);
    console.log('Siap: ' + r.halaman + ' halaman dengan CSP meta; API_URL dimasukkan.');
  } catch (e) { console.error('::error::' + e.message); process.exit(1); }
}
module.exports = { sedia };
