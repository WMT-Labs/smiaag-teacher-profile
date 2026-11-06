# Senarai semak manual: Fasa 2 (Profil teras)

## 0. Kemas kini kod
- [ ] Tampal semula `backend/appsscript.json` dan `dist/Code.gs`. Save.
- [ ] Jalankan `verifySetup` sekali. Google akan meminta kebenaran baharu (Google Drive) untuk gambar. Benarkan.
- [ ] **Deploy > Manage deployments > edit > New version > Deploy.**

## 1. Data rujukan (superadmin)
- [ ] Menu **Data rujukan**: tambah beberapa subjek (contoh Pendidikan Islam, Dirasat Al-Quran).
- [ ] Tambah subjek dengan nama sama: mesej "sudah wujud".

## 2. Profil sendiri (log masuk sebagai guru biasa, guna telefon)
- [ ] Menu **Profil saya** dibuka. Semua bahagian kelihatan: maklumat teras, cerapan, kelayakan, opsyen, kursus.
- [ ] **Sunting** maklumat teras: isi jawatan, tarikh lantikan, nombor telefon. Simpan.
- [ ] Nombor telefon dipaparkan bertutup (contoh `012-***-**78`), walaupun anda pemiliknya.
- [ ] Cuba nombor telefon `abc`: mesej ralat jelas. Cuba tarikh lantikan masa depan: ditolak.
- [ ] Tekan ikon kamera, pilih gambar dari galeri. Gambar muncul. Dalam Drive anda ada folder "SMIAAG - Gambar Guru (PERIBADI, jangan kongsi)", dan fail di dalamnya **tidak** dikongsi.
- [ ] Tambah, sunting dan padam satu kelayakan.
- [ ] Tambah opsyen major dan minor. Tambah opsyen yang sama dua kali: ditolak.
- [ ] Tambah kursus dengan tarikh tamat sebelum tarikh mula: ditolak. Tambah kursus yang betul: jumlah jam tahun ini dikemas kini.
- [ ] Bahagian Cerapan tiada butang "Kemas kini" untuk guru.

## 3. Pentadbir
- [ ] Menu **Senarai guru**: semua guru disenaraikan. Tapis "Belum dicerap" berfungsi.
- [ ] Buka profil guru tadi: nombor telefon **penuh** kelihatan. Tab `audit_log` mendapat baris `BACA_TELEFON_PENUH`.
- [ ] **Kemas kini** cerapan: bilangan 2, pencerap "Pengetua". Simpan. Profil guru (log masuk sebagai guru) menunjukkan 2 kali.
- [ ] Sunting satu kursus guru itu. `audit_log` mendapat `SUNTING_PROFIL_GURU`.

## 4. Sekatan akses
- [ ] Log masuk sebagai guru, salin alamat profil guru lain dari akaun pentadbir (`profil.html?id=...`) dan buka: "Anda hanya boleh mengakses profil anda sendiri."
- [ ] Guru tidak nampak menu Senarai guru, Urus akaun atau Data rujukan.

## 5. Ujian automatik
- [ ] `npm test` memaparkan `# fail 0`.
