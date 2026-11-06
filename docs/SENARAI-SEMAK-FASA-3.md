# Senarai semak manual: Fasa 3 (Kurikulum) dan perubahan Fasa 2

## 0. Kemas kini kod dan Sheet
- [ ] Tampal semula `backend/appsscript.json` dan seluruh `dist/Code.gs`. Save.
- [ ] Jika Sheet sudah disediakan sebelum ini: tab `guru` dan `jadual_slot` berubah lajur. Jika masih kosong (tiada data guru sebenar), padam kedua-dua tab itu. Jika sudah ada data guru, beritahu saya dahulu dan saya sediakan skrip pindah.
- [ ] Jalankan `setupTemplate`. Log menunjukkan tab baharu `waktu` dan `jadual_slot_kelas`, dan "Templat waktu 2026: 18 waktu". Tab `ref_status_lantikan` kini ada "percubaan".
- [ ] Jalankan `verifySetup`: semua lajur betul.
- [ ] **Deploy > Manage deployments > edit > New version > Deploy.**

## 1. Data rujukan (superadmin)
- [ ] **Data rujukan > Subjek > Tambah pukal**: tampal senarai `KOD - Nama` (contoh `PI - Pendidikan Islam`). Kod sepadan dengan singkatan dalam jadual sekolah.
- [ ] **Kelas 2026 > Tambah kelas**: tampal semua nama kelas, satu setiap baris (contoh `1 Tabari`). Baris tanpa nombor tingkatan ditolak dengan mesej.
- [ ] **Waktu persekolahan 2026**: semak 18 waktu sama dengan jadual sekolah. Ubah jika perlu dan tekan Simpan templat.
- [ ] **Had jam kredit**: 22 dan 10.

## 2. Guru (telefon)
- [ ] Menu **Kurikulum**. Tambah tugasan berjadual dan tidak berjadual daripada surat tugasan. Jumlah dan warna kad jam kredit dikemas kini.
- [ ] Untuk guru SM216, masukkan tugasan dalam surat sebenar: jumlah mesti **15.5 / 22** dan **7.5 / 10**.
- [ ] Tugasan tidak berjadual mesti ada jabatan.
- [ ] **Tambah slot**: hari, masa, subjek, tandakan dua kelas (kelas gabungan). Slot muncul dalam jadual.
- [ ] Tambah slot kedua yang bertindih masa: amaran merah dan slot berwarna merah. Padam slot itu: amaran hilang.
- [ ] Tambah slot aktiviti tanpa subjek (contoh Perhimpunan).
- [ ] Bahagian **Semakan**: subjek di luar opsyen disenaraikan (jika ada).

## 3. Profil (perubahan)
- [ ] Tiada lagi gambar atau ikon kamera pada profil.
- [ ] Guru boleh **Kemas kini** cerapan sendiri.
- [ ] Guru tukar status lantikan kepada "Dalam percubaan" dengan tarikh lantikan lebih 6 bulan lalu. Pilihan "Tetap" tidak tersedia untuk guru itu.

## 4. Pentadbir
- [ ] **Laman utama** memaparkan "Perlu tindakan": guru tamat percubaan dan guru melebihi had.
- [ ] Tekan **Lihat dan sahkan**, buka profil guru, tekan **Sahkan sebagai guru tetap**. Status jadi Tetap, tarikh pengesahan dipaparkan, `audit_log` ada `SAHKAN_GURU_TETAP`.
- [ ] **Senarai guru**: lajur jam berjadual dan tidak berjadual berwarna; tapisan beban dan percubaan berfungsi. Tekan jam untuk membuka Kurikulum guru itu.
- [ ] Kemas kini cerapan guru lain bagi pihaknya: `audit_log` mencatat "(bagi pihak guru)".
- [ ] **Cari guru ganti**: pilih hari dan waktu. Guru yang ada kelas pada waktu itu tidak tersenarai. Tapis opsyen subjek.

## 5. Sekatan akses
- [ ] Guru buka `kurikulum.html?id=<guru lain>`: ditolak.
- [ ] Guru tiada menu Cari guru ganti dan Data rujukan.

## 6. Ujian automatik
- [ ] `npm test` memaparkan `# fail 0`.
