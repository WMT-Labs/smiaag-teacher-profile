'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadReady } = require('./helpers/load-gas');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');


function dunia() {
  const w = setupWithSuperadmin();
  const A = w.ciptaGuru('SMA01');
  const B = w.ciptaGuru('SMB01');
  const ADM = w.ciptaGuru('ADM01', 'pentadbir');
  const gid = (kod) => w.ctx.query('guru', { guru_kod: kod })[0].id;
  const subj = w.call('SUBJEK_SIMPAN', { nama: 'Pendidikan Islam', kategori: 'subjek' }, w.superToken).data;
  return { ...w, A, B, ADM, gidA: gid('SMA01'), gidB: gid('SMB01'), subj };
}

// ---------------------------------------------------------------- telefon (pure)
test('penutupan nombor telefon dan normalisasi', () => {
  const { ctx } = loadReady();
  assert.equal(ctx.maskPhone('0123456789'), '012-***-**89');
  assert.equal(ctx.maskPhone('01123456789'), '011-****-**89');
  assert.equal(ctx.formatPhone('0123456789'), '012-3456789');
  assert.equal(ctx.normalizePhone('012-345 6789'), '0123456789');
  assert.equal(ctx.normalizePhone('+60 12-345 6789'), '0123456789');
  assert.equal(ctx.normalizePhone('60123456789'), '0123456789');
  assert.equal(ctx.normalizePhone('12345'), null);
  assert.equal(ctx.normalizePhone('=HYPERLINK()'), null);
});

test('telefon: guru (pemilik pun) lihat versi bertutup; pentadbir lihat penuh dan dilog', () => {
  const { ctx, call, A, ADM, gidA } = dunia();
  const r = call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'tetap', no_telefon_baru: '012-345 6789' }, A.token);
  assert.equal(r.data.no_telefon, '012-***-**89', 'pemilik tidak boleh membaca semula nombor penuh');
  const pg = call('PROFIL_LIHAT', {}, A.token).data.guru;
  assert.equal(pg.no_telefon, '012-***-**89');
  assert.doesNotMatch(JSON.stringify(call('PROFIL_LIHAT', {}, A.token)), /3456789|0123456789/);
  const sebelum = ctx.query('audit_log', { tindakan: 'BACA_TELEFON_PENUH' }).length;
  const pa = call('PROFIL_LIHAT', { guru_id: gidA }, ADM.token).data.guru;
  assert.equal(pa.no_telefon, '012-3456789');
  assert.equal(ctx.query('audit_log', { tindakan: 'BACA_TELEFON_PENUH' }).length, sebelum + 1, 'setiap bacaan penuh direkod');
  assert.equal(ctx.getById('guru', gidA).no_telefon, '0123456789', 'disimpan penuh di server');
  assert.equal(call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'tetap', no_telefon_baru: 'abc' }, A.token).code, 'VALIDASI');
  // simpan tanpa no_telefon_baru tidak memadam nombor
  call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'tetap' }, A.token);
  assert.equal(ctx.getById('guru', gidA).no_telefon, '0123456789');
  call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'tetap', padam_telefon: true }, A.token);
  assert.equal(ctx.getById('guru', gidA).no_telefon, null);
});

// ---------------------------------------------------------------- semakan akses
test('guru A tidak boleh membaca atau menyunting profil guru B melalui API terus', () => {
  const { call, A, gidB } = dunia();
  assert.equal(call('PROFIL_LIHAT', { guru_id: gidB }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('PROFIL_SIMPAN_TERAS', { guru_id: gidB, nama_penuh: 'Diubah', status_lantikan: 'tetap' }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kursus', guru_id: gidB, data: { tajuk: 'X', tahap: 'sekolah' } }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('GURU_SENARAI', {}, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('CERAPAN_SIMPAN', { guru_id: gidB, tahun_akademik: '2026', bilangan_dicerap: 5 }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('PERCUBAAN_SAHKAN', { guru_id: gidB }, A.token).code, 'TIADA_KEBENARAN');
});

test('guru A tidak boleh menyunting atau memadam rekod milik B walaupun tahu id rekod', () => {
  const { ctx, call, A, B } = dunia();
  const kB = call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'Kursus B', tahap: 'daerah' } }, B.token).data;
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kursus', id: kB.id, data: { tajuk: 'Digodam' } }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('REKOD_PADAM', { jadual: 'kursus', id: kB.id }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(ctx.getById('kursus', kB.id).tajuk, 'Kursus B');
});

test('guru_id dalam data diabaikan: guru tidak boleh memindahkan rekod kepada guru lain', () => {
  const { call, A, gidB } = dunia();
  const r = call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'X', tahap: 'sekolah', guru_id: gidB } }, A.token);
  assert.equal(r.code, 'VALIDASI');
  assert.match(r.message, /guru_id/);
  assert.equal(call('REKOD_SIMPAN', { jadual: 'akaun', data: { role: 'superadmin' } }, A.token).code, 'VALIDASI', 'jadual bukan senarai putih');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'X', tahap: 'sekolah', created_by: 'x' } }, A.token).code, 'VALIDASI');
});

