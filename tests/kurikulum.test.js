'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadReady } = require('./helpers/load-gas');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

// Data contoh daripada dokumen arahan (Seksyen 5.2), surat tugasan guru SM216.
const BERJADUAL = [
  ['Pendidikan Islam T2', 'subjek', 2, 6], ['Pendidikan Al-Quran dan As-Sunnah T5', 'subjek', 1, 2],
  ['Pendidikan Ilmu Wahyu T2', 'subjek', 2, 2], ['Dirasat Al-Quran T1', 'al_quran_tutorial', 1, 1.5],
  ['Dirasat Al-Quran T3', 'al_quran_tutorial', 1, 1.5], ['Kokurikulum KASPA', 'aktiviti_lain', null, 1.5],
  ['Usrah Murabbi Pelajar', 'aktiviti_lain', null, 1]
];
const TIDAK_BERJADUAL = [
  ['Ketua Panitia Dirasat Quran Tilawah dan Tajwid', 'KURI', 4], ['Guru UPP', 'KURI', 1],
  ['Guru Tarbiah', 'HEM', 2], ['Pengurus Pasukan Sekolah E-Sport', 'KOKU', 0.5]
];
const tugasanSM216 = () => BERJADUAL.map(([nama_tugasan, kumpulan, bilangan_kelas, jam_kredit]) => ({ jenis_tugasan: 'berjadual', kumpulan, nama_tugasan, bilangan_kelas, jam_kredit }))
  .concat(TIDAK_BERJADUAL.map(([nama_tugasan, jabatan, jam_kredit]) => ({ jenis_tugasan: 'tidak_berjadual', kumpulan: 'tugasan_tidak_berjadual', nama_tugasan, jabatan, jam_kredit })));

// ---------------------------------------------------------------- jam kredit (tulen)
test('jam kredit SM216: 15.5 berjadual dan 7.5 tidak berjadual', () => {
  const { ctx } = loadReady();
  const j = ctx.kiraJamKredit(tugasanSM216());
  assert.equal(j.berjadual, 15.5);
  assert.equal(j.tidak_berjadual, 7.5);
  assert.deepEqual({ ...ctx.kiraJamKredit([]) }, { berjadual: 0, tidak_berjadual: 0 });
});

test('status beban: dalam / hampir (>= 80%) / lebih', () => {
  const { ctx } = loadReady();
  assert.equal(ctx.statusBeban(15.5, 22), 'dalam');
  assert.equal(ctx.statusBeban(17.6, 22), 'hampir');
  assert.equal(ctx.statusBeban(22, 22), 'hampir', 'tepat had masih dalam had, tetapi hampir');
  assert.equal(ctx.statusBeban(22.5, 22), 'lebih');
  assert.equal(ctx.statusBebanKeseluruhan({ berjadual: 10, tidak_berjadual: 10.5 }, { had_berjadual: 22, had_tidak_berjadual: 10 }), 'lebih');
});

// ---------------------------------------------------------------- pertindihan (tulen)
const S = (id, guru_id, hari, masa_mula, masa_akhir, kelas_ids = []) => ({ id, guru_id, hari, masa_mula, masa_akhir, kelas_ids });

test('pertindihan guru: separa, penuh, tidak bertindih, bersambung, hari berbeza', () => {
  const { ctx } = loadReady();
  const k = (slots) => [...ctx.kesanPertindihan(slots)].map((p) => p.jenis + ':' + p.a + '-' + p.b);
  assert.deepEqual(k([S('a', 'g1', 'isnin', '08:10', '09:00'), S('b', 'g1', 'isnin', '08:40', '09:40')]), ['guru:a-b'], 'separa');
  assert.deepEqual(k([S('a', 'g1', 'isnin', '08:10', '09:00'), S('b', 'g1', 'isnin', '08:10', '09:00')]), ['guru:a-b'], 'penuh');
  assert.deepEqual(k([S('a', 'g1', 'isnin', '07:40', '10:00'), S('b', 'g1', 'isnin', '08:40', '09:00')]), ['guru:a-b'], 'satu di dalam yang lain');
  assert.deepEqual(k([S('a', 'g1', 'isnin', '08:10', '08:40'), S('b', 'g1', 'isnin', '08:40', '09:00')]), [], 'bersambung bukan bertindih');
  assert.deepEqual(k([S('a', 'g1', 'isnin', '08:10', '09:00'), S('b', 'g1', 'selasa', '08:10', '09:00')]), [], 'hari berbeza');
  assert.deepEqual(k([S('a', 'g1', 'isnin', '08:10', '09:00'), S('b', 'g2', 'isnin', '08:10', '09:00')]), [], 'guru berbeza, tiada kelas sama');
});

