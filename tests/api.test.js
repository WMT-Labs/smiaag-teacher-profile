'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadReady } = require('./helpers/load-gas');

const { ctx } = loadReady();
const call = (o) => ctx.handleRequest(typeof o === 'string' ? o : JSON.stringify(o));

test('aksi tanpa token ditolak (gagal tutup), termasuk aksi yang tidak wujud', () => {
  ['LIHAT_PROFIL', 'ADMIN_PADAM_SEMUA', 'PING'].forEach((a) => {
    const r = call({ action: a });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TIDAK_LOG_MASUK', a);
  });
});

test('token rawak ditolak pada Fasa 0', () => {
  assert.equal(call({ action: 'LIHAT_PROFIL', token: '11111111-1111-4111-8111-111111111111' }).code, 'TIDAK_LOG_MASUK');
});

test('LOGIN ialah satu-satunya aksi awam dan belum aktif', () => {
  assert.deepEqual(Object.keys(ctx.ACTIONS).filter((k) => ctx.ACTIONS[k].public), ['LOGIN']);
  assert.equal(call({ action: 'LOGIN', params: { guru_kod: 'SM1', password: 'x' } }).code, 'BELUM_SEDIA');
});

test('permintaan rosak atau terlalu besar ditolak dengan mesej biasa', () => {
  assert.equal(call('bukan json').code, 'PERMINTAAN_TIDAK_SAH');
  assert.equal(call('').code, 'PERMINTAAN_TIDAK_SAH');
  assert.equal(call({ action: 'huruf kecil' }).code, 'PERMINTAAN_TIDAK_SAH');
  assert.equal(call({ action: '__proto__' }).code, 'PERMINTAAN_TIDAK_SAH');
  assert.equal(call({ action: 'CONSTRUCTOR' }).code, 'TIDAK_LOG_MASUK');
  assert.equal(call('{"action":"X' + 'a'.repeat(70000) + '"}').code, 'PERMINTAAN_TIDAK_SAH');
});

test('ralat dalaman tidak membocorkan butiran', () => {
  ctx.ACTIONS.LOGIN.handler = () => { throw new Error('rahsia: sheet id 123'); };
  const r = call({ action: 'LOGIN' });
  assert.equal(r.code, 'RALAT_SERVER');
  assert.doesNotMatch(JSON.stringify(r), /rahsia|123/);
});
