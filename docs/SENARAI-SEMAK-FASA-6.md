# Senarai semak manual: Fasa 6 (Dashboard)

## 0. Kemas kini kod
- [ ] Tampal semula seluruh `dist/Code.gs`. Save. **Deploy > Manage deployments > edit > New version > Deploy.**
- [ ] Terbitkan semula frontend (termasuk folder `frontend/vendor/` yang mengandungi Chart.js).

## 1. Paparan
- [ ] Log masuk sebagai pentadbir. Menu **Dashboard sekolah**. Kad ringkasan, carta, jadual, cerapan, percubaan, HEM dan kokurikulum dipaparkan.
- [ ] Catat masa memuatkan dashboard dengan data sebenar: ______ saat. (Jika lebih kira-kira 8 saat, beritahu saya.)
- [ ] Bandingkan dengan surat tugasan: jam berjadual dan tidak berjadual beberapa guru betul (contoh SM216: 15.5 / 22 dan 7.5 / 10).

## 2. Penapis
- [ ] Tahun akademik: tukar tahun, data dimuat semula.
- [ ] Jabatan, status lantikan, subjek, tingkatan, unit kokurikulum, cari nama: bilangan guru dalam baris info berubah, dan semua bahagian (kad, carta, jadual, cerapan, kokurikulum) mengikut penapis.
- [ ] **Kosongkan penapis** memulihkan semua guru.

## 3. Carta dan jadual
- [ ] Carta: tukar Berjadual / Tidak berjadual; tukar susunan. Garisan menegak menunjukkan had. Warna hijau / kuning / merah sepadan dengan status.
- [ ] Tekan satu bar: halaman Kurikulum guru itu dibuka.
- [ ] Jadual: tekan tajuk lajur untuk menyusun (tekan sekali lagi untuk terbalik). Tekan nama guru: profil dibuka.
- [ ] Kad "Melebihi had" menyusun jadual mengikut keadaan. Kad "Tamat percubaan" membuka senarai guru yang perlu disahkan.

## 4. Eksport CSV
- [ ] Tapis (contoh Tingkatan 5), tekan **Eksport CSV**. Buka dalam Excel: hanya guru yang ditapis, huruf dipaparkan betul, lajur tambahan (subjek, unit, usrah) ada.

## 5. Sekatan akses
- [ ] Log masuk sebagai guru biasa dan buka `dashboard.html`: dihantar ke Laman utama. Menu Dashboard tiada.

## 6. Telefon
- [ ] Buka dashboard di telefon: penapis, kad dan carta boleh dibaca; tiada skrol ke tepi (kecuali dalam jadual kokurikulum).

## 7. Ujian automatik
- [ ] `npm test` memaparkan `# fail 0`.
