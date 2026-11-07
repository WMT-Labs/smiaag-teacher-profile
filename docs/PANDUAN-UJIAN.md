# Panduan menguji sistem (untuk pemilik)

Panduan ini membawa anda dari kosong sehingga sistem berjalan di Google dengan akaun ujian.
Masa: kira-kira 45 minit untuk persediaan, kemudian ujian ikut kadar anda.

> **Penting:** buat semua ujian dalam **Sheet UJIAN yang berasingan**. Jangan masukkan data guru sebenar lagi.
> Bila sistem sudah sedia untuk digunakan, kita akan sediakan Sheet baharu yang bersih untuk data sebenar.

> **Jujur tentang status:** semua kod sudah diuji secara automatik (111 ujian) dan di pelayar, tetapi
> belum pernah dijalankan di Google Apps Script sebenar. Jika ada ralat pada langkah awal, itu dijangka.
> Salin mesej ralat penuh (atau ambil gambar skrin) dan hantar kepada saya.

---

## Bahagian A: Sediakan pangkalan data (Google Sheet + Apps Script)

### A1. Cipta Sheet ujian
1. Buka <https://sheets.new> (guna akaun Google yang akan memiliki sistem).
2. Namakan Sheet: `SMIAAG Profil Guru (UJIAN)`.
3. Jangan kongsi Sheet ini dengan sesiapa.

### A2. Salin kod ke Apps Script
1. Dalam Sheet: menu **Extensions > Apps Script**. Tab baharu terbuka.
2. Klik ikon **roda gigi (Project Settings)** di kiri. Tandakan **Show "appsscript.json" manifest file in editor**.
3. Klik ikon **< > (Editor)** di kiri. Anda nampak dua fail: `Code.gs` dan `appsscript.json`.
4. Buka fail ini di GitHub (branch `claude/dreamy-einstein-9ucbl7`):
   `https://github.com/WMT-Labs/smiaag-teacher-profile/blob/claude/dreamy-einstein-9ucbl7/backend/appsscript.json`
   Tekan butang **Copy raw file** (ikon dua kotak) di kanan atas kod.
5. Kembali ke Apps Script, klik `appsscript.json`, padam semua isi, tampal. Tekan **Ctrl+S** (Save).
6. Buka: `https://github.com/WMT-Labs/smiaag-teacher-profile/blob/claude/dreamy-einstein-9ucbl7/dist/Code.gs`
   Tekan **Copy raw file**.
7. Klik `Code.gs`, padam semua isi, tampal. **Ctrl+S**.

### A3. Bina semua tab
1. Di bar atas editor, pilih fungsi **setupTemplate** pada senarai fungsi (sebelah butang Debug), tekan **Run**.
2. Google minta kebenaran: **Review permissions** > pilih akaun anda.
3. Jika keluar "Google hasn't verified this app": klik **Advanced** > **Go to ... (unsafe)** > **Allow**. (Skrip ini milik anda sendiri.)
4. Lihat **Execution log** di bawah.

**Jangkaan:** log menyenaraikan tab "Dicipta", "Rumah sukan ditambah: 4", "Unit Syabab 2026 ditambah: 4", "Templat waktu 2026: 18 waktu", dan "SELESAI". Di Sheet, ada lebih 40 tab (hijau = rujukan, biru = data).

### A4. Cipta akaun superadmin anda
1. Klik **roda gigi (Project Settings)**, turun ke **Script Properties** > **Add script property**:
   - Property `BOOTSTRAP_GURU_KOD`, value: ID guru anda (contoh `SM216`)
   - Property `BOOTSTRAP_NAMA`, value: nama penuh anda
2. **Save script properties**.
3. Kembali ke Editor, pilih fungsi **ciptaSuperadminPertama**, tekan **Run**.

**Jangkaan:** log memaparkan `Kata laluan sementara: xxxxxxxxxx`. **Catat kata laluan ini.** Dua property tadi hilang sendiri.

### A5. Terbitkan sebagai Web App
1. Butang biru **Deploy** (kanan atas) > **New deployment**.
2. Klik ikon roda gigi sebelah "Select type" > **Web app**.
3. Description: `Ujian 1`. **Execute as: Me**. **Who has access: Anyone**.
4. **Deploy**. Salin **Web app URL** (berakhir dengan `/exec`).
5. Tampal URL itu dalam tab pelayar baharu.

**Jangkaan:** anda nampak teks `{"ok":false,"code":"KAEDAH_TIDAK_DIBENARKAN",...}`. Itu betul: pelayan hidup dan tidak memberi data kepada sesiapa tanpa log masuk.

---

## Bahagian B: Terbitkan laman (frontend)

Cara paling mudah: **Netlify Drop** (percuma, tanpa arahan komputer).

1. Muat turun kod: buka
   `https://github.com/WMT-Labs/smiaag-teacher-profile/archive/refs/heads/claude/dreamy-einstein-9ucbl7.zip`
   dan ekstrak (unzip) fail itu.
2. Dalam folder yang diekstrak, buka `frontend/js/config.js` dengan Notepad (Windows) atau TextEdit (Mac).
3. Ganti baris `API_URL: '',` dengan URL dari A5, contoh:
   `API_URL: 'https://script.google.com/macros/s/AKfy.../exec',`
   Simpan fail.
4. Buka <https://app.netlify.com/drop>. Daftar akaun percuma (supaya laman tidak hilang selepas sejam).
5. Seret **folder `frontend`** (bukan seluruh projek) ke kotak di laman itu.
6. Netlify beri alamat laman, contoh `https://nama-rawak.netlify.app`. Buka alamat itu.

