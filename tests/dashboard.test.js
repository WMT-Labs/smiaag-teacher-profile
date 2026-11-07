'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const DK = require('../frontend/js/dashboard-kira');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

// ---------------------------------------------------------------- logik pelayar (tulen)
const G = (o) => ({ id: o.id, guru_kod: o.id.toUpperCase(), nama_penuh: o.nama, jawatan: o.jawatan || null, status_lantikan: o.status || 'tetap', percubaan: o.percubaan || null,
  jam_berjadual: o.jb || 0, jam_tidak_berjadual: o.jt || 0, status_beban: o.sb || 'dalam', bilangan_tugasan: o.t === undefined ? 1 : o.t,
  jabatan: o.jab || [], subjek_ids: o.subj || [], tingkatan: o.ting || [], cerapan: o.c || 0, pencerap: null, unit: o.unit || [],
  peranan_hem: [], murid_usrah: 0, usrah_guru: null });
const ROWS = [
  G({ id: 'a', nama: 'Aminah', jb: 15.5, jt: 7.5, jab: ['KURI', 'HEM'], subj: ['pi'], ting: [2], c: 2, unit: [{ unit_id: 'kaspa', jawatan: 'penasihat' }] }),
  G({ id: 'b', nama: 'Badrul', jb: 23, jt: 2, sb: 'lebih', status: 'kontrak', subj: ['mat'], ting: [4, 5], unit: [{ unit_id: 'kaspa', jawatan: 'ajk' }] }),
  G({ id: 'c', nama: 'Che Ros', jb: 18, jt: 9, sb: 'hampir', status: 'percubaan', percubaan: { tamat: true }, jab: ['KOKU'], t: 0 })
];

test('dashboard: penapis jabatan, status, subjek, tingkatan, unit, nama', () => {
  const n = (f) => DK.tapis(ROWS, f).map((g) => g.id).join();
  assert.equal(n({}), 'a,b,c');
  assert.equal(n({ jabatan: 'HEM' }), 'a');
  assert.equal(n({ status: 'kontrak' }), 'b');
  assert.equal(n({ subjek: 'pi' }), 'a');
  assert.equal(n({ tingkatan: '5' }), 'b');
  assert.equal(n({ unit: 'kaspa' }), 'a,b');
  assert.equal(n({ cari: 'ros' }), 'c');
  assert.equal(n({ cari: 'A', unit: 'kaspa', tingkatan: 2 }), 'a', 'gabungan penapis');
});

test('dashboard: kad ringkasan', () => {
  const r = DK.ringkasan(ROWS);
  assert.deepEqual(r, { jumlah: 3, purata_berjadual: 18.8, purata_tidak_berjadual: 6.2, melebihi: 1, hampir: 1, belum_dicerap: 2, tamat_percubaan: 1, tiada_tugasan: 1 });
  assert.equal(DK.ringkasan([]).purata_berjadual, 0);
});

test('dashboard: susun ikut lajur, menaik dan menurun', () => {
  assert.equal(DK.susun(ROWS, 'berjadual', true).map((g) => g.id).join(), 'b,c,a');
  assert.equal(DK.susun(ROWS, 'berjadual', false).map((g) => g.id).join(), 'a,c,b');
  assert.equal(DK.susun(ROWS, 'status').map((g) => g.id).join(), 'b,c,a', 'melebihi dahulu');
  assert.equal(DK.susun(ROWS, 'nama').map((g) => g.id).join(), 'a,b,c');
  assert.equal(ROWS[0].id, 'a', 'tidak mengubah susunan asal');
});

test('dashboard: ringkasan unit mengikut jawatan', () => {
  const u = DK.ringkasanUnit(ROWS, [{ id: 'kaspa', nama: 'KASPA', jenis: 'badan_beruniform' }, { id: 'krs', nama: 'KRS', jenis: 'badan_beruniform' }]);
  assert.deepEqual(u[0].jawatan, { penasihat: 1, ajk: 1 });
  assert.equal(u[0].jumlah, 2);
  assert.equal(u[1].jumlah, 0);
});

