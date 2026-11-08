# Senarai semak: penambahbaikan 08/11/2026 (12 item + kelajuan + loading)

## 0. Kemas kini Sheet ujian dan kod (tiada tab perlu dipadam)
- [ ] Tampal semula `backend/appsscript.json` (ada kebenaran baharu: hantar emel) dan seluruh `dist/Code.gs`. Save.
- [ ] Jalankan `setupTemplate`. Google minta kebenaran baharu (Send email as you). Benarkan.
      **Jangkaan log:** `guru (lajur baharu: nama_panggilan, tarikh_tamat_praktikal, email, akaun_sistem)`,
      tab baharu `warna_jadual`, `ketidakhadiran_guru`, `guru_ganti`, `lihat_akaun`.
- [ ] Buka tab `akaun`: lajur `created_at` kini `08-11-2026, 07.20` (bukan `2026-11-08T07:20:24+08:00`).
- [ ] Buka tab `lihat_akaun`: ID guru dan nama dipaparkan (tiada ID panjang).
- [ ] (Pilihan) Script Properties: `LAMAN_URL` = alamat Netlify anda; `EMEL_BALAS` = emel untuk balasan.
- [ ] **Deploy > Manage deployments > edit > New version > Deploy.** Muat naik semula folder `frontend` ke Netlify (isi `API_URL` semula).

## 1. ADMIN01 dan SM216 (item 12)
- [ ] Log masuk sebagai SM216 (superadmin sekarang). **Urus akaun > Tambah akaun**: `ADMIN01`, nama "Pentadbir Sistem", peranan **Superadmin**, tanda **Akaun sistem**.
- [ ] Log masuk sebagai ADMIN01 (tetingkap inkognito), selesaikan langkah wajib. Menu tiada Profil/Kurikulum/Koku/HEM.
- [ ] Sebagai ADMIN01: tukar peranan SM216 kepada **Pentadbir**.
- [ ] Senarai guru dan Dashboard: ADMIN01 tidak disenaraikan.

## 2. Emel (item 2)
- [ ] Tambah akaun ujian dengan emel peribadi anda. **Jangkaan:** emel diterima dengan ID guru, kata laluan sementara (dan pautan laman jika `LAMAN_URL` diisi). Dialog juga menunjukkan "telah dihantar ke ...".
- [ ] **Reset kata laluan** akaun itu: emel kedua diterima.
- [ ] Tab `audit_log`: tiada kata laluan direkod.

## 3. Tahun dan loading (item 4)
- [ ] Mana-mana pilihan tahun: 2016 hingga 2036, lalai 2026.
- [ ] Semasa menunggu: bar nipis di atas skrin, label "Sedang memuatkan…" jika lama, dan kad rangka berkilau semasa halaman dibuka.
- [ ] Dashboard: tukar 2026 > 2027 > 2026. Kembali ke 2026 serta-merta.

## 4. Kurikulum (item 5, 6)
- [ ] **Tambah slot**: masa dipaparkan 7.30 pg, 7.35 pg ... 3.30 ptg. Pilih **Masa lain…** dan isi 12.00 hingga 12.50.
- [ ] **Warna subjek**: tukar warna, simpan. Grid dan senarai telefon ikut warna baharu.
- [ ] **Cetak jadual**: pratonton cetakan A4 landskap dengan logo, nama, jam kredit, petunjuk warna. (Pada Chrome, tanda "Background graphics" jika warna tidak keluar.)
- [ ] Pentadbir: buka Kurikulum guru lain dan cetak jadualnya.

## 5. Kokurikulum (item 7, 8, 9)
- [ ] Urus kokurikulum: tiga kotak (Syabab, Kelab, Pasukan), masing-masing **Tambah** dan **Tambah pukal**. Tampal senarai kelab; nama berulang dilangkau.
- [ ] Rumah sukan: **Tetapkan guru** setiap rumah; tekan nama guru untuk jawatan. Guru dalam rumah lain tidak disenaraikan.
- [ ] Sebagai guru: Kokurikulum memaparkan tiga kotak; rumah sukan tiada butang (ditetapkan pentadbir).

## 6. Guru ganti (item 10, 11)
- [ ] Menu **Guru ganti (relief)**: pilih tarikh, **Tambah guru tidak hadir** dengan sebab (contoh CT).
- [ ] Semua kelas guru itu pada hari tersebut dipaparkan. **Cari pengganti** > senarai guru lapang (tiada kelas, hadir, belum ganti pada masa sama), dengan bilangan ganti bulan ini. **Pilih**.
- [ ] Guru yang sudah dipilih tidak muncul untuk slot lain pada masa bertindih.
- [ ] **Hebahan WhatsApp**: teks ikut templat; **Salin teks** dan tampal dalam WhatsApp.
- [ ] Tab **Carian ikut waktu** masih berfungsi.

## 7. Profil
- [ ] Sunting maklumat teras: **Nama panggilan** (untuk hebahan), **Emel**. Status **Praktikal** + tarikh tamat: notis pada profil; dalam 30 hari muncul dalam "Perlu tindakan" pentadbir dan dashboard.

## 8. Kelajuan (ukur semula)
- [ ] Log masuk: ____ s (sebelum: 6 s). Buka profil: ____ s (sebelum: 6 s). Buka dashboard: ____ s (sebelum: 9 s). Tukar tahun (kali pertama): ____ s.
- [ ] Apps Script > **Executions**: buka satu baris, cari log `[MASA] AKSI: xxx ms, n bacaan tab`. Hantar beberapa contoh kepada saya.

## 9. Ujian automatik
- [ ] `npm test`: `# fail 0`.
