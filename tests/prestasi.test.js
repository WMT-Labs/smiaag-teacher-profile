'use strict';
// Kelajuan (cache) dan format tarikh dalam Sheet. Keselamatan cache sesi diuji dengan teliti.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBackend, loadReady } = require('./helpers/load-gas');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

const masa = (env) => env.logs.filter((l) => String(l).startsWith('[MASA]')).map((l) => {
  const m = /\[MASA\] (\w+|\?): \d+ ms, (\d+) bacaan/.exec(l); return { aksi: m[1], bacaan: +m[2] };
});

test('cache sesi: permintaan kedua tidak membaca sessions/akaun/guru', () => {
  const w = setupWithSuperadmin();
  const g = w.ciptaGuru('SMC01');
  w.env.logs.length = 0;
  w.call('SESI_SAYA', {}, g.token);
  w.call('SESI_SAYA', {}, g.token);
  const m = masa(w.env);
  assert.equal(m[1].aksi, 'SESI_SAYA');
  assert.equal(m[1].bacaan, 0, 'sesi daripada cache');
});

test('cache sesi: log keluar, nyahaktif, tukar peranan dan PDPA berkuat kuasa serta-merta', () => {
  const w = setupWithSuperadmin();
  const { ctx, call, superToken } = w;
  const g = w.ciptaGuru('SMC02');
  const adm = w.ciptaGuru('ADC02', 'pentadbir');
  call('SESI_SAYA', {}, g.token); call('AKAUN_SENARAI', {}, adm.token); // isi cache
  // log keluar
  assert.equal(call('LOGOUT', {}, g.token).ok, true);
  assert.equal(call('SESI_SAYA', {}, g.token).code, 'TIDAK_LOG_MASUK');
  // tukar peranan terus dalam data (tanpa padam sesi) -> versi akaun berubah
  ctx.update('akaun', adm.akaunId, { role: 'guru' });
  assert.equal(call('AKAUN_SENARAI', {}, adm.token).code, 'TIADA_KEBENARAN');
  ctx.update('akaun', adm.akaunId, { role: 'pentadbir' });
  assert.equal(call('AKAUN_SENARAI', {}, adm.token).ok, true);
  // nyahaktif guru (rekod guru) -> versi guru berubah
  const gid = ctx.getById('akaun', adm.akaunId).guru_id;
  ctx.update('guru', gid, { aktif: false });
  assert.equal(call('AKAUN_SENARAI', {}, adm.token).code, 'TIDAK_LOG_MASUK');
  // superadmin nyahaktif melalui API
  const g3 = w.ciptaGuru('SMC03');
  call('SESI_SAYA', {}, g3.token);
  call('AKAUN_SET_AKTIF', { akaun_id: g3.akaunId, aktif: false }, superToken);
  assert.equal(call('SESI_SAYA', {}, g3.token).code, 'TIDAK_LOG_MASUK');
});

test('cache sesi: langkah wajib (PDPA, tukar kata laluan) tidak tersekat oleh cache', () => {
  const { call, login, superToken } = setupWithSuperadmin();
  const c = call('AKAUN_CIPTA', { guru_kod: 'SMC04', nama_penuh: 'Guru Cache', status_lantikan: 'tetap', role: 'guru' }, superToken).data;
  const t = login('SMC04', c.password_sementara).data.token;
  assert.equal(call('PROFIL_LIHAT', {}, t).code, 'PERLU_TINDAKAN');
  call('SETUJU_PDPA', { setuju: true }, t);
  call('TUKAR_PASSWORD', { password_lama: c.password_sementara, password_baru: 'BaruBaru123' }, t);
  assert.equal(call('PROFIL_LIHAT', {}, t).ok, true, 'cache dikemas kini selepas langkah wajib');
});

