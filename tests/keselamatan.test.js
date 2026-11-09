'use strict';
// Fasa 7: sapuan keselamatan menyeluruh ke atas SEMUA aksi API (bukti untuk docs/AUDIT-KESELAMATAN.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

test('setiap aksi selain LOGIN menolak permintaan tanpa token atau token palsu', () => {
  const w = setupWithSuperadmin();
  const A = w.ctx.getActions();
  Object.keys(A).filter((k) => !A[k].public).forEach((k) => {
    assert.equal(w.call(k, {}, undefined).code, 'TIDAK_LOG_MASUK', k + ' tanpa token');
    assert.equal(w.call(k, {}, '00000000-0000-4000-8000-000000000000').code, 'TIDAK_LOG_MASUK', k + ' token palsu');
  });
});

test('setiap aksi pentadbir/superadmin menolak guru biasa; aksi superadmin menolak pentadbir', () => {
  const w = setupWithSuperadmin();
  const A = w.ctx.getActions();
  const g = w.ciptaGuru('SKG01');
  const adm = w.ciptaGuru('SKA01', 'pentadbir');
  let n = 0;
  Object.keys(A).filter((k) => !A[k].public).forEach((k) => {
    const roles = [...A[k].roles];
    if (!roles.includes('guru')) { assert.equal(w.call(k, {}, g.token).code, 'TIADA_KEBENARAN', k + ' oleh guru'); n++; }
    if (!roles.includes('pentadbir')) { assert.equal(w.call(k, {}, adm.token).code, 'TIADA_KEBENARAN', k + ' oleh pentadbir'); n++; }
  });
  assert.ok(n > 20, 'banyak aksi terhad diuji');
});

test('guru tidak boleh membaca atau mengubah data guru lain melalui guru_id', () => {
  const w = setupWithSuperadmin();
  const a = w.ciptaGuru('SKG02');
  const b = w.ciptaGuru('SKG03');
  const idB = w.ctx.getById('akaun', b.akaunId).guru_id;
  ['PROFIL_LIHAT', 'KURIKULUM_LIHAT', 'KOKU_LIHAT', 'HEM_LIHAT'].forEach((k) => {
    const r = w.call(k, { guru_id: idB, tahun: 2026 }, a.token);
    assert.equal(r.ok, false, k + ' guru lain');
    assert.equal(r.code, 'TIADA_KEBENARAN', k);
  });
  const r = w.call('PROFIL_SIMPAN_TERAS', { guru_id: idB, nama_penuh: 'Diubah', status_lantikan: 'tetap' }, a.token);
  assert.equal(r.code, 'TIADA_KEBENARAN');
  assert.equal(w.ctx.getById('guru', idB).nama_penuh, 'Guru Contoh SKG03');
});

test('permintaan rosak, terlalu besar atau aksi tidak dikenali ditolak dengan selamat', () => {
  const w = setupWithSuperadmin();
  const { ctx } = w;
  assert.equal(ctx.handleRequest('bukan json').code, 'PERMINTAAN_TIDAK_SAH');
  assert.equal(ctx.handleRequest('x'.repeat(ctx.MAX_REQUEST_CHARS + 1)).code, 'PERMINTAAN_TIDAK_SAH');
  assert.equal(ctx.handleRequest(JSON.stringify({ action: 'drop table' })).code, 'PERMINTAAN_TIDAK_SAH');
  assert.equal(w.call('AKSI_REKAAN', {}, w.superToken).code, 'AKSI_TIDAK_DIKENALI');
});

test('nilai rujukan tidak aktif (kontrak) ditolak untuk rekod baharu tetapi rekod lama kekal boleh dikemas kini', () => {
  const w = setupWithSuperadmin();
  const { ctx, call, superToken } = w;
  ctx.insert('ref_status_lantikan', { kod: 'kontrak', label: 'Kontrak', susunan: 99, aktif: false });
  const r = call('AKAUN_CIPTA', { guru_kod: 'SKG04', nama_penuh: 'Guru Kontrak', status_lantikan: 'kontrak', role: 'guru' }, superToken);
  assert.equal(r.ok, false);
  assert.match(r.message, /tidak lagi digunakan/);
  // rekod lama dengan nilai tidak aktif (dimasukkan sebelum nilai dinyahaktif)
  const g = w.ciptaGuru('SKG05');
  const gid = ctx.getById('akaun', g.akaunId).guru_id;
  const sh = w.env.ss.getSheetByName('guru');
  const col = sh.grid[0].indexOf('status_lantikan');
  const row = sh.grid.findIndex((x) => x[sh.grid[0].indexOf('id')] === gid);
  sh.grid[row][col] = 'kontrak';
  assert.equal(ctx.update('guru', gid, { nama_panggilan: 'Masih boleh' }).status_lantikan, 'kontrak');
  assert.equal(ctx.update('guru', gid, { status_lantikan: 'tetap' }).status_lantikan, 'tetap');
  assert.throws(() => ctx.update('guru', gid, { status_lantikan: 'kontrak' }), (e) => e.code === 'VALIDASI' && /tidak lagi digunakan/.test(e.message));
});

test('kecemasan: logKeluarSemua membatalkan semua sesi serta-merta (termasuk yang dalam cache)', () => {
  const w = setupWithSuperadmin();
  const g = w.ciptaGuru('SKG06');
  w.call('SESI_SAYA', {}, g.token); // isi cache sesi
  assert.ok(w.ctx.logKeluarSemua() >= 2);
  assert.equal(w.call('SESI_SAYA', {}, g.token).code, 'TIDAK_LOG_MASUK');
  assert.equal(w.call('SESI_SAYA', {}, w.superToken).code, 'TIDAK_LOG_MASUK');
  assert.equal(w.login('SKG06', 'x').ok, false);
});
