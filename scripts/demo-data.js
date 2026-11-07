'use strict';
// Data contoh untuk pelayan dev (npm run dev). Nama guru dan nombor telefon jelas palsu.
function seedDemo(ctx, a) {
  const S = {};
  [['PI', 'Pendidikan Islam'], ['PQS', 'Pendidikan Al-Quran dan As-Sunnah'], ['PIW', 'Pendidikan Ilmu Wahyu'], ['DQH', 'Dirasat Al-Quran Hafazan'],
    ['DQT/J', 'Dirasat Al-Quran Tilawah dan Tajwid'], ['GEO', 'Geografi'], ['MAT', 'Matematik'], ['SNS', 'Sains'], ['BA', 'Bahasa Arab']]
    .forEach(([kod, nama]) => { S[kod] = ctx.insert('subjek', { kod, nama, kategori: /^DQ/.test(kod) ? 'al_quran_tutorial' : 'subjek' }).id; });
  const K = {};
  ['1 Abu Bakar', '1 Umar', '2 Uthman', '2 Ali', '3 Hamzah', '4 Khalid', '5 Bilal'].forEach((nama) => { K[nama] = ctx.insert('kelas', { nama, tingkatan: +nama[0], tahun_akademik: '2026' }).id; });

  const g1 = a.g1.guru.id;
  ctx.update('guru', g1, { jawatan: 'Guru Akademik Biasa', tarikh_lantikan: '2018-01-02', no_telefon: '0120000078' });
  ctx.insert('kelayakan', { guru_id: g1, tahap: 'ijazah_sarjana_muda', bidang: 'Pengajian Al-Quran dan Sunnah', institusi: 'Universiti Contoh', tahun_tamat: '2016' });
  ctx.insert('opsyen_guru', { guru_id: g1, jenis: 'major', subjek_id: S.PI });
  ctx.insert('opsyen_guru', { guru_id: g1, jenis: 'minor', subjek_id: S['DQT/J'] });
  ctx.insert('kursus', { guru_id: g1, tajuk: 'Kursus Contoh Pedagogi Abad 21', penganjur: 'PPD Contoh', tarikh_mula: '2026-03-02', tarikh_tamat: '2026-03-03', jam: 12, tahap: 'daerah' });
  ctx.insert('cerapan', { guru_id: g1, tahun_akademik: '2026', bilangan_dicerap: 2, pencerap: 'Pengetua Contoh' });

  // Tugasan: data contoh SM216 daripada dokumen arahan (15.5 / 7.5)
  const T = (jenis_tugasan, kumpulan, nama_tugasan, jam_kredit, x = {}) => ctx.insert('tugasan_guru', { guru_id: g1, tahun_akademik: '2026', jenis_tugasan, kumpulan, nama_tugasan, jam_kredit, ...x });
  T('berjadual', 'subjek', 'Pendidikan Islam T2', 6, { subjek_id: S.PI, bilangan_kelas: 2 });
  T('berjadual', 'subjek', 'Pendidikan Al-Quran dan As-Sunnah T5', 2, { subjek_id: S.PQS, bilangan_kelas: 1 });
  T('berjadual', 'subjek', 'Pendidikan Ilmu Wahyu T2', 2, { subjek_id: S.PIW, bilangan_kelas: 2 });
  T('berjadual', 'al_quran_tutorial', 'Dirasat Al-Quran T1', 1.5, { subjek_id: S['DQT/J'], bilangan_kelas: 1 });
  T('berjadual', 'al_quran_tutorial', 'Dirasat Al-Quran T3', 1.5, { subjek_id: S['DQT/J'], bilangan_kelas: 1 });
  T('berjadual', 'aktiviti_lain', 'Kokurikulum KASPA', 1.5);
  T('berjadual', 'aktiviti_lain', 'Usrah Murabbi Pelajar', 1);
  T('tidak_berjadual', 'tugasan_tidak_berjadual', 'Ketua Panitia Dirasat Quran Tilawah dan Tajwid', 4, { jabatan: 'KURI' });
  T('tidak_berjadual', 'tugasan_tidak_berjadual', 'Guru UPP', 1, { jabatan: 'KURI' });
  T('tidak_berjadual', 'tugasan_tidak_berjadual', 'Guru Tarbiah', 2, { jabatan: 'HEM' });
  T('tidak_berjadual', 'tugasan_tidak_berjadual', 'Pengurus Pasukan Sekolah E-Sport', 0.5, { jabatan: 'KOKU' });

  // Jadual contoh (rekaan)
  const slot = (guru_id, hari, masa_mula, masa_akhir, x, kelas = []) => {
    const w = ctx.query('waktu', { tahun_akademik: '2026' });
    const s = ctx.insert('jadual_slot', { guru_id, tahun_akademik: '2026', hari, masa_mula, masa_akhir, tempoh: ctx.kiraTempoh(w, masa_mula, masa_akhir), sumber: 'manual', disahkan: true, ...x });
    kelas.forEach((k) => ctx.insert('jadual_slot_kelas', { slot_id: s.id, kelas_id: K[k] }));
  };
  slot(g1, 'isnin', '07:30', '08:40', { label: 'Perhimpunan' });
  slot(g1, 'isnin', '08:40', '09:40', { subjek_id: S['DQT/J'] }, ['1 Abu Bakar', '1 Umar']);
  slot(g1, 'isnin', '11:00', '12:30', { subjek_id: S.PI }, ['2 Uthman']);
  slot(g1, 'selasa', '10:00', '11:00', { subjek_id: S.PI }, ['2 Ali']);
  slot(g1, 'selasa', '14:30', '15:30', { label: 'Usrah' });
  slot(g1, 'rabu', '08:10', '09:00', { subjek_id: S.PIW }, ['2 Uthman', '2 Ali']);
  slot(g1, 'rabu', '14:30', '15:30', { label: 'KOKU' });
  slot(g1, 'khamis', '07:40', '08:40', { subjek_id: S.PI }, ['2 Uthman']);
  slot(g1, 'khamis', '12:30', '13:20', { subjek_id: S.PQS }, ['5 Bilal']);
  slot(g1, 'jumaat', '08:10', '09:00', { subjek_id: S['DQT/J'] }, ['3 Hamzah']);
  // Pentadbir: satu kelas bertindih dengan guru lain (contoh amaran pertindihan kelas)
  ctx.update('guru', a.ad.guru.id, { jawatan: 'Penolong Kanan Kurikulum' });
  slot(a.ad.guru.id, 'selasa', '10:30', '11:00', { subjek_id: S.MAT }, ['2 Ali']);
  ctx.insert('tugasan_guru', { guru_id: a.ad.guru.id, tahun_akademik: '2026', jenis_tugasan: 'berjadual', kumpulan: 'subjek', nama_tugasan: 'Matematik T2', subjek_id: S.MAT, bilangan_kelas: 1, jam_kredit: 5 });
  ctx.insert('cerapan', { guru_id: a.ad.guru.id, tahun_akademik: '2026', bilangan_dicerap: 1, pencerap: 'Pengetua Contoh' });

  // Kokurikulum (unit Syabab dan rumah sukan dimuat oleh setupTemplate)
  const U = Object.fromEntries(ctx.query('unit_kokurikulum', { tahun_akademik: '2026' }).map((u) => [u.nama, u.id]));
  U['Kelab Bahasa Arab'] = ctx.insert('unit_kokurikulum', { nama: 'Kelab Bahasa Arab', jenis: 'kelab_persatuan', tahun_akademik: '2026' }).id;
  U['Kelab Robotik'] = ctx.insert('unit_kokurikulum', { nama: 'Kelab Robotik', jenis: 'kelab_persatuan', tahun_akademik: '2026' }).id;
  U['Pasukan Bola Sepak'] = ctx.insert('unit_kokurikulum', { nama: 'Pasukan Bola Sepak', jenis: 'pasukan_sekolah', tahun_akademik: '2026' }).id;
  const H = Object.fromEntries(ctx.query('rumah_sukan', {}).map((r) => [r.nama, r.id]));
  ctx.insert('keahlian_unit', { guru_id: g1, unit_id: U.KASPA, tahun_akademik: '2026', jawatan: 'penasihat' });
  ctx.insert('keahlian_unit', { guru_id: g1, unit_id: U['Kelab Bahasa Arab'], tahun_akademik: '2026', jawatan: 'ajk' });
  ctx.insert('keahlian_unit', { guru_id: a.ad.guru.id, unit_id: U['Pasukan Bola Sepak'], tahun_akademik: '2026', jawatan: 'penyelaras' });
  ctx.insert('guru_rumah', { guru_id: g1, rumah_sukan_id: H.Najah, tahun_akademik: '2026', jawatan: 'Ketua Rumah' });
  ctx.insert('guru_rumah', { guru_id: a.ad.guru.id, rumah_sukan_id: H.Fatah, tahun_akademik: '2026', jawatan: 'Penasihat' });
  const pt = ctx.insert('pertandingan', { nama_acara: 'Pertandingan Kawad Kaki (contoh)', peringkat: 'daerah', tarikh: '2026-08-12', bilangan_murid: 24, pencapaian: 'Johan', unit_id: U.KASPA, tahun_akademik: '2026' });
  ctx.insert('penyertaan_pertandingan', { pertandingan_id: pt.id, guru_id: g1, peranan: 'jurulatih' });
  ctx.insert('penyertaan_pertandingan', { pertandingan_id: pt.id, guru_id: a.ad.guru.id, peranan: 'pengiring' });
  [['2023', ['Falah', 'Fatah', 'Solah', 'Najah']], ['2024', ['Fatah', 'Najah', 'Falah', 'Solah']], ['2025', ['Najah', 'Fatah', 'Solah', 'Falah']]]
    .forEach(([t, susun]) => susun.forEach((r, i) => ctx.insert('juara_rumah_sukan', { tahun_akademik: t, rumah_sukan_id: H[r], kedudukan: i + 1 })));

  // HEM: usrah pelajar, peranan, usrah guru (murabbi = Pentadbir Contoh; ahli = Guru Contoh Satu, Dua)
  ctx.insert('kumpulan_usrah_pelajar', { guru_id: g1, tahun_akademik: '2026', nama_kumpulan: 'Kumpulan Contoh Al-Fajr', tingkatan: 2, hari: 'rabu', bilangan_murid: 12 });
  ctx.insert('kumpulan_usrah_pelajar', { guru_id: g1, tahun_akademik: '2026', nama_kumpulan: 'Kumpulan Contoh An-Nur', tingkatan: 4, hari: 'rabu', bilangan_murid: 10 });
  ctx.insert('peranan_hem', { guru_id: g1, tahun_akademik: '2026', jenis: 'guru_tarbiah' });
  ctx.insert('peranan_hem', { guru_id: g1, tahun_akademik: '2026', jenis: 'guru_kelas', kelas_id: K['2 Uthman'] });
  ctx.insert('peranan_hem', { guru_id: a.ad.guru.id, tahun_akademik: '2026', jenis: 'bidang_disiplin', butiran: 'Lembaga Disiplin (contoh)' });
  const ug = ctx.insert('usrah_guru', { tahun_akademik: '2026', murabbi_guru_id: a.ad.guru.id, nama_kumpulan: 'Usrah Contoh Al-Ikhlas', hari: 'khamis' });
  [g1, a.g2.guru.id].forEach((gid) => ctx.insert('keahlian_usrah_guru', { usrah_guru_id: ug.id, guru_id: gid }));
  [['2026-09-03', 'Tafsir Surah Al-Asr', true, true], ['2026-09-24', 'Adab menuntut ilmu', true, false], ['2026-10-15', 'Sirah: Hijrah', false, true], ['2026-10-29', 'Tazkiyah an-nafs', true, true]]
    .forEach(([tarikh, tajuk, h1, h2]) => {
      const s = ctx.insert('sesi_usrah_guru', { usrah_guru_id: ug.id, tarikh, tajuk });
      ctx.insert('kehadiran_usrah_guru', { sesi_id: s.id, guru_id: g1, hadir: h1, catatan: h1 ? null : 'Kursus luar' });
      ctx.insert('kehadiran_usrah_guru', { sesi_id: s.id, guru_id: a.g2.guru.id, hadir: h2 });
    });

  // Guru baharu dalam percubaan (tamat 02/09/2026, perlu disahkan)
  ctx.update('guru', a.g2.guru.id, { status_lantikan: 'percubaan', tarikh_lantikan: '2026-03-02', jawatan: 'Guru Akademik Biasa' });
  ctx.insert('tugasan_guru', { guru_id: a.g2.guru.id, tahun_akademik: '2026', jenis_tugasan: 'berjadual', kumpulan: 'subjek', nama_tugasan: 'Sains T1', subjek_id: S.SNS, bilangan_kelas: 4, jam_kredit: 23 });
}
module.exports = { seedDemo };
