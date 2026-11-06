#!/usr/bin/env node
'use strict';
// Gabung semua backend/*.gs menjadi SATU fail dist/Code.gs supaya pemilik hanya perlu
// salin-tampal satu fail ke editor Apps Script. Jalankan: npm run bundle
const fs = require('node:fs');
const path = require('node:path');
const { ORDER, BACKEND } = require('../tests/helpers/load-gas');

function build() {
  const parts = ORDER.map((f) => {
    const p = path.join(BACKEND, f);
    if (!fs.existsSync(p)) return '';
    return `// ======================================================================\n// ${f}\n// ======================================================================\n` + fs.readFileSync(p, 'utf8').trim() + '\n';
  }).filter(Boolean);
  return '// DIJANA AUTOMATIK oleh scripts/bundle-gas.js. Jangan edit di sini; edit fail dalam backend/.\n\n' + parts.join('\n');
}

if (require.main === module) {
  const out = path.join(__dirname, '..', 'dist', 'Code.gs');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, build());
  console.log('Siap: dist/Code.gs');
}
module.exports = { build };