test('pertindihan kelas: kelas sama, guru berbeza, masa bertindih', () => {
  const { ctx } = loadReady();
  const r = ctx.kesanPertindihan([S('a', 'g1', 'rabu', '10:00', '11:00', ['k1', 'k2']), S('b', 'g2', 'rabu', '10:30', '11:30', ['k2']), S('c', 'g3', 'rabu', '11:00', '12:00', ['k2'])]);
  assert.deepEqual([...r].map((p) => p.jenis + ':' + p.kelas_id + ':' + p.a + '-' + p.b), ['kelas:k2:a-b', 'kelas:k2:b-c']);
});

test('slot kosong: guru yang tiada slot bertindih', () => {
  const { ctx } = loadReady();
  const slots = [S('a', 'g1', 'isnin', '08:10', '09:00'), S('b', 'g2', 'isnin', '09:00', '09:40'), S('c', 'g3', 'selasa', '08:10', '09:00')];
  assert.deepEqual([...ctx.cariGuruKosong(['g1', 'g2', 'g3', 'g4'], slots, 'isnin', '08:40', '09:00')], ['g2', 'g3', 'g4']);
  assert.deepEqual([...ctx.cariGuruKosong(['g1', 'g2', 'g3'], slots, 'isnin', '08:40', '09:20')], ['g3']);
});

test('kiraTempoh mengira waktu templat yang diliputi', () => {
  const { ctx } = loadReady();
  const w = ctx.WAKTU_LALAI.map(([masa_mula, masa_akhir]) => ({ masa_mula, masa_akhir }));
  assert.equal(ctx.kiraTempoh(w, '07:40', '08:40'), 2);
  assert.equal(ctx.kiraTempoh(w, '11:00', '12:30'), 3);
  assert.equal(ctx.kiraTempoh(w, '10:00', '11:15'), 2, 'masa Jumaat tidak sepadan sepenuhnya');
});

// ---------------------------------------------------------------- API
function dunia() {
  const w = setupWithSuperadmin();
  const A = w.ciptaGuru('SM216');
  const B = w.ciptaGuru('SMB02');
  const ADM = w.ciptaGuru('ADM02', 'pentadbir');
  const gid = (kod) => w.ctx.query('guru', { guru_kod: kod })[0].id;
  w.call('SUBJEK_PUKAL', { teks: 'PI - Pendidikan Islam\nDQH - Dirasat Al-Quran Hafazan\nGEO - Geografi' }, w.superToken);
  w.call('KELAS_PUKAL', { teks: '1 Tabari\n1 Qurtubi\n2 Uthman' }, w.superToken);
  const subjek = Object.fromEntries(w.ctx.query('subjek', {}).map((s) => [s.kod, s.id]));
  const kelas = Object.fromEntries(w.ctx.query('kelas', {}).map((k) => [k.nama, k.id]));
  return { ...w, A, B, ADM, gidA: gid('SM216'), gidB: gid('SMB02'), subjek, kelas };
}

test('setupTemplate menyediakan templat 18 waktu untuk tahun semasa', () => {
  const { ctx } = loadReady();
  const w = ctx.query('waktu', { tahun_akademik: '2026' }, { orderBy: 'nombor' });
  assert.equal(w.length, 18);
  assert.deepEqual([w[0].masa_mula, w[17].masa_akhir], ['07:30', '15:30']);
});