test('pentadbir boleh membaca dan menyunting profil guru lain; tindakan direkod', () => {
  const { ctx, call, ADM, gidB } = dunia();
  const r = call('PROFIL_SIMPAN_TERAS', { guru_id: gidB, nama_penuh: 'Nama Dibetulkan', status_lantikan: 'praktikal', jawatan: 'Guru Akademik' }, ADM.token);
  assert.equal(r.ok, true);
  assert.equal(ctx.getById('guru', gidB).status_lantikan, 'praktikal');
  const k = call('REKOD_SIMPAN', { jadual: 'kelayakan', guru_id: gidB, data: { tahap: 'ijazah_sarjana_muda', bidang: 'Syariah', institusi: 'Universiti Contoh', tahun_tamat: '2015' } }, ADM.token);
  assert.equal(k.ok, true);
  assert.equal(ctx.getById('kelayakan', k.data.id).guru_id, gidB);
  assert.ok(ctx.query('audit_log', { tindakan: 'SUNTING_PROFIL_GURU' }).length >= 2);
});

// ---------------------------------------------------------------- profil
test('profil penuh: kelayakan, opsyen, kursus, cerapan dan data rujukan', () => {
  const { call, A, ADM, gidA, subj } = dunia();
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kelayakan', data: { tahap: 'ijazah_sarjana_muda', bidang: 'Usuluddin', institusi: 'Universiti Contoh', tahun_tamat: '2012' } }, A.token).ok, true);
  const op = call('REKOD_SIMPAN', { jadual: 'opsyen_guru', data: { jenis: 'major', subjek_id: subj.id } }, A.token);
  assert.equal(op.data.subjek_nama, 'Pendidikan Islam');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'opsyen_guru', data: { jenis: 'major', subjek_id: subj.id } }, A.token).code, 'DUPLIKAT');
  call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'Kursus Pedagogi', penganjur: 'PPD', tarikh_mula: '2026-03-02', tarikh_tamat: '2026-03-03', jam: 12, tahap: 'daerah' } }, A.token);
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kursus', data: { tajuk: 'Terbalik', tahap: 'sekolah', tarikh_mula: '2026-03-05', tarikh_tamat: '2026-03-01' } }, A.token).code, 'VALIDASI');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kelayakan', data: { tahap: 'diploma', tahun_tamat: '1800' } }, A.token).code, 'VALIDASI');
  assert.equal(call('CERAPAN_SIMPAN', { guru_id: gidA, tahun_akademik: '2026', bilangan_dicerap: 2, pencerap: 'Pengetua Contoh' }, ADM.token).ok, true);
  assert.equal(call('CERAPAN_SIMPAN', { guru_id: gidA, tahun_akademik: '2026', bilangan_dicerap: 3, pencerap: 'Pengetua Contoh' }, ADM.token).data.bilangan_dicerap, 3, 'kemas kini, bukan baris baharu');

  const p = call('PROFIL_LIHAT', {}, A.token).data;
  assert.equal(p.milik_sendiri, true);
  assert.equal(p.boleh.cerapan, true, 'guru boleh mengemas kini cerapan sendiri');
  assert.equal(p.boleh.sahkan_percubaan, false);
  assert.equal(p.kelayakan.length, 1);
  assert.equal(p.opsyen[0].subjek_nama, 'Pendidikan Islam');
  assert.equal(p.kursus[0].jam, 12);
  assert.equal(p.cerapan.tahun, '2026');
  assert.equal(p.cerapan.semasa.bilangan_dicerap, 3);
  assert.equal(p.cerapan.sejarah.length, 1);
  assert.ok(p.ref.status_lantikan.length >= 3);
  assert.equal(p.ref.subjek[0].nama, 'Pendidikan Islam');
  assert.doesNotMatch(JSON.stringify(p), /password_hash|salt/);
  assert.equal(p.gambar, undefined, 'ciri gambar telah dibuang');

  const k = p.kursus[0];
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kursus', id: k.id, data: { jam: 14 } }, A.token).data.jam, 14);
  assert.equal(call('REKOD_PADAM', { jadual: 'kursus', id: k.id }, A.token).ok, true);
  assert.equal(call('PROFIL_LIHAT', {}, A.token).data.kursus.length, 0);
});

