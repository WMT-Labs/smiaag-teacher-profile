'use strict';
// Log masuk sekali (SSO) ke e-Cuti: tiket bertandatangan HMAC, sah 60 saat, hanya untuk guru yang ada emel.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

// Pengesah bebas (cara yang sama e-Cuti akan mengesahkan), supaya format tidak bergantung pada kod sendiri.
function sahkan(tiket, rahsia) {
  const [p, sig] = tiket.split('.');
  const jangka = crypto.createHmac('sha256', rahsia).update(p).digest('base64url');
  if (sig !== jangka) return null;
  return JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
}

test('setupTemplate menjana ECUTI_SSO_SECRET sekali sahaja', () => {
  const { ctx, env } = setupWithSuperadmin();
  const a = env.props.ECUTI_SSO_SECRET;
  assert.match(a, /^[0-9a-f]{64}$/);
  ctx.setupTemplate();
  assert.equal(env.props.ECUTI_SSO_SECRET, a);
});

test('guru dengan emel menerima tiket sah 60 saat; tandatangan boleh disahkan dan pengubahan dikesan', () => {
  const w = setupWithSuperadmin();
  const g = w.ciptaGuru('ECU01');
  assert.equal(w.call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh Ecuti', status_lantikan: 'tetap', email: 'Ecu01@Contoh.Test' }, g.token).ok, true);
  const r = w.call('ECUTI_TIKET', {}, g.token);
  assert.equal(r.ok, true, r.message);
  const p = sahkan(r.data.tiket, w.env.props.ECUTI_SSO_SECRET);
  assert.ok(p, 'tandatangan sah');
  assert.equal(p.emel, 'ecu01@contoh.test');
  assert.equal(p.kod, 'ECU01');
  assert.equal(p.aud, 'ecuti');
  assert.equal(p.exp - p.iat, 60);
  assert.equal(p.role, undefined, 'peranan e-Cuti ditentukan oleh e-Cuti, bukan tiket');
  // ubah emel dalam payload -> tandatangan tidak sah
  const [bhg, sig] = r.data.tiket.split('.');
  const palsu = Buffer.from(JSON.stringify({ ...p, emel: 'admin@smiaag.edu.my' })).toString('base64url');
  assert.equal(sahkan(palsu + '.' + sig, w.env.props.ECUTI_SSO_SECRET), null);
  assert.equal(sahkan(bhg + '.' + sig, 'kunci-lain'), null);
  // setiap tiket unik (nonce)
  assert.notEqual(sahkan(w.call('ECUTI_TIKET', {}, g.token).data.tiket, w.env.props.ECUTI_SSO_SECRET).n, p.n);
  assert.ok(w.ctx.query('audit_log', { tindakan: 'ECUTI_SSO' }).length >= 1);
});

test('tiket ditolak: tanpa log masuk, guru tanpa emel, akaun sistem, kunci belum disediakan', () => {
  const w = setupWithSuperadmin();
  assert.equal(w.call('ECUTI_TIKET', {}, undefined).code, 'TIDAK_LOG_MASUK');
  const g = w.ciptaGuru('ECU02');
  assert.equal(w.call('ECUTI_TIKET', {}, g.token).code, 'TIADA_EMEL');
  const sa = w.ctx.query('akaun', { role: 'superadmin' })[0];
  w.ctx.update('guru', sa.guru_id, { akaun_sistem: true, email: 'admin01@contoh.test' });
  assert.equal(w.call('ECUTI_TIKET', {}, w.superToken).code, 'TIDAK_DIBENARKAN', 'akaun sistem (ADMIN01) bukan guru');
  w.call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh ECU02', status_lantikan: 'tetap', email: 'ecu02@contoh.test' }, g.token);
  delete w.env.props.ECUTI_SSO_SECRET;
  assert.equal(w.call('ECUTI_TIKET', {}, g.token).code, 'SETUP_BELUM_SIAP');
});
