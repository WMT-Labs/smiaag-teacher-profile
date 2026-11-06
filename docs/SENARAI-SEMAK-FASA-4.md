# Senarai semak manual: import (Fasa 3) dan Fasa 4 (Kokurikulum)

## 0. Kemas kini kod
- [ ] Tampal semula seluruh `dist/Code.gs`. Save.
- [ ] Jalankan `setupTemplate`. Log: "Rumah sukan ditambah: 4" dan "Unit Syabab 2026 ditambah: 4". Tab `rumah_sukan` dan `unit_kokurikulum` berisi.
- [ ] **Deploy > Manage deployments > edit > New version > Deploy.**

## 1. Import tugasan (pentadbir)
- [ ] Menu **Import tugasan > Muat turun templat**. Buka dalam Excel, isi beberapa baris untuk guru sebenar.
- [ ] Salin semua sel (termasuk tajuk), tampal, tekan **Semak**. Baris dengan ID guru salah atau jabatan kosong ditanda merah.
- [ ] Jadual "Jumlah jam kredit selepas import" menunjukkan jumlah setiap guru dengan warna.
- [ ] **Simpan**. Buka Kurikulum guru itu: tugasan dan jam kredit betul. Guru TIDAK nampak butang Tambah atau sunting tugasan.
- [ ] Import semula fail yang sama dengan "Ganti" ditanda: tiada tugasan berganda.

## 2. Import jadual aSc (pentadbir) — dengan fail contoh dahulu
- [ ] Pastikan subjek dan kelas sudah diisi di Data rujukan.
- [ ] Menu **Import jadual (aSc) > Guna fail contoh**. (Fail contoh guna guru palsu; hanya guru yang namanya sepadan akan dipadankan.)
- [ ] Langkah 2: guru yang tidak dipadankan boleh dipilih manual atau diabaikan.
- [ ] Langkah 3: baris bermasalah berwarna; ubah masa tamat jadi sebelum masa mula: butang Simpan dinyahaktifkan sehingga dibetulkan.
- [ ] Tekan **Sahkan dan simpan**. Buka Kurikulum guru berkenaan: jadual diganti.
- [ ] Bila fail eksport aSc sebenar tersedia: cuba dengan fail itu dan beritahu saya jika ada lajur yang tidak dibaca betul.

## 3. Kokurikulum guru
- [ ] Menu **Kokurikulum**. Tambah unit (contoh KASPA, Penasihat). Tambah lagi KASPA: ditolak.
- [ ] Tetapkan rumah sukan. Warna rumah betul.
- [ ] Tambah pertandingan dengan tarikh tahun lain: ditolak. Tarikh tahun ini: berjaya.

## 4. Urus kokurikulum (pentadbir)
- [ ] Ringkasan: bilangan unit setiap jenis, guru tanpa unit.
- [ ] **Tambah unit atau kelab**: isi semua kelab sekolah. Padam unit yang ada ahli: ditolak.
- [ ] Rumah sukan: guru setiap rumah. Sunting warna jika perlu.
- [ ] **Import sejarah (CSV)**: tampal keputusan tahun-tahun lepas (`tahun,rumah,kedudukan`). Jadual dan carta johan dikemas kini.
- [ ] **Rekod keputusan** tahun ini. Pilih rumah sama untuk dua kedudukan: mesej ralat.
- [ ] Pertandingan: tambah guru lain sebagai pengiring.

## 5. Sekatan akses
- [ ] Guru buka `koku.html?id=<guru lain>`: ditolak. Guru buka `koku-urus.html`: dihantar ke Laman utama.

## 6. Ujian automatik
- [ ] `npm test` memaparkan `# fail 0`.
