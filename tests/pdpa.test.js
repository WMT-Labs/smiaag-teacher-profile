'use strict';
// Fasa 7: PDPA — eksport data sendiri, padam data guru tidak aktif tanpa merosakkan data guru lain, tempoh simpanan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

function sedia() {
  const w = setupWithSuperadmin();
  const gid = (x) => w.ctx.getById('akaun', x.akaunId).guru_id;
  const A = w.ciptaGuru('PDA01'); A.id = gid(A);
  const B = w.ciptaGuru('PDB01'); B.id = gid(B);
  const ADM = w.ciptaGuru('PDM01', 'pentadbir'); ADM.id = gid(ADM);
  return { ...w, A, B, ADM };
}

test('setiap jadual yang merujuk guru dikelaskan (padam atau kekal) — jadual baharu tidak terlepas', () => {
  const { ctx } = setupWithSuperadmin();
  Object.keys(ctx.SCHEMA).forEach((name) => {
    if (name === 'guru' || name === 'audit_log' || name === 'sessions') return;
    const s = ctx.getTableSchema(name);
    if (!s.columns.some((c) => s.defs[c].fk === 'guru')) return;
    const dikelas = ctx.PDPA_PADAM_JADUAL.includes(name) || Object.prototype.hasOwnProperty.call(ctx.PDPA_KEKAL_JADUAL, name);
    assert.ok(dikelas, 'jadual ' + name + ' perlu dikelaskan dalam Pdpa.gs');
  });
});

test('guru boleh eksport data sendiri (tanpa hash kata laluan) tetapi bukan data guru lain', () => {
  const { call, A, B, superToken } = sedia();
  call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'Kursus Eksport', tahap: 'sekolah' } }, A.token);
  const r = call('PDPA_EKSPORT', {}, A.token);
  assert.equal(r.ok, true);
  assert.equal(r.data.guru.guru_kod, 'PDA01');
  assert.equal(r.data.data.kursus[0].tajuk, 'Kursus Eksport');
  assert.ok(r.data.data.akaun[0]);
  assert.equal(r.data.data.akaun[0].password_hash, undefined);
  assert.equal(r.data.data.akaun[0].salt, undefined);
  assert.equal(call('PDPA_EKSPORT', { guru_id: B.id }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('PDPA_EKSPORT', { guru_id: B.id }, superToken).data.guru.guru_kod, 'PDB01');
});

test('padam: hanya superadmin, guru mesti tidak aktif, ID pengesahan mesti tepat', () => {
  const { call, A, ADM, superToken } = sedia();
  assert.equal(call('PDPA_PADAM', { guru_id: A.id, sahkan_kod: 'PDA01' }, ADM.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('PDPA_PADAM', { guru_id: A.id, sahkan_kod: 'PDA01' }, superToken).code, 'TIDAK_DIBENARKAN', 'masih aktif');
  call('AKAUN_SET_AKTIF', { akaun_id: A.akaunId, aktif: false }, superToken);
  assert.equal(call('PDPA_PADAM', { guru_id: A.id, sahkan_kod: 'PDA02' }, superToken).code, 'VALIDASI');
});

test('padam: data peribadi dibuang, rekod dikongsi kekal dan data guru lain tidak terjejas', () => {
  const { ctx, call, A, B, ADM, superToken } = sedia();
  call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh PDA01', status_lantikan: 'tetap', no_telefon: '012-3456789', email: 'pda01@contoh.my' }, A.token);
  call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'Kursus A', tahap: 'sekolah' } }, A.token);
  call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'Kursus B', tahap: 'sekolah' } }, B.token);
  const u = call('USRAH_GURU_SIMPAN', { nama_kumpulan: 'Usrah Kongsi', murabbi_guru_id: A.id, hari: 'khamis' }, ADM.token).data;
  call('USRAH_AHLI_SIMPAN', { usrah_guru_id: u.id, guru_ids: [B.id] }, ADM.token);
  call('AKAUN_SET_AKTIF', { akaun_id: A.akaunId, aktif: false }, superToken);
  assert.ok(ctx.getById('guru', A.id).dinyahaktif_pada, 'tarikh nyahaktif direkod');

  const r = call('PDPA_PADAM', { guru_id: A.id, sahkan_kod: 'PDA01' }, superToken);
  assert.equal(r.ok, true, r.message);
  const g = ctx.getById('guru', A.id);
  assert.equal(g.nama_penuh, 'Guru dipadam');
  assert.match(g.guru_kod, /^PADAM-/);
  assert.equal(g.no_telefon, null); assert.equal(g.email, null);
  assert.equal(ctx.query('akaun', { guru_id: A.id }).length, 0, 'akaun dipadam');
  assert.equal(ctx.query('kursus', { guru_id: A.id }).length, 0);
  assert.equal(ctx.query('kursus', { guru_id: B.id }).length, 1, 'data guru lain kekal');
  assert.equal(ctx.getById('usrah_guru', u.id).murabbi_guru_id, A.id, 'kumpulan dikongsi kekal');
  assert.equal(ctx.query('keahlian_usrah_guru', { guru_id: B.id }).length, 1, 'keahlian guru lain kekal');
  assert.equal(call('PDPA_PADAM', { guru_id: A.id, sahkan_kod: g.guru_kod }, superToken).code, 'TIDAK_JUMPA', 'tidak dipadam dua kali');
  assert.equal(call('PDPA_SENARAI_TAMAT', {}, superToken).data.some((x) => x.guru_id === A.id), false);
});

test('tempoh simpanan: layak dipadam 2 tahun selepas dinyahaktif; aktif semula mengosongkan tarikh', () => {
  const { ctx, call, A, superToken } = sedia();
  call('AKAUN_SET_AKTIF', { akaun_id: A.akaunId, aktif: false }, superToken);
  let x = call('PDPA_SENARAI_TAMAT', {}, superToken).data.find((r) => r.guru_id === A.id);
  assert.equal(x.layak, false);
  assert.equal(x.tarikh_layak_padam.slice(0, 4), String(new Date(Date.parse(ctx.getById('guru', A.id).dinyahaktif_pada)).getFullYear() + 2));
  ctx.update('guru', A.id, { dinyahaktif_pada: '2024-01-15T08:00:00+08:00' });
  x = call('PDPA_SENARAI_TAMAT', {}, superToken).data.find((r) => r.guru_id === A.id);
  assert.equal(x.layak, true);
  assert.equal(x.tarikh_layak_padam, '2026-01-15');
  call('AKAUN_SET_AKTIF', { akaun_id: A.akaunId, aktif: true }, superToken);
  assert.equal(ctx.getById('guru', A.id).dinyahaktif_pada, null);
});

test('penyelenggaraan harian membuang baris audit_log melebihi 2 tahun sahaja', () => {
  const { ctx, env, login } = sedia();
  login('PDA01', 'salah');
  const sebelum = ctx.query('audit_log', {}).length;
  env.advance(2 * 366 * 86400000);
  login('PDA01', 'salah-baharu');
  ctx.penyelenggaraanHarian();
  const selepas = ctx.query('audit_log', {});
  assert.equal(selepas.length, 1, 'hanya log baharu kekal (sebelum: ' + sebelum + ')');
  assert.equal(selepas[0].tindakan, 'LOGIN_GAGAL');
});
