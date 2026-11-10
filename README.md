# Profil Guru SMIAAG

Sistem profil guru untuk Sekolah Menengah Islam Al-Amin Gombak. Menyimpan maklumat guru dalam tiga bahagian (kurikulum, kokurikulum, HEM), dan memberi pentadbir gambaran beban kerja seluruh sekolah.

**Status: Fasa 6 (Dashboard) siap + penambahbaikan pemilik (08/11/2026) siap.** Log masuk, urus akaun, profil guru, kurikulum (tugasan, jam kredit, jadual, pertindihan, guru ganti, import jadual aSc dan import tugasan), kokurikulum (unit, rumah sukan, juara, pertandingan) HEM (usrah pelajar, usrah guru dan kehadiran, Guru Tarbiah, Guru Kelas, disiplin) dan dashboard sekolah sudah berfungsi. Fasa akhir: pengukuhan keselamatan dan dokumen migrasi Supabase (lihat [Fasa pembinaan](#fasa-pembinaan)).

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
  Dashboard.gs        ringkasan seluruh sekolah untuk pentadbir
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
  guru-ganti.html     guru tidak hadir, pilih pengganti, hebahan WhatsApp (pentadbir)
  slot-kosong.html    carian guru lapang ikut waktu (pentadbir)
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
  dashboard.html      dashboard sekolah (pentadbir): penapis, carta, jadual, eksport CSV
  vendor/             Chart.js 4.4.1 (MIT), dihos sendiri
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
   - `BOOTSTRAP_GURU_KOD` = ID akaun pentadbiran sistem, contoh `ADMIN01`
   - `BOOTSTRAP_NAMA` = contoh `Pentadbir Sistem`

   Akaun ini ialah **akaun sistem** (bukan guru): tidak dikira dalam senarai guru, dashboard dan guru ganti. Cipta akaun guru anda sendiri (contoh SM216, peranan Pentadbir) melalui Urus akaun selepas log masuk.
2. Kembali ke Editor, pilih fungsi `ciptaSuperadminPertama`, tekan **Run**.
3. Execution log memaparkan kata laluan sementara. Catat. Dua property tadi dipadam automatik.
4. Fungsi ini menolak jika superadmin sudah wujud, jadi ia tidak boleh disalah guna kemudian.
5. Akaun guru lain dicipta melalui halaman **Urus akaun** selepas anda log masuk.

### C3. Tetapan pilihan (Script Properties)

| Property | Kegunaan |
|---|---|
| `LAMAN_URL` | Alamat laman sistem (contoh `https://nama.netlify.app`). Dimasukkan dalam emel kata laluan sementara. |
| `EMEL_BALAS` | Alamat emel untuk balasan guru (contoh emel admin sekolah). |

Emel kata laluan sementara dihantar daripada akaun Google yang men-deploy Web App ("Execute as: Me"). Untuk menghantar daripada emel admin baharu, salin projek Apps Script ke akaun itu dan deploy semula dari sana. Had harian: akaun Gmail biasa kira-kira 100 emel, Google Workspace kira-kira 1500 (semak dengan Google untuk akaun anda).

### C3b. Log masuk sekali ke e-Cuti

Menu **e-Cuti** membuka sistem e-Cuti (projek Apps Script dan Sheet berasingan, repo `WeBake/e-Cuti-SMIAAG`) dalam
tab baru tanpa log masuk semula:

- `setupTemplate` menjana `ECUTI_SSO_SECRET` dalam Script Properties. **Salin nilai yang sama** ke Script Properties
  projek e-Cuti (nama `ECUTI_SSO_SECRET`). Jangan kongsi nilai ini di tempat lain.
- Alamat e-Cuti dalam `frontend/js/config.js` (`ECUTI_URL`).
- Guru mesti ada **emel yang sama** dalam Profil Guru dan dalam tab `Users` e-Cuti. Peranan e-Cuti (ADMIN/GURU/STAF)
  kekal ditentukan oleh e-Cuti.
- Tiket sah 60 saat, sekali guna, ditandatangani HMAC-SHA256. Butiran: `backend/Ecuti.gs`.

### C4. Cache dan suntingan terus dalam Sheet

`setupTemplate` memasang pencetus `panaskanCache` (setiap jam) supaya sistem jarang perlu membaca Sheet.
Perubahan melalui sistem kelihatan serta-merta. Jika anda menyunting Sheet **secara terus**, jalankan
`segarkanCache` dalam editor Apps Script supaya perubahan kelihatan serta-merta (jika tidak, maksimum ~1 jam).

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

Selepas mengubah apa-apa dalam `backend/`, jalankan `npm run bundle`, `npm run skema-md` dan `npm run sql` untuk mengemas kini `dist/Code.gs`, `docs/SKEMA.md` dan `docs/supabase/schema.sql`. Ujian akan gagal jika terlupa.

## Peraturan keselamatan (ringkasan)

Butiran penuh dalam dokumen arahan projek, Seksyen 3. Yang sudah berkuat kuasa pada Fasa 0:

- Sheet tidak dikongsi dan tidak diterbitkan ke web.
- Hanya `LOGIN` boleh dipanggil tanpa token. Setiap aksi lain menyemak token, tempoh luput, status akaun dan peranan di server. Senarai aksi dan peranan dalam `backend/Api.gs`.
- Kata laluan: SHA-256 dengan salt unik setiap guru dan pepper, diulang 1000 kali. Tiada plaintext disimpan.
- Sesi: token rawak disimpan dalam tab `sessions`, kekal 30 hari dan dilanjutkan bila guru aktif. Log keluar memadam token di server. Tukar kata laluan melog keluar peranti lain.
- Maksimum 8 percubaan gagal setiap 5 minit bagi setiap ID guru. Pentadbir boleh buka kunci.
- Guru baharu wajib bersetuju dengan notis privasi dan tukar kata laluan sementara sebelum boleh buat apa-apa lagi.
- Tindakan penting (log masuk, gagal log masuk, urus akaun, persetujuan PDPA, guru ganti) direkod dalam `audit_log`, ditulis tanpa membaca seluruh tab.
- Kelajuan: cache sesi dan data rujukan dalam CacheService, dibatalkan serta-merta semasa log keluar, reset, nyahaktif, tukar peranan atau sebarang tulisan. Log `[MASA]` dalam Apps Script > Executions menunjukkan masa dan bilangan bacaan tab setiap permintaan.
- Profil: guru hanya boleh membaca dan mengubah rekod sendiri (disemak di server). Nombor telefon dihantar bertutup kepada guru; pentadbir menerima nombor penuh dan setiap bacaan direkod.
- Tiada gambar guru disimpan (dibuang atas permintaan pemilik), jadi sistem tidak memerlukan akses Google Drive.
- Semua penulisan melalui `Repository.gs`: sahkan jenis, julat, nilai rujukan dan kunci asing, tambah awalan `'` pada nilai berbahaya (`= + - @`), dan buang nombor yang menyerupai IC daripada teks bebas.
- Gaji dan IC tidak mempunyai lajur langsung (ada ujian yang menjaganya).
- `PEPPER` dijana secara rawak dan disimpan dalam Script Properties sahaja.
- Nilai rujukan yang dinyahaktif (contoh `kontrak`) ditolak untuk rekod baharu.
- Header keselamatan dan Content-Security-Policy dalam `frontend/_headers` (ikut dimuat naik bersama folder `frontend`).
- Kecemasan: fungsi `logKeluarSemua` (editor Apps Script) membatalkan semua sesi. Lihat `docs/PELAN-KEBOCORAN-DATA.md`.
- Audit penuh: [`docs/AUDIT-KESELAMATAN.md`](docs/AUDIT-KESELAMATAN.md).

## PDPA dan lokasi data

Google (Sheets dan Apps Script) dan, pada masa depan, Supabase **mungkin menyimpan data di luar Malaysia**. Pemilik projek perlu mempertimbangkan perkara ini dan memaklumkan guru dalam notis privasi. Notis privasi dan persetujuan sudah ada (Fasa 1). Fasa 7:
- Guru memuat turun salinan data sendiri (Profil > Muat turun data saya).
- Data disimpan 2 tahun selepas akaun dinyahaktif; superadmin menyemak dan memadam di Urus akaun > Tempoh simpanan data. Rekod dikongsi dengan guru lain kekal dengan nama "Guru dipadam".
- `audit_log` melebihi 2 tahun dibuang oleh pencetus harian `penyelenggaraanHarian` (dipasang oleh `setupTemplate`).
- Pelan kebocoran data: [`docs/PELAN-KEBOCORAN-DATA.md`](docs/PELAN-KEBOCORAN-DATA.md).

## Fasa pembinaan

| Fasa | Kandungan | Status |
|---|---|---|
| 0 | Asas: struktur, template Sheets, repository, README, reka bentuk UI | Siap |
| 1 | Auth: login, hash, session, had percubaan, tukar kata laluan, urus akaun, notis privasi | Siap |
| 2 | Profil teras: guru, kelayakan, opsyen, kursus, cerapan, telefon bertutup, tempoh percubaan | Siap |
| 3 | Kurikulum: subjek, kelas, tugasan, jadual, jam kredit, pertindihan, slot kosong, import aSc dan tugasan | Siap (format aSc sebenar akan disemak) |
| 4 | Kokurikulum: unit Syabab dan kelab, rumah sukan, juara, pertandingan | Siap |
| 5 | HEM: usrah pelajar, usrah guru dan kehadiran, Guru Tarbiah, Guru Kelas, disiplin | Siap |
| 6 | Dashboard: penapis, kad, carta, jadual, cerapan, kokurikulum, HEM, eksport CSV | Siap |
| 7 | Audit keselamatan, PDPA (eksport, padam, simpanan 2 tahun), pelan kebocoran, `MIGRASI-SUPABASE.md` + SQL | **Siap** (menunggu ujian pemilik) |

Lihat juga: [`docs/SERAH-TUGAS.md`](docs/SERAH-TUGAS.md) (status terkini dan kerja seterusnya), [`docs/MIGRASI-SUPABASE.md`](docs/MIGRASI-SUPABASE.md), [`docs/SENARAI-SEMAK-FASA-7.md`](docs/SENARAI-SEMAK-FASA-7.md), [`docs/PANDUAN-UJIAN.md`](docs/PANDUAN-UJIAN.md) (langkah demi langkah untuk menguji), [`docs/SKEMA.md`](docs/SKEMA.md), [`docs/SENARAI-SEMAK-FASA-0.md`](docs/SENARAI-SEMAK-FASA-0.md), [`docs/SENARAI-SEMAK-FASA-1.md`](docs/SENARAI-SEMAK-FASA-1.md), [`docs/SENARAI-SEMAK-FASA-2.md`](docs/SENARAI-SEMAK-FASA-2.md), [`docs/SENARAI-SEMAK-FASA-3.md`](docs/SENARAI-SEMAK-FASA-3.md), [`docs/SENARAI-SEMAK-FASA-4.md`](docs/SENARAI-SEMAK-FASA-4.md), [`docs/SENARAI-SEMAK-FASA-5.md`](docs/SENARAI-SEMAK-FASA-5.md), [`docs/SENARAI-SEMAK-FASA-6.md`](docs/SENARAI-SEMAK-FASA-6.md), [`docs/KEPUTUSAN.md`](docs/KEPUTUSAN.md).