**Jangkaan:** halaman log masuk dengan logo sekolah.

> Jika anda menukar kod kemudian (contoh selepas Fasa 7), ulang A2 (tampal `Code.gs` baharu), kemudian
> **Deploy > Manage deployments > pensel > Version: New version > Deploy**. URL kekal sama.

---

## Bahagian C: Ujian mengikut peranan

Gunakan **tetingkap inkognito** (Ctrl+Shift+N) untuk setiap pengguna lain, supaya anda boleh log masuk sebagai beberapa orang serentak.
Gunakan **nama palsu** untuk akaun ujian, contoh "Guru Ujian Satu".

### C1. Superadmin (anda)
1. Log masuk dengan ID guru dan kata laluan sementara dari A4.
   **Jangkaan:** notis privasi > tandakan setuju > tetapkan kata laluan baharu > Laman utama.
2. **Data rujukan**:
   - Subjek > **Tambah pukal**: tampal beberapa baris, contoh
     `PI - Pendidikan Islam`, `DQT/J - Dirasat Al-Quran Tilawah dan Tajwid`, `MAT - Matematik`
   - Kelas 2026 > **Tambah kelas**: contoh `1 Tabari`, `2 Uthman`, `3 Ar-Razi`
   - Semak waktu persekolahan (18 waktu) dan had jam kredit (22 / 10).
3. **Urus akaun > Tambah akaun**, cipta tiga akaun ujian dan catat kata laluan sementara setiap satu:
   - `UJI01` Guru Ujian Satu, peranan **Guru**
   - `UJI02` Guru Ujian Dua, peranan **Guru**, status **Dalam percubaan**
   - `UJI03` Pentadbir Ujian, peranan **Pentadbir**

### C2. Guru (inkognito, UJI01)
1. Log masuk, setuju privasi, tukar kata laluan.
2. **Profil saya**: sunting maklumat teras, isi nombor telefon. **Jangkaan:** nombor dipaparkan bertutup (`012-***-**78`).
3. Tambah kelayakan, opsyen subjek, satu kursus, kemas kini cerapan.
4. **Kurikulum**: **Tambah slot** jadual (hari, masa, subjek, kelas). Cuba tambah slot kedua pada masa bertindih. **Jangkaan:** amaran merah.
5. **Kokurikulum**: tambah unit (contoh KASPA, Penasihat), pilih rumah sukan, tambah satu pertandingan.
6. **HEM**: tambah kumpulan usrah pelajar dan peranan Guru Tarbiah.
7. Cuba buka `dashboard.html` atau `akaun.html` pada alamat laman. **Jangkaan:** dihantar balik ke Laman utama.
8. Tutup tab dan buka semula laman. **Jangkaan:** masih log masuk.

### C3. Pentadbir (inkognito lain, UJI03)
1. **Import tugasan > Muat turun templat**. Buka dalam Excel, tukar `SM216` kepada `UJI01`, salin semua sel, tampal, **Semak**, **Simpan**.
   **Jangkaan:** UJI01 kini 9.5 berjadual dan 6 tidak berjadual. Guru UJI01 nampak tugasan tetapi tidak boleh menyuntingnya.
2. **Senarai guru**: buka profil UJI01. **Jangkaan:** nombor telefon penuh dipaparkan (dan direkod dalam tab `audit_log`).
3. **Urus HEM > Kumpulan baharu**: murabbi UJI03 (diri anda), ahli UJI01 dan UJI02.
4. **HEM > Kumpulan yang saya bimbing > Rekod kehadiran > Sesi baharu**: tandakan UJI02 tidak hadir.
   Di tetingkap UJI01: **HEM** memaparkan peratus hadir.
5. **Urus kokurikulum**: tambah satu kelab, rekod keputusan juara rumah sukan.
6. **Cari guru ganti**: pilih hari dan waktu slot UJI01. **Jangkaan:** UJI01 tidak tersenarai.
7. **Dashboard sekolah**: cuba setiap penapis, carta, susun jadual, **Eksport CSV** dan buka dalam Excel.
8. Profil UJI02: tukar tarikh lantikan kepada lebih 6 bulan lalu (status Dalam percubaan). **Jangkaan:** Laman utama pentadbir memaparkan "Perlu tindakan"; tekan **Sahkan sebagai guru tetap**.

### C4. Keselamatan asas
1. Log masuk sebagai UJI01 dengan kata laluan salah 8 kali. **Jangkaan:** "Terlalu banyak percubaan". Pentadbir boleh **Buka kunci** di Urus akaun.
2. Superadmin **Nyahaktif** UJI02. **Jangkaan:** UJI02 tidak boleh log masuk; rekod masih ada di Sheet.
3. Buka Sheet: tab `akaun` tiada kata laluan sebenar (hanya `v1$1000$...`). Tab `audit_log` merekod tindakan.

---

## Bahagian D: Apa yang perlu dicatat dan dihantar kepada saya

Untuk setiap masalah, catat:
1. Langkah mana (contoh "C2.4").
2. Apa yang anda buat, dan apa yang anda jangka.
3. Apa yang berlaku, dengan **gambar skrin** dan teks mesej ralat.
4. Jika ralat di Apps Script: **Executions** (ikon senarai di kiri editor) > klik baris yang gagal > salin mesej.

Juga catat masa:
- Log masuk: ____ saat
- Membuka Profil: ____ saat
- Membuka Dashboard: ____ saat

Selepas ujian, beritahu saya hasilnya dan kita teruskan Fasa 7.