test('tugasan SM216 melalui API (dimasukkan pentadbir): jumlah 15.5/22 dan 7.5/10', () => {
  const { call, A, ADM, gidA } = dunia();
  tugasanSM216().forEach((t) => {
    const r = call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidA, data: { tahun_akademik: '2026', ...t } }, ADM.token);
    assert.equal(r.ok, true, r.message);
  });
  const k = call('KURIKULUM_LIHAT', {}, A.token).data;
  assert.equal(k.jam.berjadual, 15.5);
  assert.equal(k.jam.tidak_berjadual, 7.5);
  assert.deepEqual([k.had.had_berjadual, k.had.had_tidak_berjadual], [22, 10]);
  assert.deepEqual({ ...k.status }, { berjadual: 'dalam', tidak_berjadual: 'dalam' });
  assert.equal(k.tugasan.length, 11);
  assert.equal(k.boleh.tugasan, false, 'guru tidak boleh menyunting tugasan');
});

test('tugasan diisi pentadbir sahaja: guru ditolak walaupun untuk diri sendiri', () => {
  const { ctx, call, A, ADM, gidA } = dunia();
  const data = { tahun_akademik: '2026', jenis_tugasan: 'berjadual', kumpulan: 'subjek', nama_tugasan: 'PI T2', jam_kredit: 6 };
  assert.equal(call('REKOD_SIMPAN', { jadual: 'tugasan_guru', data }, A.token).code, 'TIADA_KEBENARAN');
  const t = call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidA, data }, ADM.token).data;
  assert.equal(call('REKOD_SIMPAN', { jadual: 'tugasan_guru', id: t.id, data: { jam_kredit: 20 } }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('REKOD_PADAM', { jadual: 'tugasan_guru', id: t.id }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(ctx.getById('tugasan_guru', t.id).jam_kredit, 6);
  assert.equal(call('KURIKULUM_LIHAT', { guru_id: gidA }, ADM.token).data.boleh.tugasan, true);
});

test('tugasan: tidak berjadual wajib jabatan dan kumpulan yang betul', () => {
  const { call, ADM, gidA } = dunia();
  const base = { tahun_akademik: '2026', nama_tugasan: 'Guru UPP', jam_kredit: 1 };
  assert.equal(call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidA, data: { ...base, jenis_tugasan: 'tidak_berjadual', kumpulan: 'tugasan_tidak_berjadual' } }, ADM.token).code, 'VALIDASI');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidA, data: { ...base, jenis_tugasan: 'tidak_berjadual', kumpulan: 'subjek', jabatan: 'KURI' } }, ADM.token).code, 'VALIDASI');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidA, data: { ...base, jenis_tugasan: 'berjadual', kumpulan: 'tugasan_tidak_berjadual' } }, ADM.token).code, 'VALIDASI');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidA, data: { ...base, jenis_tugasan: 'berjadual', kumpulan: 'subjek', jam_kredit: 41 } }, ADM.token).code, 'VALIDASI');
});

test('jadual: slot manual dengan kelas gabungan, pertindihan dikesan, kemas kini dan padam', () => {
  const { ctx, call, A, B, subjek, kelas } = dunia();
  const s1 = call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '08:40', masa_akhir: '09:40', subjek_id: subjek.DQH, kelas_ids: [kelas['1 Tabari'], kelas['1 Qurtubi']] }, A.token);
  assert.equal(s1.ok, true, s1.message);
  assert.equal(s1.data.amaran, 0);
  assert.equal(ctx.getById('jadual_slot', s1.data.id).tempoh, 2);
  assert.equal(ctx.getById('jadual_slot', s1.data.id).disahkan, true);
  // guru sama, masa bertindih
  const s2 = call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '09:00', masa_akhir: '10:00', label: 'Mesyuarat' }, A.token);
  assert.equal(s2.data.amaran, 1);
  // guru lain, kelas sama
  const s3 = call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '08:40', masa_akhir: '09:00', subjek_id: subjek.PI, kelas_ids: [kelas['1 Tabari']] }, B.token);
  assert.equal(s3.data.amaran, 1);
  const k = call('KURIKULUM_LIHAT', {}, A.token).data;
  assert.equal(k.slot.length, 2);
  assert.deepEqual([...k.slot.find((x) => x.id === s1.data.id).kelas].sort(), ['1 Qurtubi', '1 Tabari']);
  assert.deepEqual([...k.pertindihan].map((p) => p.jenis).sort(), ['guru', 'kelas']);
  assert.equal(k.pertindihan.find((p) => p.jenis === 'kelas').kelas, '1 Tabari');
  assert.equal(k.semakan_silang.waktu, 4, '08:40-09:40 = waktu 4,5; 09:00-10:00 = waktu 5,6');
  assert.equal(k.semakan_silang.bilangan_slot, 2);
  assert.equal(call('SLOT_PADAM', { id: s2.data.id }, A.token).ok, true);
  assert.equal(call('KURIKULUM_LIHAT', {}, A.token).data.pertindihan.length, 1, 'tinggal pertindihan kelas');
  assert.equal(ctx.query('jadual_slot_kelas', { slot_id: s2.data.id }).length, 0);
  call('SLOT_SIMPAN', { id: s1.data.id, hari: 'isnin', masa_mula: '08:40', masa_akhir: '09:40', subjek_id: subjek.DQH, kelas_ids: [kelas['1 Qurtubi']] }, A.token);
  assert.equal(ctx.query('jadual_slot_kelas', { slot_id: s1.data.id }).length, 1, 'kelas diganti semasa kemas kini');
  assert.equal(call('KURIKULUM_LIHAT', {}, A.token).data.pertindihan.length, 0);
});

