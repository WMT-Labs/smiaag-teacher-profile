'use strict';
// C1: cache pelayar (Api.segar). api.js dimuat dalam konteks pelayar tiruan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadBackend } = require('./helpers/load-gas');

function pelayar() {
  const stor = new Map();
  const localStorage = {
    getItem: (k) => (stor.has(k) ? stor.get(k) : null), setItem: (k, v) => stor.set(k, String(v)), removeItem: (k) => stor.delete(k),
    key: (i) => [...stor.keys()][i] ?? null, get length() { return stor.size; }
  };
  const w = { jawapan: {}, panggilan: [], stor, toast: [], pindah: null };
  const win = { APP_CONFIG: { API_URL: 'https://contoh.test/exec', SESSION_KEY: 'smiaag_session', REQUEST_TIMEOUT_MS: 5000 }, UI: { toast: (m) => w.toast.push(m) } };
  const ctx = vm.createContext({
    window: win, UI: win.UI, localStorage, document: { body: null }, location: { replace: (u) => { w.pindah = u; } },
    AbortController, setTimeout, clearTimeout, setInterval, clearInterval, Promise, JSON, Date, Object, Math, Error, console,
    fetch: (url, o) => { const b = JSON.parse(o.body); w.panggilan.push(b.action);
      const j = typeof w.jawapan[b.action] === 'function' ? w.jawapan[b.action](b) : w.jawapan[b.action];
      return j === 'RANGKAIAN' ? Promise.reject(new Error('putus')) : Promise.resolve({ json: () => Promise.resolve(j) }); }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'frontend/js/api.js'), 'utf8'), ctx);
  w.Api = win.Api;
  w.masuk = (akaun) => w.Api.setSession({ token: 't', expiry: '2099-01-01T00:00:00+08:00', sesi: { akaun_id: akaun } });
  return w;
}
const ok = (data) => ({ ok: true, data });

test('paparan pertama dari server; kali kedua serta-merta dari cache, kemudian dikemas kini hanya jika berbeza', async () => {
  const w = pelayar(); w.masuk('A1');
  const dilihat = [];
  w.jawapan.PROFIL_LIHAT = ok({ nama: 'Guru Contoh', v: 1 });
  await w.Api.segar('PROFIL_LIHAT', {}, (d, c) => dilihat.push([d.v, c]));
  assert.deepEqual(dilihat, [[1, false]]);
  await w.Api.segar('PROFIL_LIHAT', {}, (d, c) => dilihat.push([d.v, c]));
  assert.deepEqual(dilihat, [[1, false], [1, true]], 'data sama: tidak dilukis dua kali');
  w.jawapan.PROFIL_LIHAT = ok({ nama: 'Guru Contoh', v: 2 });
  await w.Api.segar('PROFIL_LIHAT', {}, (d, c) => dilihat.push([d.v, c]));
  assert.deepEqual(dilihat.slice(2), [[1, true], [2, false]], 'cache dahulu, kemudian data baharu');
});

test('data guru LAIN (guru_id) dan aksi di luar senarai tidak pernah disimpan dalam pelayar', async () => {
  const w = pelayar(); w.masuk('A1');
  w.jawapan.PROFIL_LIHAT = ok({ no_telefon: '0123456789' });
  w.jawapan.GURU_SENARAI = ok({ guru: [] });
  await w.Api.segar('PROFIL_LIHAT', { guru_id: 'g-lain' }, () => {});
  await w.Api.segar('GURU_SENARAI', {}, () => {});
  assert.equal([...w.stor.keys()].filter((k) => k.startsWith('smiaag_cache:')).length, 0);
});

test('cache dibuang selepas aksi menulis, semasa log keluar, dan tidak dikongsi antara akaun', async () => {
  const w = pelayar(); w.masuk('A1');
  w.jawapan.KOKU_LIHAT = ok({ unit: [] }); w.jawapan.SESI_SAYA = ok({}); w.jawapan.REKOD_SIMPAN = ok({ id: 1 });
  const bil = () => [...w.stor.keys()].filter((k) => k.startsWith('smiaag_cache:')).length;
  await w.Api.segar('KOKU_LIHAT', { tahun: '2026' }, () => {});
  assert.equal(bil(), 1);
  await w.Api.call('SESI_SAYA');
  assert.equal(bil(), 1, 'aksi membaca tidak membuang cache');
  await w.Api.call('REKOD_SIMPAN', {});
  assert.equal(bil(), 0, 'aksi menulis membuang cache');
  await w.Api.segar('KOKU_LIHAT', { tahun: '2026' }, () => {});
  // akaun lain pada pelayar yang sama
  w.masuk('B2');
  const dilihat = [];
  await w.Api.segar('KOKU_LIHAT', { tahun: '2026' }, (d, c) => dilihat.push(c));
  assert.deepEqual(dilihat, [false], 'tiada paparan cache milik akaun lain');
  w.Api.clearSession();
  assert.equal(bil(), 0, 'log keluar membuang semua cache');
});

test('server gagal: data terakhir kekal dipaparkan dengan makluman; sesi tamat tetap dilog keluar', async () => {
  const w = pelayar(); w.masuk('A1');
  w.jawapan.HEM_LIHAT = ok({ v: 1 });
  await w.Api.segar('HEM_LIHAT', {}, () => {});
  w.jawapan.HEM_LIHAT = 'RANGKAIAN';
  const d = await w.Api.segar('HEM_LIHAT', {}, () => {});
  assert.equal(d.v, 1);
  assert.match(w.toast[0], /Memaparkan data terakhir/);
  // tanpa cache: ralat sampai ke halaman
  w.jawapan.KURIKULUM_LIHAT = 'RANGKAIAN';
  await assert.rejects(w.Api.segar('KURIKULUM_LIHAT', {}, () => {}), /Tidak dapat berhubung/);
  // sesi dibatalkan server
  w.jawapan.HEM_LIHAT = { ok: false, code: 'TIDAK_LOG_MASUK', message: 'Sesi tamat' };
  await assert.rejects(w.Api.segar('HEM_LIHAT', {}, () => {}));
  assert.equal(w.pindah, 'index.html?tamat=1');
  assert.equal([...w.stor.keys()].length, 0, 'sesi dan cache dibuang');
});

test('setiap aksi API dikelaskan dengan betul sebagai membaca atau menulis', () => {
  const w = pelayar();
  const { ctx } = loadBackend();
  const baca = Object.keys(ctx.getActions()).filter((a) => w.Api._aksiBaca(a)).sort();
  assert.deepEqual(baca, ['AKAUN_SENARAI', 'DASHBOARD', 'ECUTI_TIKET', 'GANTI_CALON', 'GANTI_HARI', 'GANTI_SAYA', 'GURU_SENARAI', 'HEM_LIHAT', 'KOKU_LIHAT',
    'KURIKULUM_LIHAT', 'LOGIN', 'LOGOUT', 'PDPA_EKSPORT', 'PDPA_SENARAI_TAMAT', 'PROFIL_LIHAT', 'SESI_SAYA', 'SUBJEK_SENARAI', 'USRAH_SESI_LIHAT'].sort(),
    'aksi baharu: semak sama ada ia membaca atau menulis, kemudian kemas kini senarai ini');
});
