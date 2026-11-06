'use strict';
// Data contoh untuk pelayan dev (npm run dev). Semua nama dan nombor jelas palsu.
function seedDemo(ctx, a) {
  const subjek = ['Pendidikan Islam', 'Pendidikan Al-Quran dan As-Sunnah', 'Pendidikan Ilmu Wahyu', 'Dirasat Al-Quran', 'Bahasa Arab', 'Sejarah']
    .map((nama) => ctx.insert('subjek', { nama, kategori: nama === 'Dirasat Al-Quran' ? 'al_quran_tutorial' : 'subjek' }));
  const g1 = a.g1.guru.id;
  ctx.update('guru', g1, { jawatan: 'Guru Akademik Biasa', tarikh_lantikan: '2018-01-02', no_telefon: '0120000078' });
  ctx.insert('kelayakan', { guru_id: g1, tahap: 'ijazah_sarjana_muda', bidang: 'Pengajian Al-Quran dan Sunnah', institusi: 'Universiti Contoh', tahun_tamat: '2016' });
  ctx.insert('kelayakan', { guru_id: g1, tahap: 'diploma', bidang: 'Tahfiz Al-Quran', institusi: 'Institut Contoh', tahun_tamat: '2012' });
  ctx.insert('opsyen_guru', { guru_id: g1, jenis: 'major', subjek_id: subjek[0].id });
  ctx.insert('opsyen_guru', { guru_id: g1, jenis: 'minor', subjek_id: subjek[3].id });
  ctx.insert('kursus', { guru_id: g1, tajuk: 'Kursus Contoh Pedagogi Abad 21', penganjur: 'PPD Contoh', tarikh_mula: '2026-03-02', tarikh_tamat: '2026-03-03', jam: 12, tahap: 'daerah' });
  ctx.insert('kursus', { guru_id: g1, tajuk: 'Bengkel Contoh Pentaksiran', penganjur: 'Sekolah', tarikh_mula: '2026-07-14', tarikh_tamat: '2026-07-14', jam: 4, tahap: 'sekolah' });
  ctx.insert('kursus', { guru_id: g1, tajuk: 'Kursus Contoh Tahun Lepas', penganjur: 'JPN Contoh', tarikh_mula: '2025-05-06', jam: 6, tahap: 'negeri' });
  ctx.insert('cerapan', { guru_id: g1, tahun_akademik: '2026', bilangan_dicerap: 2, pencerap: 'Pengetua Contoh' });
  ctx.insert('cerapan', { guru_id: g1, tahun_akademik: '2025', bilangan_dicerap: 3, pencerap: 'Penolong Kanan Contoh' });
  ctx.update('guru', a.ad.guru.id, { jawatan: 'Penolong Kanan Kurikulum' });
  ctx.insert('cerapan', { guru_id: a.ad.guru.id, tahun_akademik: '2026', bilangan_dicerap: 1, pencerap: 'Pengetua Contoh' });
}
module.exports = { seedDemo };