test('jadual: validasi masa, subjek atau label, kelas wujud', () => {
  const { call, A, subjek } = dunia();
  assert.equal(call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '09:00', masa_akhir: '08:00', subjek_id: subjek.PI }, A.token).code, 'VALIDASI');
  assert.equal(call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '08:00', masa_akhir: '09:00' }, A.token).code, 'VALIDASI');
  assert.equal(call('SLOT_SIMPAN', { hari: 'hariraya', masa_mula: '08:00', masa_akhir: '09:00', label: 'X' }, A.token).code, 'VALIDASI');
  assert.equal(call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '8:00', masa_akhir: '09:00', label: 'X' }, A.token).code, 'VALIDASI');
  assert.equal(call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '08:00', masa_akhir: '09:00', label: 'X', kelas_ids: ['11111111-1111-4111-8111-111111111111'] }, A.token).code, 'VALIDASI');
});

test('akses jadual: guru A tidak boleh lihat, ubah atau padam jadual guru B', () => {
  const { call, A, B, gidB, subjek } = dunia();
  const sB = call('SLOT_SIMPAN', { hari: 'selasa', masa_mula: '10:00', masa_akhir: '10:30', subjek_id: subjek.PI }, B.token).data;
  assert.equal(call('KURIKULUM_LIHAT', { guru_id: gidB }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('SLOT_SIMPAN', { id: sB.id, hari: 'selasa', masa_mula: '10:00', masa_akhir: '10:30', label: 'Digodam' }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('SLOT_PADAM', { id: sB.id }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('SLOT_SIMPAN', { guru_id: gidB, hari: 'rabu', masa_mula: '10:00', masa_akhir: '10:30', label: 'X' }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('SLOT_KOSONG', { hari: 'isnin', masa_mula: '08:00', masa_akhir: '09:00' }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('KELAS_PUKAL', { teks: '3 X' }, A.token).code, 'TIADA_KEBENARAN');
});

test('slot kosong untuk guru ganti: tapis opsyen dan jabatan, beban ringan didahulukan', () => {
  const { call, A, B, ADM, gidA, gidB, subjek } = dunia();
  call('SLOT_SIMPAN', { hari: 'khamis', masa_mula: '08:10', masa_akhir: '09:00', subjek_id: subjek.PI }, A.token);
  call('REKOD_SIMPAN', { jadual: 'opsyen_guru', data: { jenis: 'major', subjek_id: subjek.PI } }, B.token);
  call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidB, data: { tahun_akademik: '2026', jenis_tugasan: 'tidak_berjadual', kumpulan: 'tugasan_tidak_berjadual', nama_tugasan: 'Guru Tarbiah', jabatan: 'HEM', jam_kredit: 2 } }, ADM.token);
  const r = call('SLOT_KOSONG', { hari: 'khamis', masa_mula: '08:40', masa_akhir: '09:00' }, ADM.token).data;
  const ids = r.guru.map((g) => g.id);
  assert.ok(!ids.includes(gidA), 'A sibuk');
  assert.ok(ids.includes(gidB));
  const o = call('SLOT_KOSONG', { hari: 'khamis', masa_mula: '08:40', masa_akhir: '09:00', subjek_id: subjek.PI }, ADM.token).data;
  assert.deepEqual([...o.guru].map((g) => g.id), [gidB]);
  assert.equal(o.guru[0].opsyen, 'major');
  assert.deepEqual([...call('SLOT_KOSONG', { hari: 'khamis', masa_mula: '08:40', masa_akhir: '09:00', jabatan: 'HEM' }, ADM.token).data.guru].map((g) => g.id), [gidB]);
});

test('semakan opsyen: subjek diajar di luar opsyen ditandakan (maklumat sahaja)', () => {
  const { call, A, subjek } = dunia();
  call('REKOD_SIMPAN', { jadual: 'opsyen_guru', data: { jenis: 'major', subjek_id: subjek.PI } }, A.token);
  call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '10:00', masa_akhir: '10:30', subjek_id: subjek.GEO }, A.token);
  call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '11:00', masa_akhir: '11:30', subjek_id: subjek.PI }, A.token);
  assert.deepEqual([...call('KURIKULUM_LIHAT', {}, A.token).data.luar_opsyen], ['Geografi']);
});

