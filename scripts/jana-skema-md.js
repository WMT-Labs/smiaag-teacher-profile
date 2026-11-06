#!/usr/bin/env node
'use strict';
// Jana docs/SKEMA.md daripada backend/Schema.gs supaya dokumentasi sentiasa sepadan dengan kod.
const fs = require('node:fs');
const path = require('node:path');
const { loadBackend } = require('../tests/helpers/load-gas');

function build() {
  const { ctx } = loadBackend();
  const S = ctx.SCHEMA;
  const out = ['# Skema data', '', '> Dijana automatik daripada `backend/Schema.gs` (`npm run skema-md`). Jangan edit di sini.', '',
    'Setiap jadual ialah satu tab dalam Google Sheet. Ini juga asas skrip SQL untuk Supabase (Fasa 7).', ''];
  const group = (title, names) => {
    out.push(`## ${title}`, '');
    names.forEach((n) => {
      const s = S[n];
      out.push(`### \`${n}\``, '', '| Lajur | Jenis | Wajib | Rujukan | Lalai |', '|---|---|---|---|---|');
      s.columns.forEach((c) => {
        const d = s.defs[c];
        const ref = d.fk ? `FK → ${d.fk}` : d.ref ? `ref → ${d.ref}` : '';
        const t = d.min !== null ? `${d.type} [${d.min}..${d.max}]` : d.type;
        out.push(`| ${c}${c === s.pk ? ' (PK)' : ''} | ${t} | ${d.required ? 'ya' : ''} | ${ref} | ${d.def === undefined ? '' : d.def} |`);
      });
      if (s.unique.length) out.push('', 'Unik: ' + s.unique.map((u) => '(' + u.join(', ') + ')').join(', '));
      out.push('');
    });
  };
  group('Jadual rujukan (ref_*)', Object.keys(S).filter((n) => S[n].isRef));
  group('Jadual data', Object.keys(S).filter((n) => !S[n].isRef));
  out.push('## Nilai rujukan asal', '');
  Object.keys(ctx.REF_SEEDS).forEach((n) => out.push(`- \`${n}\`: ${ctx.REF_SEEDS[n].map((p) => p[0]).join(', ')}`));
  return out.join('\n') + '\n';
}

if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'SKEMA.md'), build());
  console.log('Siap: docs/SKEMA.md');
}
module.exports = { build };
