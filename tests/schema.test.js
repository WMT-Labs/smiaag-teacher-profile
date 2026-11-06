'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBackend } = require('./helpers/load-gas');

const { ctx } = loadBackend();
const S = ctx.SCHEMA;
const names = Object.keys(S);

test('semua nama jadual dan lajur ialah snake_case tanpa ruang', () => {
  names.forEach((n) => {
    assert.match(n, /^[a-z][a-z0-9_]*$/, n);
    S[n].columns.forEach((c) => assert.match(c, /^[a-z][a-z0-9_]*$/, `${n}.${c}`));
  });
});

test('setiap jadual ada kunci utama; jadual data ada lajur audit', () => {
  names.forEach((n) => {
    assert.ok(S[n].columns.includes(S[n].pk), `${n} tiada ${S[n].pk}`);
    if (S[n].audit) ['created_at', 'updated_at', 'updated_by'].forEach((c) => assert.ok(S[n].columns.includes(c), `${n}.${c}`));
  });
  assert.equal(S.sessions.pk, 'token');
});

test('kunci asing menuju jadual yang wujud, dan enum menuju jadual ref_*', () => {
  names.forEach((n) => Object.values(S[n].defs).forEach((d) => {
    if (d.fk) assert.ok(S[d.fk], `${n}.${d.name} -> ${d.fk}`);
    if (d.ref) { assert.ok(S[d.ref] && S[d.ref].isRef, `${n}.${d.name} -> ${d.ref}`); assert.ok(ctx.REF_SEEDS[d.ref]); }
  }));
});

test('lajur <nama>_id sentiasa kunci asing (tiada rujukan dengan nama teks)', () => {
  names.forEach((n) => Object.values(S[n].defs).forEach((d) => {
    if (/_id$/.test(d.name) && d.name !== 'id') assert.ok(d.fk, `${n}.${d.name} sepatutnya fk`);
  }));
});

test('tiada lajur untuk data terlarang (gaji, IC, pasport)', () => {
  names.forEach((n) => S[n].columns.forEach((c) => {
    const parts = c.split('_');
    ctx.FORBIDDEN_COLUMN_WORDS.forEach((w) => assert.ok(c !== w && !parts.includes(w), `${n}.${c} menyerupai data terlarang`));
  }));
});

test('kekangan unik hanya merujuk lajur yang wujud', () => {
  names.forEach((n) => S[n].unique.forEach((cols) => cols.forEach((c) => assert.ok(S[n].columns.includes(c), `${n}.${c}`))));
});

test('semua jadual dalam dokumen Seksyen 5 wujud', () => {
  ['guru', 'akaun', 'sessions', 'kelayakan', 'opsyen_guru', 'kursus', 'cerapan', 'audit_log',
    'subjek', 'kelas', 'tugasan_guru', 'jadual_slot', 'had_jam_kredit',
    'unit_kokurikulum', 'keahlian_unit', 'rumah_sukan', 'guru_rumah', 'juara_rumah_sukan', 'pertandingan', 'penyertaan_pertandingan',
    'kumpulan_usrah_pelajar', 'usrah_guru', 'keahlian_usrah_guru', 'kehadiran_usrah_guru', 'peranan_hem'
  ].forEach((n) => assert.ok(S[n], n));
});
