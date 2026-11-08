'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadReady } = require('./helpers/load-gas');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

test('setupTemplate memuat empat rumah sukan dan unit Syabab tahun semasa (tanpa duplikat)', () => {
  const { ctx } = loadReady();
  ctx.setupTemplate();
  const r = ctx.query('rumah_sukan', {}, { orderBy: 'nama' });
  assert.deepEqual([...r].map((x) => x.nama), ['Falah', 'Fatah', 'Najah', 'Solah']);
  assert.equal(r.find((x) => x.nama === 'Fatah').warna, '#d9534f');
  const u = ctx.query('unit_kokurikulum', { tahun_akademik: '2026' });
  assert.deepEqual([...u].map((x) => x.nama).sort(), ['BSMM', 'KASPA', 'KRS', 'Puteri Islam']);
  assert.ok(u.every((x) => x.jenis === 'badan_beruniform'));
});

test('kiraan juara dan bacaan CSV juara (tulen)', () => {
  const { ctx } = loadReady();
  const k = ctx.kiraJuaraRumah([{ rumah_sukan_id: 'a', kedudukan: 1 }, { rumah_sukan_id: 'a', kedudukan: 1 }, { rumah_sukan_id: 'b', kedudukan: 2 }]);
  assert.deepEqual({ ...k.a }, { johan: 2, naib: 0, ketiga: 0, keempat: 0 });
  const rumah = [{ id: 'f', nama: 'Fatah' }, { id: 'n', nama: 'Najah' }];
  const r = ctx.bacaTeksJuara('tahun,rumah,kedudukan,catatan\n2024,Fatah,1,Johan keseluruhan\n2024,najah,2\n2023,Merah,1\n2022,Fatah,5', rumah);
  assert.equal(r.baris.length, 2);
  assert.equal(r.baris[1].rumah_sukan_id, 'n', 'nama tidak sensitif huruf');
  assert.equal(r.ralat.length, 2);
});

function dunia() {
  const w = setupWithSuperadmin();
  const A = w.ciptaGuru('SMK01'), B = w.ciptaGuru('SMK02'), ADM = w.ciptaGuru('ADK01', 'pentadbir');
  const gid = (kod) => w.ctx.query('guru', { guru_kod: kod })[0].id;
  const unit = Object.fromEntries(w.ctx.query('unit_kokurikulum', {}).map((u) => [u.nama, u.id]));
  const rumah = Object.fromEntries(w.ctx.query('rumah_sukan', {}).map((r) => [r.nama, r.id]));
  return { ...w, A, B, ADM, gidA: gid('SMK01'), gidB: gid('SMK02'), unit, rumah };
}

test('guru isi keahlian unit dan rumah sukan sendiri; unit mesti tahun yang sama', () => {
  const { ctx, call, A, ADM, unit, rumah } = dunia();
  assert.equal(call('REKOD_SIMPAN', { jadual: 'keahlian_unit', data: { unit_id: unit.KASPA, tahun_akademik: '2026', jawatan: 'penasihat' } }, A.token).ok, true);
  assert.equal(call('REKOD_SIMPAN', { jadual: 'keahlian_unit', data: { unit_id: unit.KASPA, tahun_akademik: '2026', jawatan: 'ajk' } }, A.token).code, 'DUPLIKAT');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'keahlian_unit', data: { unit_id: unit.KRS, tahun_akademik: '2025', jawatan: 'ajk' } }, A.token).code, 'VALIDASI');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'guru_rumah', data: { rumah_sukan_id: rumah.Najah, tahun_akademik: '2026' } }, A.token).code, 'TIADA_KEBENARAN', 'rumah sukan oleh pentadbir sahaja');
  const gidA = ctx.getById('akaun', A.akaunId).guru_id;
  assert.equal(call('REKOD_SIMPAN', { jadual: 'guru_rumah', guru_id: gidA, data: { rumah_sukan_id: rumah.Najah, tahun_akademik: '2026', jawatan: 'Ketua Rumah' } }, ADM.token).ok, true);
  assert.equal(call('REKOD_SIMPAN', { jadual: 'guru_rumah', guru_id: gidA, data: { rumah_sukan_id: rumah.Fatah, tahun_akademik: '2026' } }, ADM.token).code, 'DUPLIKAT', 'satu rumah setahun');
  const k = call('KOKU_LIHAT', {}, A.token).data;
  assert.equal(k.keahlian[0].unit_nama, 'KASPA');
  assert.equal(k.keahlian[0].jenis, 'badan_beruniform');
  assert.equal(k.rumah.nama, 'Najah');
  assert.equal(k.rumah.warna, '#2f6fb3');
  assert.equal(k.ref.rumah.length, 4);
  // pentadbir nampak dalam ringkasan
  const u = call('KOKU_URUS', {}, ADM.token).data;
  assert.equal(u.unit.find((x) => x.nama === 'KASPA').ahli[0].jawatan, 'penasihat');
  assert.equal(u.rumah.find((x) => x.nama === 'Najah').guru.length, 1);
  assert.ok(ctx);
});