test('tarikh lantikan masa depan ditolak; nama wajib', () => {
  const { call, A } = dunia();
  assert.equal(call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru', status_lantikan: 'tetap', tarikh_lantikan: '2030-01-01' }, A.token).code, 'VALIDASI');
  assert.equal(call('PROFIL_SIMPAN_TERAS', { nama_penuh: '', status_lantikan: 'tetap' }, A.token).code, 'VALIDASI');
  assert.equal(call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Sah', status_lantikan: 'bos' }, A.token).code, 'VALIDASI');
});

// ---------------------------------------------------------------- senarai & subjek
test('senarai guru (pentadbir) tidak mengandungi telefon; subjek diurus superadmin sahaja', () => {
  const { call, A, ADM, superToken } = dunia();
  call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'tetap', no_telefon_baru: '0123456789' }, A.token);
  const s = call('GURU_SENARAI', {}, ADM.token);
  assert.equal(s.ok, true);
  assert.ok(s.data.guru.length >= 4);
  assert.doesNotMatch(JSON.stringify(s), /0123456789|no_telefon/);
  assert.equal(call('SUBJEK_SIMPAN', { nama: 'Sejarah', kategori: 'subjek' }, ADM.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('SUBJEK_SIMPAN', { nama: 'Pendidikan Islam', kategori: 'subjek' }, superToken).code, 'DUPLIKAT');
  assert.equal(call('SUBJEK_SIMPAN', { nama: 'Tahfiz', kategori: 'bukan' }, superToken).code, 'VALIDASI');
  assert.equal(call('SUBJEK_SENARAI', {}, A.token).data.subjek.length, 1);
});

// ---------------------------------------------------------------- cerapan oleh guru sendiri
test('cerapan: guru kemas kini sendiri; pentadbir boleh bagi pihak guru (direkod)', () => {
  const { ctx, call, A, ADM, gidA } = dunia();
  assert.equal(call('CERAPAN_SIMPAN', { tahun_akademik: '2026', bilangan_dicerap: 1, pencerap: 'Guru Kanan Contoh' }, A.token).data.bilangan_dicerap, 1);
  assert.equal(call('CERAPAN_SIMPAN', { guru_id: gidA, tahun_akademik: '2026', bilangan_dicerap: 2, pencerap: 'Pengetua Contoh' }, ADM.token).data.bilangan_dicerap, 2);
  assert.equal(ctx.query('cerapan', { guru_id: gidA }).length, 1);
  assert.ok(ctx.query('audit_log', { tindakan: 'CERAPAN_SIMPAN' }).some((x) => /bagi pihak/.test(x.butiran)));
});

// ---------------------------------------------------------------- tempoh percubaan
test('tarikh tamat percubaan: +6 bulan, dihadkan kepada hujung bulan', () => {
  const { ctx } = loadReady();
  assert.equal(ctx.tarikhTamatPercubaan('2026-01-15'), '2026-07-15');
  assert.equal(ctx.tarikhTamatPercubaan('2026-08-31'), '2027-02-28');
  assert.equal(ctx.tarikhTamatPercubaan('2027-08-31'), '2028-02-29', 'tahun lompat');
  assert.equal(ctx.tarikhTamatPercubaan('2026-12-01'), '2027-06-01');
  assert.equal(ctx.tarikhTamatPercubaan(null), null);
  assert.equal(ctx.statusPercubaan({ status_lantikan: 'tetap' }, '2026-11-06'), null);
  const s1 = ctx.statusPercubaan({ status_lantikan: 'percubaan', tarikh_lantikan: '2026-05-06' }, '2026-11-06');
  assert.equal(s1.tamat, true, 'tepat 6 bulan = tamat');
  assert.equal(ctx.statusPercubaan({ status_lantikan: 'percubaan', tarikh_lantikan: '2026-05-07' }, '2026-11-06').tamat, false);
  assert.equal(ctx.statusPercubaan({ status_lantikan: 'percubaan' }, '2026-11-06').perlu_tarikh_lantikan, true);
});

test('percubaan: guru boleh tukar status sendiri tetapi tidak boleh sahkan diri sebagai tetap; pentadbir sahkan', () => {
  const { ctx, call, A, ADM, gidA } = dunia();
  const r = call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'percubaan', tarikh_lantikan: '2026-04-01' }, A.token);
  assert.equal(r.data.status_lantikan, 'percubaan');
  assert.equal(call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'tetap', tarikh_lantikan: '2026-04-01' }, A.token).code, 'VALIDASI');
  assert.equal(call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'praktikal', tarikh_lantikan: '2026-04-01' }, A.token).ok, true, 'status lain boleh');
  call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Guru Contoh SMA01', status_lantikan: 'percubaan', tarikh_lantikan: '2026-04-01' }, A.token);
  const senarai = call('GURU_SENARAI', {}, ADM.token).data.guru.find((g) => g.id === gidA);
  assert.equal(senarai.percubaan.tamat, true, 'tamat 01/10/2026, hari ini 06/11/2026');
  assert.equal(senarai.percubaan.tarikh_tamat, '2026-10-01');
  const p = call('PROFIL_LIHAT', { guru_id: gidA }, ADM.token).data;
  assert.equal(p.boleh.sahkan_percubaan, true);
  assert.equal(p.percubaan.tamat, true);
  const s = call('PERCUBAAN_SAHKAN', { guru_id: gidA }, ADM.token);
  assert.equal(s.data.status_lantikan, 'tetap');
  assert.equal(s.data.tarikh_disahkan, '2026-11-06');
  assert.equal(call('PERCUBAAN_SAHKAN', { guru_id: gidA }, ADM.token).code, 'VALIDASI', 'sudah tetap');
  assert.ok(ctx.query('audit_log', { tindakan: 'SAHKAN_GURU_TETAP' }).length === 1);
});
