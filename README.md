# Profil Guru SMIAAG

Sistem profil guru untuk Sekolah Menengah Islam Al-Amin Gombak. Menyimpan maklumat guru dalam tiga bahagian (kurikulum, kokurikulum, HEM), dan memberi pentadbir gambaran beban kerja seluruh sekolah.

**Status: Fasa 5 (HEM) siap.** Log masuk, urus akaun, profil guru, kurikulum (tugasan, jam kredit, jadual, pertindihan, guru ganti, import jadual aSc dan import tugasan), kokurikulum (unit, rumah sukan, juara, pertandingan) dan HEM (usrah pelajar, usrah guru dan kehadiran, Guru Tarbiah, Guru Kelas, disiplin) sudah berfungsi. Dashboard sekolah dibina pada fasa seterusnya (lihat [Fasa pembinaan](#fasa-pembinaan)).

## Bagaimana ia berfungsi (ringkas)

```
Pelayar guru  ──►  Apps Script Web App  ──►  Google Sheets
(frontend/)         (backend/)                (pangkalan data, tidak dikongsi)
GitHub Pages        semak token & peranan      hanya pemilik boleh buka
atau Netlify        di sini, bukan di pelayar
```

- **Frontend** ialah HTML, CSS dan JavaScript biasa. Kodnya awam, jadi tiada rahsia di dalamnya.
- **Backend** ialah Google Apps Script. Semua baca dan tulis data melalui satu pintu (`doPost`). Peranan dan pemilikan data disemak di sini.
- **Database** ialah Google Sheets. Sheet **tidak** dikongsi dengan sesiapa dan **tidak** diterbitkan ke web. Semua akses melalui Apps Script.
- Data direka seperti database relasi supaya boleh dipindah ke Supabase kemudian tanpa reka semula.

## Struktur folder

```
backend/            Kod Apps Script (satu fail per kawasan)
  Config.gs           pemalar, akses Spreadsheet
  Util.gs             pembantu: UUID, tarikh, sanitasi formula, buang IC
  Schema.gs           definisi semua jadual (sumber kebenaran)
  Repository.gs       SATU-SATUNYA kod yang menyentuh Sheets
  Setup.gs            setupTemplate(): bina semua tab dan nilai asal
  Auth.gs             log masuk, hash kata laluan, sesi, had percubaan, PDPA
  Akaun.gs            urus akaun (superadmin), cipta superadmin pertama
  Guru.gs             profil guru, telefon bertutup, cerapan, tempoh percubaan, subjek
  Kurikulum.gs        jam kredit, jadual, pertindihan, slot kosong, kelas, waktu
  Import.gs           import jadual (aSc) dan tugasan oleh pentadbir
  Kokurikulum.gs      unit, rumah sukan, juara rumah sukan, pertandingan
  Hem.gs              usrah pelajar, peranan HEM, usrah guru, sesi dan kehadiran
  Api.gs              pintu masuk doPost + SENARAI SEMUA AKSI dan peranan
  appsscript.json     tetapan projek Apps Script
frontend/           Laman web (diterbitkan)
  index.html          log masuk
  privasi.html        notis privasi (log masuk pertama)
  tukar-password.html tukar kata laluan
  utama.html          laman utama selepas log masuk
  akaun.html          urus akaun (pentadbir, superadmin)
  profil.html         profil guru (sendiri, atau ?id= untuk pentadbir)
  guru.html           senarai guru (pentadbir)
  kurikulum.html      tugasan, jam kredit dan jadual waktu
  slot-kosong.html    cari guru ganti (pentadbir)
  import-jadual.html  import jadual daripada eksport XML aSc Timetables (pentadbir)
  import-tugasan.html import tugasan daripada Excel/CSV (pentadbir)
  koku.html           kokurikulum guru
  koku-urus.html      urus kokurikulum (pentadbir)
  hem.html            HEM guru
  usrah-sesi.html     sesi dan kehadiran usrah guru (murabbi rekod; ahli lihat sendiri)
  hem-urus.html       urus HEM (pentadbir)
  js/asc.js, js/tugasan-import.js   pembaca fail import (diuji di Node)
  contoh/asc-contoh.xml             fail aSc contoh (data palsu)
  rujukan.html        data rujukan: subjek, kelas, waktu, had jam kredit (superadmin)
  pratonton.html      pratonton reka bentuk dashboard (data contoh)
  css/ js/ assets/
dist/Code.gs        gabungan semua fail backend dalam satu fail (untuk salin-tampal)
docs/               SKEMA.md (dijana), senarai semak, catatan keputusan
scripts/            skrip bundle, jana dokumentasi, pelayan dev
tests/              ujian automatik (Node)
```

## Setup dari kosong

Masa: kira-kira 15 minit. Anda perlukan akaun Google sekolah atau peribadi yang akan memiliki data.

### A. Sediakan Google Sheet dan Apps Script

1. Buka <https://sheets.new> untuk cipta Sheet kosong. Namakan contohnya `SMIAAG Profil Guru (DATA)`.
2. **Jangan kongsi Sheet ini** dan **jangan** guna *File > Share > Publish to web*.
3. Dalam Sheet, klik **Extensions > Apps Script**.
4. Dalam editor, klik ikon roda gigi (**Project Settings**), tandakan **Show "appsscript.json" manifest file in editor**.
5. Kembali ke **Editor**:
   - Buka `appsscript.json`, padam isinya, tampal isi `backend/appsscript.json`.
   - Buka `Code.gs`, padam isinya, tampal **seluruh** isi `dist/Code.gs`.
6. Tekan **Save**.

### B. Bina pangkalan data

1. Pilih fungsi `setupTemplate` pada menu fungsi di atas, tekan **Run**.
2. Benarkan kebenaran yang diminta. Ia hanya meminta akses kepada Sheet ini. (Jika Google tunjuk amaran "unverified app", klik *Advanced* > *Go to ... (unsafe)*. Skrip ini milik anda sendiri.)
3. Lihat **Execution log**. Anda patut nampak senarai tab dicipta.
4. Pergi ke Sheet: semua tab (`guru`, `akaun`, `subjek`, `ref_*` dan seterusnya) sudah ada dengan tajuk lajur berwarna biru. Tab `ref_*` berwarna hijau dan sudah berisi nilai asal.
5. Boleh jalankan `setupTemplate` lagi bila-bila masa. Ia tidak memadam atau menggandakan apa-apa. Fungsi `verifySetup` menyemak sahaja.

### C. Deploy sebagai Web App

1. Klik **Deploy > New deployment**, jenis **Web app**.
2. *Execute as*: **Me**. *Who has access*: **Anyone**.
   (Ini perlu supaya frontend boleh memanggilnya. Ia selamat kerana setiap aksi selain LOGIN memerlukan token yang sah.)
3. Klik **Deploy**, salin **Web app URL** (berakhir dengan `/exec`).
4. Bila anda mengubah kod kemudian: **Deploy > Manage deployments > edit (pensel) > Version: New version > Deploy**. URL kekal sama.

### C2. Cipta superadmin pertama (sekali sahaja)

1. Dalam Apps Script: **Project Settings > Script Properties > Add script property**:
   - `BOOTSTRAP_GURU_KOD` = ID guru anda, contoh `SM216`
   - `BOOTSTRAP_NAMA` = nama penuh anda
2. Kembali ke Editor, pilih fungsi `ciptaSuperadminPertama`, tekan **Run**.
3. Execution log memaparkan kata laluan sementara. Catat. Dua property tadi dipadam automatik.
4. Fungsi ini menolak jika superadmin sudah wujud, jadi ia tidak boleh disalah guna kemudian.
5. Akaun guru lain dicipta melalui halaman **Urus akaun** selepas anda log masuk.

### D. Hubungkan frontend

1. Buka `frontend/js/config.js`, isi `API_URL` dengan URL tadi.
   URL ini bukan rahsia. Yang rahsia hanyalah isi Sheet dan `PEPPER` (dalam Script Properties), dan kedua-duanya tidak berada dalam repo.
2. Terbitkan folder `frontend/`:
   - **Netlify**: *Add new site > Import from Git*, pilih repo ini. Tetapan dalam `netlify.toml` sudah betul (publish = `frontend`).
   - **GitHub Pages**: *Settings > Pages > Source: GitHub Actions*, kemudian jalankan workflow *Terbit frontend*.
3. Buka laman dan log masuk dengan akaun superadmin. Anda akan dibawa ke notis privasi, kemudian diminta menetapkan kata laluan sendiri.

### Cuba di komputer sendiri tanpa Google (pilihan)

```bash
npm run dev
```

Buka <http://localhost:8080>. Backend sebenar dijalankan atas data palsu dalam memori. Akaun contoh dan kata laluan sementara dipaparkan di terminal. Data hilang bila ditutup.

Untuk demo dengan akaun yang sudah siap dan data contoh: `DEMO_PASSWORD=demo1234 npm run dev` (akaun SA001, AD901, SM901 guna kata laluan itu; SM902 akaun baharu).

### Menjalankan ujian automatik

Perlu Node 20 ke atas. Tiada pemasangan pakej diperlukan.

```bash
npm test
```

Selepas mengubah apa-apa dalam `backend/`, jalankan `npm run bundle` dan `npm run skema-md` untuk mengemas kini `dist/Code.gs` dan `docs/SKEMA.md`. Ujian akan gagal jika terlupa.

## Peraturan keselamatan (ringkasan)

Butiran penuh dalam dokumen arahan projek, Seksyen 3. Yang sudah berkuat kuasa pada Fasa 0:

- Sheet tidak dikongsi dan tidak diterbitkan ke web.
- Hanya `LOGIN` boleh dipanggil tanpa token. Setiap aksi lain menyemak token, tempoh luput, status akaun dan peranan di server. Senarai aksi dan peranan dalam `backend/Api.gs`.
- Kata laluan: SHA-256 dengan salt unik setiap guru dan pepper, diulang 1000 kali. Tiada plaintext disimpan.
- Sesi: token rawak disimpan dalam tab `sessions`, kekal 30 hari dan dilanjutkan bila guru aktif. Log keluar memadam token di server. Tukar kata laluan melog keluar peranti lain.
- Maksimum 8 percubaan gagal setiap 5 minit bagi setiap ID guru. Pentadbir boleh buka kunci.
- Guru baharu wajib bersetuju dengan notis privasi dan tukar kata laluan sementara sebelum boleh buat apa-apa lagi.
- Tindakan penting (log masuk, gagal log masuk, urus akaun, persetujuan PDPA) direkod dalam `audit_log`.
- Profil: guru hanya boleh membaca dan mengubah rekod sendiri (disemak di server). Nombor telefon dihantar bertutup kepada guru; pentadbir menerima nombor penuh dan setiap bacaan direkod.
- Tiada gambar guru disimpan (dibuang atas permintaan pemilik), jadi sistem tidak memerlukan akses Google Drive.
- Semua penulisan melalui `Repository.gs`: sahkan jenis, julat, nilai rujukan dan kunci asing, tambah awalan `'` pada nilai berbahaya (`= + - @`), dan buang nombor yang menyerupai IC daripada teks bebas.
- Gaji dan IC tidak mempunyai lajur langsung (ada ujian yang menjaganya).
- `PEPPER` dijana secara rawak dan disimpan dalam Script Properties sahaja.

## PDPA dan lokasi data

Google (Sheets dan Apps Script) dan, pada masa depan, Supabase **mungkin menyimpan data di luar Malaysia**. Pemilik projek perlu mempertimbangkan perkara ini dan memaklumkan guru dalam notis privasi. Notis privasi dan persetujuan sudah ada (Fasa 1). Eksport dan padam data seorang guru, tempoh simpanan dan senarai semak kebocoran dibina pada Fasa 7.

## Fasa pembinaan

| Fasa | Kandungan | Status |
|---|---|---|
| 0 | Asas: struktur, template Sheets, repository, README, reka bentuk UI | Siap |
| 1 | Auth: login, hash, session, had percubaan, tukar kata laluan, urus akaun, notis privasi | Siap |
| 2 | Profil teras: guru, kelayakan, opsyen, kursus, cerapan, telefon bertutup, tempoh percubaan | Siap |
| 3 | Kurikulum: subjek, kelas, tugasan, jadual, jam kredit, pertindihan, slot kosong, import aSc dan tugasan | Siap (format aSc sebenar akan disemak) |
| 4 | Kokurikulum: unit Syabab dan kelab, rumah sukan, juara, pertandingan | Siap |
| 5 | HEM: usrah pelajar, usrah guru dan kehadiran, Guru Tarbiah, Guru Kelas, disiplin | **Siap** |
| 6 | Dashboard | Seterusnya |
| 7 | Pengukuhan, audit keselamatan, `MIGRASI-SUPABASE.md` | |

Lihat juga: [`docs/SKEMA.md`](docs/SKEMA.md), [`docs/SENARAI-SEMAK-FASA-0.md`](docs/SENARAI-SEMAK-FASA-0.md), [`docs/SENARAI-SEMAK-FASA-1.md`](docs/SENARAI-SEMAK-FASA-1.md), [`docs/SENARAI-SEMAK-FASA-2.md`](docs/SENARAI-SEMAK-FASA-2.md), [`docs/SENARAI-SEMAK-FASA-3.md`](docs/SENARAI-SEMAK-FASA-3.md), [`docs/SENARAI-SEMAK-FASA-4.md`](docs/SENARAI-SEMAK-FASA-4.md), [`docs/SENARAI-SEMAK-FASA-5.md`](docs/SENARAI-SEMAK-FASA-5.md), [`docs/KEPUTUSAN.md`](docs/KEPUTUSAN.md).
