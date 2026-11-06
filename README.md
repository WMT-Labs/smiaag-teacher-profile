# Profil Guru SMIAAG

Sistem profil guru untuk Sekolah Menengah Islam Al-Amin Gombak. Menyimpan maklumat guru dalam tiga bahagian (kurikulum, kokurikulum, HEM), dan memberi pentadbir gambaran beban kerja seluruh sekolah.

**Status: Fasa 0 (Asas) siap.** Struktur, pangkalan data Sheets, lapisan repository dan reka bentuk antara muka sudah ada. Log masuk, profil dan dashboard sebenar dibina pada fasa seterusnya (lihat [Fasa pembinaan](#fasa-pembinaan)).

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
  Auth.gs             kerangka pengesahan (Fasa 1)
  Api.gs              pintu masuk doPost
  appsscript.json     tetapan projek Apps Script
frontend/           Laman web (diterbitkan)
  index.html          log masuk
  pratonton.html      pratonton reka bentuk dashboard (data contoh)
  css/ js/ assets/
dist/Code.gs        gabungan semua fail backend dalam satu fail (untuk salin-tampal)
docs/               SKEMA.md (dijana), senarai semak, catatan keputusan
scripts/            skrip bundle dan jana dokumentasi
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

### D. Hubungkan frontend

1. Buka `frontend/js/config.js`, isi `API_URL` dengan URL tadi.
   URL ini bukan rahsia. Yang rahsia hanyalah isi Sheet dan `PEPPER` (dalam Script Properties), dan kedua-duanya tidak berada dalam repo.
2. Terbitkan folder `frontend/`:
   - **Netlify**: *Add new site > Import from Git*, pilih repo ini. Tetapan dalam `netlify.toml` sudah betul (publish = `frontend`).
   - **GitHub Pages**: *Settings > Pages > Source: GitHub Actions*, kemudian jalankan workflow *Terbit frontend*.
3. Buka laman, cuba log masuk. Pada Fasa 0 anda akan nampak mesej "Log masuk belum diaktifkan". Itu tanda frontend dan backend sudah bersambung.

### Menjalankan ujian automatik

Perlu Node 20 ke atas. Tiada pemasangan pakej diperlukan.

```bash
npm test
```

Selepas mengubah apa-apa dalam `backend/`, jalankan `npm run bundle` dan `npm run skema-md` untuk mengemas kini `dist/Code.gs` dan `docs/SKEMA.md`. Ujian akan gagal jika terlupa.

## Peraturan keselamatan (ringkasan)

Butiran penuh dalam dokumen arahan projek, Seksyen 3. Yang sudah berkuat kuasa pada Fasa 0:

- Sheet tidak dikongsi dan tidak diterbitkan ke web.
- Hanya `LOGIN` boleh dipanggil tanpa token. Pada Fasa 0, pengesahan sengaja menolak semua permintaan (gagal tutup), jadi tiada data boleh dibaca walaupun Web App sudah di-deploy.
- Semua penulisan melalui `Repository.gs`: sahkan jenis, julat, nilai rujukan dan kunci asing, tambah awalan `'` pada nilai berbahaya (`= + - @`), dan buang nombor yang menyerupai IC daripada teks bebas.
- Gaji dan IC tidak mempunyai lajur langsung (ada ujian yang menjaganya).
- `PEPPER` dijana secara rawak dan disimpan dalam Script Properties sahaja.

## PDPA dan lokasi data

Google (Sheets dan Apps Script) dan, pada masa depan, Supabase **mungkin menyimpan data di luar Malaysia**. Pemilik projek perlu mempertimbangkan perkara ini dan memaklumkan guru dalam notis privasi. Ciri PDPA lain (notis dan persetujuan, eksport dan padam data seorang guru, tempoh simpanan, senarai semak kebocoran) dibina pada Fasa 1 dan Fasa 7.

## Fasa pembinaan

| Fasa | Kandungan | Status |
|---|---|---|
| 0 | Asas: struktur, template Sheets, repository, README, reka bentuk UI | **Siap** |
| 1 | Auth: login, hash, session, had percubaan, tukar kata laluan, urus akaun, notis privasi | Seterusnya |
| 2 | Profil teras: guru, kelayakan, opsyen, kursus, cerapan, telefon bertutup, gambar | |
| 3 | Kurikulum: subjek, kelas, tugasan, jadual, jam kredit, pertindihan, slot kosong, import PDF | |
| 4 | Kokurikulum | |
| 5 | HEM | |
| 6 | Dashboard | |
| 7 | Pengukuhan, audit keselamatan, `MIGRASI-SUPABASE.md` | |

Lihat juga: [`docs/SKEMA.md`](docs/SKEMA.md), [`docs/SENARAI-SEMAK-FASA-0.md`](docs/SENARAI-SEMAK-FASA-0.md), [`docs/KEPUTUSAN.md`](docs/KEPUTUSAN.md).