test('akses: guru A tidak boleh lihat atau ubah kokurikulum guru B; urus untuk pentadbir sahaja', () => {
  const { ctx, call, A, B, gidB, unit } = dunia();
  const kb = call('REKOD_SIMPAN', { jadual: 'keahlian_unit', data: { unit_id: unit.KRS, tahun_akademik: '2026', jawatan: 'ajk' } }, B.token).data;
  assert.equal(call('KOKU_LIHAT', { guru_id: gidB }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('REKOD_PADAM', { jadual: 'keahlian_unit', id: kb.id }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'keahlian_unit', guru_id: gidB, data: { unit_id: unit.BSMM, tahun_akademik: '2026', jawatan: 'ajk' } }, A.token).code, 'TIADA_KEBENARAN');
  ['KOKU_URUS', 'UNIT_SIMPAN', 'UNIT_PADAM', 'JUARA_SIMPAN', 'JUARA_IMPORT', 'RUMAH_SIMPAN', 'PERTANDINGAN_PADAM'].forEach((a) => assert.equal(call(a, {}, A.token).code, 'TIADA_KEBENARAN', a));
  assert.ok(ctx.getById('keahlian_unit', kb.id));
});

test('pertandingan: guru cipta (jadi peserta), guru lain tidak boleh ubah, peserta terakhir keluar -> dipadam', () => {
  const { ctx, call, A, B, ADM, gidB, unit } = dunia();
  const p = call('PERTANDINGAN_SIMPAN', { nama_acara: 'Kawad Kaki Daerah', peringkat: 'daerah', tarikh: '2026-08-12', bilangan_murid: 24, pencapaian: 'Johan', unit_id: unit.KASPA, peranan: 'jurulatih' }, A.token);
  assert.equal(p.ok, true, p.message);
  assert.equal(p.data.peserta[0].peranan, 'jurulatih');
  assert.equal(p.data.unit_nama, 'KASPA');
  assert.equal(call('PERTANDINGAN_SIMPAN', { id: p.data.id, nama_acara: 'Digodam', peringkat: 'daerah' }, B.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('PERTANDINGAN_SIMPAN', { nama_acara: 'X', peringkat: 'antarabangsa' }, A.token).code, 'VALIDASI');
  assert.equal(call('PERTANDINGAN_SIMPAN', { nama_acara: 'X', peringkat: 'sekolah', tarikh: '2025-01-01' }, A.token).code, 'VALIDASI', 'tarikh luar tahun');
  // pentadbir tambah guru B sebagai pengiring
  const p2 = call('PENYERTAAN_SIMPAN', { pertandingan_id: p.data.id, guru_id: gidB, peranan: 'pengiring' }, ADM.token).data;
  assert.equal(p2.peserta.length, 2);
  assert.equal(call('PERTANDINGAN_SIMPAN', { id: p.data.id, nama_acara: 'Kawad Kaki Daerah Gombak', peringkat: 'daerah', tarikh: '2026-08-12' }, B.token).data.nama_acara, 'Kawad Kaki Daerah Gombak', 'peserta boleh ubah');
  assert.equal(call('KOKU_LIHAT', {}, B.token).data.pertandingan.length, 1);
  const pa = p2.peserta.find((x) => x.peranan === 'jurulatih');
  const pb = p2.peserta.find((x) => x.peranan === 'pengiring');
  assert.equal(call('PENYERTAAN_PADAM', { id: pa.id }, B.token).code, 'TIADA_KEBENARAN', 'B tidak boleh buang A');
  assert.equal(call('PENYERTAAN_PADAM', { id: pb.id }, B.token).data.pertandingan_dipadam, false);
  assert.equal(call('PENYERTAAN_PADAM', { id: pa.id }, A.token).data.pertandingan_dipadam, true);
  assert.equal(ctx.query('pertandingan', {}).length, 0);
});

test('urus unit: kelab baharu, sunting, padam (tidak jika ada ahli), salin dari tahun lepas', () => {
  const { ctx, call, A, ADM, unit } = dunia();
  const k = call('UNIT_SIMPAN', { nama: 'Kelab Robotik', jenis: 'kelab_persatuan' }, ADM.token).data;
  assert.equal(call('UNIT_SIMPAN', { nama: 'Kelab Robotik', jenis: 'kelab_persatuan' }, ADM.token).code, 'DUPLIKAT');
  assert.equal(call('UNIT_SIMPAN', { nama: 'X', jenis: 'bukan' }, ADM.token).code, 'VALIDASI');
  assert.equal(call('UNIT_SIMPAN', { id: k.id, nama: 'Kelab Robotik dan STEM', jenis: 'kelab_persatuan' }, ADM.token).data.nama, 'Kelab Robotik dan STEM');
  call('REKOD_SIMPAN', { jadual: 'keahlian_unit', data: { unit_id: unit.KRS, tahun_akademik: '2026', jawatan: 'ajk' } }, A.token);
  assert.equal(call('UNIT_PADAM', { id: unit.KRS }, ADM.token).code, 'TIDAK_DIBENARKAN');
  assert.equal(call('UNIT_PADAM', { id: k.id }, ADM.token).ok, true);
  assert.equal(call('UNIT_SALIN', { tahun: '2027' }, ADM.token).data.disalin, 4);
  assert.equal(call('UNIT_SALIN', { tahun: '2027' }, ADM.token).data.disalin, 0, 'tiada duplikat');
  assert.equal(ctx.query('unit_kokurikulum', { tahun_akademik: '2027' }).length, 4);
  assert.equal(ctx.query('keahlian_unit', { tahun_akademik: '2027' }).length, 0, 'ahli tidak disalin');
});

test('juara rumah sukan: simpan setahun (ganti), import sejarah, kiraan', () => {
  const { ctx, call, ADM, rumah } = dunia();
  const r = call('JUARA_SIMPAN', { tahun: '2026', keputusan: [{ rumah_sukan_id: rumah.Fatah, kedudukan: 1 }, { rumah_sukan_id: rumah.Najah, kedudukan: 2 }] }, ADM.token);
  assert.equal(r.data.disimpan, 2);
  assert.equal(call('JUARA_SIMPAN', { tahun: '2026', keputusan: [{ rumah_sukan_id: rumah.Fatah, kedudukan: 1 }, { rumah_sukan_id: rumah.Najah, kedudukan: 1 }] }, ADM.token).code, 'DUPLIKAT', 'dua johan');
  assert.equal(ctx.query('juara_rumah_sukan', { tahun_akademik: '2026' }).length, 2, 'gagal: keputusan lama KEKAL (tiada data hilang)');
  call('JUARA_SIMPAN', { tahun: '2026', keputusan: [{ rumah_sukan_id: rumah.Solah, kedudukan: 1 }] }, ADM.token);
  const im = call('JUARA_IMPORT', { teks: 'tahun,rumah,kedudukan\n2024,Fatah,1\n2024,Falah,2\n2025,Fatah,1\n2025,Najah,2' }, ADM.token);
  assert.deepEqual([im.data.tahun, im.data.baris], [2, 4]);
  assert.match(call('JUARA_IMPORT', { teks: '2024,Merah,1' }, ADM.token).message, /rumah "Merah"/);
  assert.equal(call('JUARA_IMPORT', { teks: '2024,Fatah,1\n2024,Najah,1' }, ADM.token).code, 'DUPLIKAT');
  assert.equal(ctx.query('juara_rumah_sukan', { tahun_akademik: '2024' }).length, 2, 'import gagal tidak memadam data 2024 sedia ada');
  const u = call('KOKU_URUS', {}, ADM.token).data;
  assert.equal(u.kiraan_juara[rumah.Fatah].johan, 2);
  assert.equal(u.kiraan_juara[rumah.Solah].johan, 1);
  assert.equal(u.juara.length, 5);
});

test('rumah sukan: pentadbir tetapkan ahli secara pukal, jawatan kekal, tolak guru dari rumah lain', () => {
  const { ctx, call, A, B, ADM, gidA, gidB, rumah } = dunia();
  assert.equal(call('RUMAH_AHLI_SIMPAN', { rumah_sukan_id: rumah.Najah, guru_ids: [gidA] }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('RUMAH_AHLI_SIMPAN', { rumah_sukan_id: rumah.Najah, guru_ids: [gidA, gidB] }, ADM.token).data.guru, 2);
  const ra = ctx.query('guru_rumah', { guru_id: gidA })[0];
  call('REKOD_SIMPAN', { jadual: 'guru_rumah', id: ra.id, data: { jawatan: 'Ketua Rumah' } }, ADM.token);
  call('RUMAH_AHLI_SIMPAN', { rumah_sukan_id: rumah.Najah, guru_ids: [gidA] }, ADM.token);
  assert.equal(ctx.query('guru_rumah', { guru_id: gidA })[0].jawatan, 'Ketua Rumah', 'jawatan kekal');
  assert.equal(ctx.query('guru_rumah', { guru_id: gidB }).length, 0, 'B dikeluarkan');
  assert.match(call('RUMAH_AHLI_SIMPAN', { rumah_sukan_id: rumah.Fatah, guru_ids: [gidA] }, ADM.token).message, /sudah dalam rumah Najah/);
  assert.equal(call('KOKU_LIHAT', {}, A.token).data.rumah.nama, 'Najah', 'guru lihat rumah sendiri');
  assert.ok(B);
});

test('tambah unit pukal mengikut jenis; yang sedia ada dilangkau', () => {
  const { ctx, call, A, ADM } = dunia();
  const r = call('UNIT_PUKAL', { jenis: 'kelab_persatuan', teks: 'Kelab Bahasa Arab\nKelab Robotik\n  Kelab   Robotik \n\nKelab Kaligrafi' }, ADM.token).data;
  assert.deepEqual([...r.ditambah], ['Kelab Bahasa Arab', 'Kelab Robotik', 'Kelab Kaligrafi']);
  assert.equal(r.dilangkau.length, 1);
  assert.equal(call('UNIT_PUKAL', { jenis: 'pasukan_sekolah', teks: 'Pasukan Bola Sepak\nKASPA' }, ADM.token).data.dilangkau[0], 'KASPA');
  assert.equal(ctx.query('unit_kokurikulum', { jenis: 'pasukan_sekolah' }).length, 1);
  assert.equal(call('UNIT_PUKAL', { jenis: 'bukan', teks: 'X' }, ADM.token).code, 'VALIDASI');
  assert.equal(call('UNIT_PUKAL', { jenis: 'kelab_persatuan', teks: 'X' }, A.token).code, 'TIADA_KEBENARAN');
});
