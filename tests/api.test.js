'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadReady } = require('./helpers/load-gas');

const { ctx } = loadReady();
const call = (o) => ctx.handleRequest(typeof o === 'string' ? o : JSON.stringify(o));

test('aksi tanpa token ditolak (gagal tutup), termasuk aksi yang tidak wujud', () => {
  ['SESI_SAYA', 'AKAUN_SENARAI', 'ADMIN_PADAM_SEMUA', 'PING'].forEach((a) => {
    const r = call({ action: a });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TIDAK_LOG_MASUK', a);
  });
});

test('token rawak dan token bukan UUID ditolak', () => {
  assert.equal(call({ action: 'SESI_SAYA', token: '11111111-1111-4111-8111-111111111111' }).code, 'TIDAK_LOG_MASUK');
  assert.equal(call({ action: 'SESI_SAYA', token: "' OR 1=1" }).code, 'TIDAK_LOG_MASUK');
  assert.equal(call({ action: 'SESI_SAYA', token: { $ne: null } }).code, 'TIDAK_LOG_MASUK');
});

test('LOGIN ialah satu-satunya aksi awam; setiap aksi lain ada senarai peranan', () => {
  const A = ctx.getActions();
  assert.deepEqual(Object.keys(A).filter((k) => A[k].public), ['LOGIN']);
  Object.keys(A).filter((k) => !A[k].public).forEach((k) => assert.ok(A[k].roles.length > 0, k));
  assert.deepEqual([...A.AKAUN_CIPTA.roles], ['superadmin']);
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
  const A = ctx.getActions();
  const asal = A.LOGIN.handler;
  A.LOGIN.handler = () => { throw new Error('rahsia: sheet id 123'); };
  const r = call({ action: 'LOGIN' });
  A.LOGIN.handler = asal;
  assert.equal(r.code, 'RALAT_SERVER');
  assert.doesNotMatch(JSON.stringify(r), /rahsia|123/);
});