test('dashboard: CSV dengan BOM, petikan, dan pertahanan formula injection', () => {
  const rows = [G({ id: 'x', nama: '=HYPERLINK("http://jahat","klik")', jawatan: 'Guru, "Kanan"', jb: 1 }), G({ id: 'y', nama: '-2+3', jb: 2 })];
  const csv = DK.keCsv(rows, { subjek: [], unit: [], status_lantikan: [{ kod: 'tetap', label: 'Tetap' }] }, { had_berjadual: 22, had_tidak_berjadual: 10 });
  assert.ok(csv.startsWith('﻿ID guru,Nama,'));
  assert.match(csv, /"'=HYPERLINK\(""http:\/\/jahat"",""klik""\)"/);
  assert.match(csv, /"Guru, ""Kanan"""/);
  assert.match(csv, /,'-2\+3,/);
  assert.match(csv, /,Tetap,1,22,/);
  assert.equal(csv.split('\r\n').length, 4, 'tajuk + 2 baris + baris kosong akhir');
  assert.equal(DK.sel(-5), '-5', 'nombor negatif tidak diawali');
});

// ---------------------------------------------------------------- API
test('DASHBOARD: pentadbir sahaja; data guru lengkap tanpa telefon atau hash', () => {
  const w = setupWithSuperadmin();
  const { ctx, call, superToken } = w;
  const A = w.ciptaGuru('SMD01'), ADM = w.ciptaGuru('ADD01', 'pentadbir');
  const gidA = ctx.query('guru', { guru_kod: 'SMD01' })[0].id;
  call('SUBJEK_PUKAL', { teks: 'PI - Pendidikan Islam' }, superToken);
  call('KELAS_PUKAL', { teks: '2 Ali\n4 Khalid' }, superToken);
  const pi = ctx.query('subjek', {})[0].id;
  const kelas = Object.fromEntries(ctx.query('kelas', {}).map((k) => [k.nama, k.id]));
  call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMD01', status_lantikan: 'tetap', no_telefon_baru: '0123456789' }, A.token);
  call('TUGASAN_IMPORT', { tugasan: [
    { guru_id: gidA, jenis_tugasan: 'berjadual', kumpulan: 'subjek', nama_tugasan: 'PI T2', subjek_id: pi, jam_kredit: 15.5 },
    { guru_id: gidA, jenis_tugasan: 'tidak_berjadual', kumpulan: 'tugasan_tidak_berjadual', nama_tugasan: 'Panitia', jabatan: 'KURI', jam_kredit: 7.5 }] }, ADM.token);
  call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '08:00', masa_akhir: '09:00', subjek_id: pi, kelas_ids: [kelas['2 Ali'], kelas['4 Khalid']] }, A.token);
  call('CERAPAN_SIMPAN', { tahun_akademik: '2026', bilangan_dicerap: 2, pencerap: 'Pengetua' }, A.token);
  const kaspa = ctx.query('unit_kokurikulum', { nama: 'KASPA' })[0].id;
  call('REKOD_SIMPAN', { jadual: 'keahlian_unit', data: { unit_id: kaspa, tahun_akademik: '2026', jawatan: 'penasihat' } }, A.token);
  call('REKOD_SIMPAN', { jadual: 'peranan_hem', data: { tahun_akademik: '2026', jenis: 'guru_tarbiah' } }, A.token);

  assert.equal(call('DASHBOARD', {}, A.token).code, 'TIADA_KEBENARAN');
  const d = call('DASHBOARD', {}, ADM.token);
  assert.equal(d.ok, true, d.message);
  const g = d.data.guru.find((x) => x.id === gidA);
  assert.deepEqual([g.jam_berjadual, g.jam_tidak_berjadual, g.status_beban], [15.5, 7.5, 'dalam']);
  assert.deepEqual([...g.jabatan], ['KURI']);
  assert.deepEqual([...g.subjek_ids], [pi]);
  assert.deepEqual([...g.tingkatan], [2, 4], 'tingkatan daripada kelas dalam jadual');
  assert.equal(g.cerapan, 2);
  assert.equal(g.unit[0].jawatan, 'penasihat');
  assert.deepEqual([...g.peranan_hem], ['guru_tarbiah']);
  assert.deepEqual([d.data.had.had_berjadual, d.data.had.had_tidak_berjadual], [22, 10]);
  assert.equal(d.data.kelas_tanpa_guru_kelas, 2);
  assert.doesNotMatch(JSON.stringify(d), /0123456789|no_telefon|password_hash|salt/);
  // Logik pelayar atas data sebenar
  assert.equal(DK.tapis(d.data.guru, { tingkatan: 4 }).length, 1);
  assert.equal(DK.ringkasan(d.data.guru).jumlah, d.data.guru.length);
});