test('cache data rujukan: bacaan kedua daripada cache; tulisan membatalkan cache', () => {
  const w = setupWithSuperadmin();
  const { ctx, call, superToken, env } = w;
  const g = w.ciptaGuru('SMC05');
  call('SUBJEK_SENARAI', {}, g.token);
  env.logs.length = 0;
  call('SUBJEK_SENARAI', {}, g.token);
  assert.equal(masa(env)[0].bacaan, 0, 'subjek dan ref daripada cache');
  call('SUBJEK_SIMPAN', { nama: 'Subjek Baharu', kategori: 'subjek' }, superToken);
  assert.equal(call('SUBJEK_SENARAI', {}, g.token).data.subjek.length, 1, 'cache dibatalkan selepas tulis');
  assert.ok(ctx);
});

test('audit_log: log ditulis tanpa membaca seluruh tab', () => {
  const w = setupWithSuperadmin();
  const { env, login } = w;
  w.ciptaGuru('SMC06');
  for (let i = 0; i < 30; i++) login('SMC06', 'salah' + i); // tambah banyak baris log
  env.logs.length = 0;
  login('SMC06', 'salah-lagi');
  const sebelum = masa(env)[0].bacaan;
  for (let i = 0; i < 30; i++) login('ZZZ' + i, 'x');
  env.logs.length = 0;
  login('SMC06', 'salah-lagi-2');
  assert.equal(masa(env)[0].bacaan, sebelum, 'bilangan bacaan tidak bertambah walaupun log bertambah');
});

test('tarikh disimpan sebagai nilai tarikh dalam Sheet, dibaca semula sebagai ISO', () => {
  const { ctx, env } = loadReady();
  const g = ctx.insert('guru', { guru_kod: 'SMT1', nama_penuh: 'Guru Tarikh', status_lantikan: 'tetap', tarikh_lantikan: '2020-01-15' });
  const row = env.ss.getSheetByName('guru').grid.at(-1);
  const cols = ctx.SCHEMA.guru.columns;
  assert.equal(Object.prototype.toString.call(row[cols.indexOf('tarikh_lantikan')]), '[object Date]');
  assert.equal(Object.prototype.toString.call(row[cols.indexOf('created_at')]), '[object Date]');
  const r = ctx.getById('guru', g.id);
  assert.equal(r.tarikh_lantikan, '2020-01-15');
  assert.equal(r.created_at, '2026-11-06T18:30:00+08:00');
});

