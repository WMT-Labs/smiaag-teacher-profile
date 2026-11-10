# Pelan penambahbaikan 2: Profil Guru + e-Cuti

> Dicadangkan 10/11/2026. Status: **DIPERSETUJUI pemilik 10/11/2026; sedang dilaksanakan ikut urutan.**
> Pemilik mahu semua item A–C; kumpulan D (hos, akaun sekolah, domain, Supabase) selepas A–C selesai.
> Kod item merujuk senarai idea dalam perbualan 10/11/2026 (ringkasan di bawah).

## Prinsip supaya sistem yang sedang digunakan tidak terganggu

1. Satu item = satu PR kecil dengan ujian. Tiada PR yang mengubah dua sistem serentak tanpa keserasian ke belakang.
2. Semua diuji dahulu dalam pratonton (GitHub Pages + deployment Apps Script pratonton). Sistem sebenar dikemas kini
   sekali di hujung setiap peringkat.
3. Perubahan data hanya MENAMBAH (lajur/tab baharu). Tiada lajur dipadam atau ditukar makna sehingga peringkat akhir.
4. Sambungan antara sistem bermula dengan BACA sahaja, kemudian baru TULIS.
5. Sandaran dahulu sebelum apa-apa.

## Urutan

### Peringkat 0: asas stabil (kebanyakannya tindakan pemilik)
- Selesaikan SSO: merge PR e-Cuti #4, kemas kini deployment utama Apps Script e-Cuti, pulihkan laman Netlify e-Cuti.
- Ujian Fasa 7 (`docs/SENARAI-SEMAK-FASA-7.md`).
- **C6** sandaran automatik mingguan (kedua-dua Sheet) — dibuat PERTAMA kerana semua kerja selepas ini menyentuh data.

### Peringkat 1: e-Cuti, pembaikan dalaman (tiada kebergantungan pada Profil Guru)
Urutan: ujian tambahan untuk kod sedia ada -> **B3** kata laluan -> **B1** padanan baki ikut emel -> **B4** kelajuan (cache sesi)
-> **B5** cuti umum -> ~~B6~~ (dibatalkan) -> **B8** notis privasi dan simpanan lampiran -> **B2** CSP + pustaka dihos
sendiri (paling berisiko pada rupa, jadi terakhir dan diuji visual) -> **B7** jenis cuti (ubah model data; mesti siap
SEBELUM peringkat 3 supaya sambungan dibina sekali sahaja).

### Peringkat 2: Profil Guru, pembaikan dalaman (boleh berjalan selari dengan peringkat 1)
**C3** guru nampak relief sendiri -> **C1** cache pelayar -> **C5** PWA -> **C4** laporan cetak/PDF.
**C2** fail aSc sebenar: bila-bila fail diterima.

### Peringkat 3: sambungan dua sistem
Asas dahulu: saluran pelayan-ke-pelayan bertandatangan (kunci kongsi, seperti SSO), dipadankan ikut emel.
1. **A3** baki cuti dalam Profil Guru (baca sahaja)
2. **A4** cuti dalam dashboard sekolah (baca sahaja)
3. **A5** borang cuti guna jadual sebenar (e-Cuti membaca Profil Guru)
4. **A1** cuti diluluskan -> "tidak hadir" dalam Guru ganti (tulisan pertama antara sistem; termasuk batal/tolak)
5. **A2** satu senarai guru (Profil Guru jadi sumber; tab Users/DATA_GURU e-Cuti dibersarakan berperingkat)

### Selepas A–C: kumpulan D
D1 hos tanpa kredit, D2 akaun Google sekolah, D3 domain, D4 Supabase (A2 lebih mudah jika digabung dengan D4;
pemilik boleh memilih untuk menangguhkan A2 ke D4).

## Keputusan pemilik (10/11/2026)
- **Urutan dipersetujui.** Netlify kekal dihentikan sehingga semua kemas kini siap; pratonton di GitHub Pages.
- **B5:** masukkan automatik cuti umum Kumpulan B (Selangor) daripada PDF cuti yang akan diberi pemilik; admin boleh
  menambah cuti tambahan kemudian. (PDF belum diterima dalam sesi ini.)
- **B6: DIBATALKAN.** Tiada emel kepada admin; guru memaklumkan Pengetua melalui WhatsApp sendiri.
- **B7:** jenis lain = cuti sakit, kursus, program, cuti tanpa gaji, cuti ehsan. TIDAK terpakai had 3 orang sehari
  (had itu khas cuti tahunan) dan TIDAK dipaparkan dalam kalendar utama e-Cuti. Tujuannya hanya membantu mencari
  relief dalam Profil Guru. Tafsiran: e-Cuti kekal untuk cuti tahunan sahaja; jenis lain direkod sebagai jenis
  ketidakhadiran dalam Guru ganti (Profil Guru). Sahkan dengan pemilik sebelum bina.
- **B8:** lampiran disimpan 2 tahun.
- **A1:** hanya cuti yang DILULUSKAN.
- **A2: DITANGGUHKAN** (bersama D4 Supabase).
- **Staf bukan guru: didaftarkan juga dalam Profil Guru** (perlu jenis kakitangan baharu yang dikecualikan daripada
  senarai/kiraan guru mengajar, seperti akaun sistem; dibina sebelum A3).

## Ringkasan item
A1 cuti lulus -> Guru ganti · A2 satu senarai guru · A3 baki cuti dalam Profil Guru · A4 cuti dalam dashboard ·
A5 borang cuti guna jadual sebenar · B1 baki ikut emel · B2 CSP + pustaka sendiri · B3 kata laluan · B4 kelajuan ·
B5 cuti umum · B6 notifikasi pentadbir · B7 jenis cuti · B8 privasi/simpanan lampiran · C1 cache pelayar ·
C2 aSc sebenar · C3 relief sendiri · C4 laporan · C5 PWA · C6 sandaran.

## Kemajuan
- [x] **C6** sandaran mingguan Profil Guru (`backend/Sandaran.gs`, 10/11/2026). Perlu pemilik: tampal `dist/Code.gs`, jalankan
  `setupTemplate` (pasang pencetus), kemudian `sandaranMingguan` sekali untuk sandaran pertama.
- [x] Peringkat 1 e-Cuti (PR WeBake/e-Cuti-SMIAAG#5, 10/11/2026, menunggu merge + deploy pratonton oleh pemilik):
  ujian + harness, **B3**, **B1**, **B4**, **B5** (Kalendar Akademik 2027 Kumpulan B daripada PDF pemilik), **B8**,
  sandaran e-Cuti (C6). Pemilik perlu: tampal Code.gs, jalankan `pasangPencetus` dan `isiEmelDataGuru`, tambah cuti
  umum yang tiada dalam pekeliling (Hari Pekerja, Hari Malaysia, cuti negeri, cuti ganti 8 Feb 2027 dll.).
- [ ] **B2** CSP + pustaka dihos sendiri (PR berasingan, seterusnya).
- [ ] **B7** (disahkan pemilik): e-Cuti kekal cuti tahunan sahaja; jenis lain (cuti sakit, kursus, program, cuti tanpa
  gaji, cuti ehsan) direkod sebagai jenis ketidakhadiran dalam Guru ganti Profil Guru. Dibina dalam Profil Guru
  (lajur `jenis` pada `ketidakhadiran_guru`), sebelum A1.