test('data rujukan: kelas pukal (tingkatan daripada nombor), subjek pukal, waktu dan had', () => {
  const { ctx, call, superToken } = dunia();
  const k = call('KELAS_PUKAL', { teks: '1 Tabari\n3 Ar-Razi\nTiada Nombor\n  5   Sofwan  ' }, superToken).data;
  assert.deepEqual([...k.ditambah], ['3 Ar-Razi', '5 Sofwan']);
  assert.deepEqual([...k.dilangkau], ['1 Tabari']);
  assert.equal(k.ralat.length, 1);
  assert.equal(ctx.query('kelas', { nama: '5 Sofwan' })[0].tingkatan, 5);
  const s = call('SUBJEK_PUKAL', { teks: 'KMA - Kimia\nEkonomi\nPI - Pendidikan Islam' }, superToken).data;
  assert.deepEqual([...s.ditambah], ['Kimia', 'Ekonomi']);
  assert.equal(ctx.query('subjek', { nama: 'Kimia' })[0].kod, 'KMA');
  assert.equal(call('WAKTU_SIMPAN', { waktu: [{ masa_mula: '07:30', masa_akhir: '08:00' }, { masa_mula: '07:50', masa_akhir: '08:30' }] }, superToken).code, 'VALIDASI');
  assert.equal(call('WAKTU_SIMPAN', { waktu: [{ masa_mula: '07:30', masa_akhir: '08:00' }, { masa_mula: '08:00', masa_akhir: '08:30' }] }, superToken).data.bilangan, 2);
  assert.equal(ctx.query('waktu', { tahun_akademik: '2026' }).length, 2);
  assert.deepEqual({ ...call('HAD_SIMPAN', { had_berjadual: 24, had_tidak_berjadual: 8 }, superToken).data }, { had_berjadual: 24, had_tidak_berjadual: 8 });
});

test('kelas yang digunakan dalam jadual tidak boleh dipadam', () => {
  const { call, A, superToken, kelas } = dunia();
  call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '10:00', masa_akhir: '10:30', label: 'X', kelas_ids: [kelas['2 Uthman']] }, A.token);
  assert.equal(call('KELAS_PADAM', { id: kelas['2 Uthman'] }, superToken).code, 'TIDAK_DIBENARKAN');
  assert.equal(call('KELAS_PADAM', { id: kelas['1 Qurtubi'] }, superToken).ok, true);
});

test('senarai guru (pentadbir) memaparkan jam kredit dan status beban', () => {
  const { call, ADM, gidA } = dunia();
  tugasanSM216().forEach((t) => call('REKOD_SIMPAN', { jadual: 'tugasan_guru', guru_id: gidA, data: { tahun_akademik: '2026', ...t } }, ADM.token));
  const g = call('GURU_SENARAI', {}, ADM.token).data.guru.find((x) => x.id === gidA);
  assert.deepEqual([g.jam_berjadual, g.jam_tidak_berjadual, g.status_beban], [15.5, 7.5, 'dalam']);
});