test('setupTemplate: tukar teks tarikh lama, sisip lajur baharu, data kekal', () => {
  const { ctx, env } = loadBackend();
  ctx.setupTemplate();
  const sh = env.ss.getSheetByName('guru');
  const cols = ctx.SCHEMA.guru.columns;
  // Simulasi Sheet versi lama: tiada lajur 'email' dan 'nama_panggilan' (jika ada dalam skema), tarikh sebagai teks
  const lama = cols.filter((c) => !['email', 'nama_panggilan', 'akaun_sistem'].includes(c));
  const id = '11111111-1111-4111-8111-111111111111';
  const baris = lama.map((c) => ({ id, guru_kod: 'SML1', nama_penuh: 'Guru Lama', status_lantikan: 'tetap', tarikh_lantikan: '2019-03-04', aktif: true, created_at: '2026-01-02T08:15:00+08:00' }[c] ?? ''));
  sh.grid = [lama, baris];
  const log = ctx.setupTemplate().join('\n');
  if (lama.length !== cols.length) assert.match(log, /guru \(lajur baharu: /);
  assert.deepEqual(sh.grid[0].slice(0, cols.length), cols, 'tajuk lengkap dan tersusun');
  const r = ctx.getById('guru', id);
  assert.equal(r.nama_penuh, 'Guru Lama');
  assert.equal(r.tarikh_lantikan, '2019-03-04');
  assert.equal(r.created_at, '2026-01-02T08:15:00+08:00');
  assert.equal(Object.prototype.toString.call(sh.grid[1][cols.indexOf('created_at')]), '[object Date]', 'teks ditukar kepada tarikh');
  assert.equal(ctx.verifySetup().length, 0);
});

test('cache semua tab: permintaan kedua PROFIL_LIHAT dan DASHBOARD tidak membaca Sheet', () => {
  const w = setupWithSuperadmin();
  const { call, env } = w;
  const g = w.ciptaGuru('SMC10');
  const adm = w.ciptaGuru('ADC10', 'pentadbir');
  call('PROFIL_LIHAT', {}, g.token); call('DASHBOARD', { tahun: 2026 }, adm.token);
  env.logs.length = 0;
  call('PROFIL_LIHAT', {}, g.token); call('DASHBOARD', { tahun: 2026 }, adm.token);
  const m = masa(env);
  assert.equal(m[0].bacaan, 0, 'profil daripada cache');
  assert.equal(m[1].bacaan, 0, 'dashboard daripada cache');
});

test('cache semua tab: tulisan melalui sistem kelihatan serta-merta kepada pengguna lain', () => {
  const w = setupWithSuperadmin();
  const { call, ctx } = w;
  const g = w.ciptaGuru('SMC11');
  g.guruId = ctx.getById('akaun', g.akaunId).guru_id;
  const adm = w.ciptaGuru('ADC11', 'pentadbir');
  const sebelum = call('GURU_SENARAI', {}, adm.token).data;
  assert.equal(call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMC11', status_lantikan: 'tetap', nama_panggilan: 'Cikgu Cache' }, g.token).ok, true);
  const selepas = call('PROFIL_LIHAT', { guru_id: g.guruId }, adm.token);
  assert.equal(selepas.ok, true);
  assert.equal(selepas.data.guru.nama_panggilan, 'Cikgu Cache');
  assert.ok(sebelum);
});

test('cache semua tab: suntingan terus dalam Sheet kelihatan selepas segarkanCache()', () => {
  const w = setupWithSuperadmin();
  const { call, env, ctx } = w;
  const g = w.ciptaGuru('SMC12');
  call('PROFIL_LIHAT', {}, g.token);
  const sh = env.ss.getSheetByName('guru');
  const vals = sh.grid;
  const colNama = vals[0].indexOf('nama_panggilan');
  const r = vals.findIndex((row) => row[vals[0].indexOf('guru_kod')] === 'SMC12');
  sh.grid[r][colNama] = 'Suntingan Manual';
  assert.notEqual(call('PROFIL_LIHAT', {}, g.token).data.guru.nama_panggilan, 'Suntingan Manual', 'masih cache');
  ctx.segarkanCache();
  assert.equal(call('PROFIL_LIHAT', {}, g.token).data.guru.nama_panggilan, 'Suntingan Manual');
});

test('cache semua tab: data besar dipecah kepada beberapa kepingan dan dibaca semula dengan betul', () => {
  const { ctx } = loadReady();
  ctx.CACHE_SAIZ_PECAHAN = 500;
  const rows = [];
  for (let i = 0; i < 40; i++) rows.push({ nama: 'Subjek panjang nombor ' + i + ' — ' + 'x'.repeat(30), kategori: 'subjek' });
  ctx.insertMany('subjek', rows);
  ctx.mulaPermintaan();
  const a = ctx.query('subjek', {}).length;
  ctx.tamatPermintaan();
  ctx.mulaPermintaan();
  const b = ctx.query('subjek', {});
  const bacaan = ctx.bilanganBacaan();
  ctx.tamatPermintaan();
  assert.equal(a, 40);
  assert.equal(b.length, 40);
  assert.equal(bacaan, 0, 'dibaca daripada kepingan cache');
  assert.ok(b.some((x) => x.nama.includes('—')));
});

test('setupTemplate memasang pencetus panaskanCache sekali sahaja', () => {
  const { ctx, env } = loadReady();
  ctx.setupTemplate();
  assert.deepEqual([...env.pencetus], ['panaskanCache', 'penyelenggaraanHarian', 'sandaranMingguan']);
});
