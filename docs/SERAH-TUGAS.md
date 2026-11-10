# Serah tugas: status projek dan kerja seterusnya

> Dokumen ini ialah titik mula untuk sesi seterusnya. Baca keseluruhannya sebelum menulis kod.
> Dikemas kini: 08/11/2026. Branch: `claude/dreamy-einstein-9ucbl7` (repo `WMT-Labs/smiaag-teacher-profile`).
> Ujian automatik: **150 lulus, 0 gagal** (`npm test`). Semak `git log` untuk commit terkini.

---

## 1. Di mana kita berhenti

- **Fasa 0 hingga 6 siap** dan diuji pemilik. **12 item penambahbaikan + kelajuan siap** (pemilik ukur 2–3 s setiap halaman).
- **Fasa 7 SIAP (09/11/2026), menunggu ujian pemilik** mengikut `docs/SENARAI-SEMAK-FASA-7.md`:
  - Audit keselamatan: `docs/AUDIT-KESELAMATAN.md` (3 jurang dibaiki: header/CSP dalam `frontend/_headers`,
    nilai ref tidak aktif ditolak, `logKeluarSemua()`); ujian sapuan semua aksi `tests/keselamatan.test.js`.
  - PDPA (`backend/Pdpa.gs`): `PDPA_EKSPORT` (guru sendiri / superadmin), `PDPA_SENARAI_TAMAT`, `PDPA_PADAM`
    (nyahnama rekod guru, padam data milik, kekalkan rekod dikongsi); `guru.dinyahaktif_pada`; simpanan 2 tahun
    (padam manual oleh superadmin); pencetus harian `penyelenggaraanHarian` (sesi tamat + audit_log > 2 tahun).
  - `docs/PELAN-KEBOCORAN-DATA.md`, `docs/MIGRASI-SUPABASE.md`, `docs/supabase/schema.sql` (dijana `npm run sql`,
    diuji pada PostgreSQL tempatan dengan `docs/supabase/ujian-rls.sql`).
- **Integrasi e-Cuti (SSO, pilihan A): BERFUNGSI dalam pratonton (10/11/2026).** Pemilik sahkan menu e-Cuti terus masuk
  tanpa log masuk (Profil Guru Pages -> e-Cuti Pages, server e-Cuti v2.2 melalui deployment Apps Script BAHARU dalam
  variable `GAS_URL`). Belum dibuat (langkah akhir): kemas kini deployment UTAMA Apps Script e-Cuti, pulihkan laman
  Netlify `ecutismiaag` (memaparkan "Site not found", punca belum disahkan; kredit habis), hidupkan builds Netlify,
  jadikan repo e-Cuti private semula. Soalan terbuka: tutup laluan awam `PUBLIC_GHOST` e-Cuti?
  - Profil Guru: `backend/Ecuti.gs` (`ECUTI_TIKET`), menu e-Cuti; sudah di-deploy pemilik (menu buka tab baru).
  - e-Cuti (repo `WeBake/e-Cuti-SMIAAG`): PR #3 `SSO_LOGIN` + `#sso=` dalam index.html v2.2; PR #2 workflow pratonton
    GitHub Pages (variable `GAS_URL` untuk deployment Apps Script pratonton). Ujian silang Ecuti.gs -> Code.gs lulus.
  - Netlify e-Cuti: kredit hampir habis (deploy `main@5c55440` gagal); pemilik akan guna GitHub Pages untuk pratonton,
    hentikan builds Netlify, dan hidupkan semula di hujung kerja. Repo e-Cuti akan dijadikan public sementara.
  - Pratonton Profil Guru: GitHub Pages `wmt-labs.github.io/smiaag-teacher-profile` (variable `API_URL`, `ECUTI_URL`).
- **Pelan seterusnya:** `docs/PELAN-PENAMBAHBAIKAN-2.md` (item A–C ikut peringkat; menunggu persetujuan pemilik). PR e-Cuti #4
  (tutup laluan awam PUBLIC_GHOST) menunggu merge.
- Selepas pemilik sahkan Fasa 7: semua fasa dalam dokumen arahan selesai. Kerja seterusnya ikut permintaan pemilik
  (contoh cache pelayar untuk kelajuan, fail aSc sebenar, migrasi Supabase).

---

## 2. Cara bekerja dengan pemilik (wajib dipatuhi)

- Pemilik: guru sekolah menengah, bukan jurutera perisian. Bahasa: **Bahasa Melayu Malaysia santai**,
  istilah teknikal kekal Inggeris. Jawapan terus dahulu, kemudian sebab. Tiada emoji, tiada hype.
  Terangkan keputusan teknikal dalam ayat biasa. Nyatakan andaian; tanya jika jawapan mengubah reka bentuk.
- Arahan asal projek: dokumen arahan yang dimuat naik pemilik (ringkasannya dalam README dan
  `docs/KEPUTUSAN.md`). Peraturan keselamatan Seksyen 3 **tidak boleh dilonggarkan**.
- Berhenti di hujung setiap fasa: ringkaskan, cara uji, tunggu pengesahan.
- Selepas setiap kerja: `npm test`, uji di pelayar (Playwright + pelayan dev), hantar tangkapan skrin,
  commit dengan mesej jelas, push ke branch di atas. Jangan buat PR melainkan diminta.
- **Jangan masukkan data guru sebenar ke repo** (contoh PDF jadual sekolah, eksport aSc sebenar). Data
  demo mesti jelas palsu ("Guru Contoh Satu").
- Jangan kongsi atau minta nilai `PEPPER`/Script Properties.

---

## 3. Ringkasan sistem yang sudah ada

### Seni bina
- **Frontend** `frontend/`: HTML/CSS/JS biasa, tiada framework. Diterbitkan pemilik melalui Netlify Drop.
  `js/config.js` mengandungi `API_URL` (URL Web App `/exec`, bukan rahsia).
- **Backend** `backend/*.gs`: Google Apps Script Web App. Satu pintu `doPost` (`Api.gs`).
  **Senarai semua aksi dan peranan dalam `getActions()` di `Api.gs`.** Hanya `LOGIN` awam.
- **Database**: Google Sheets, satu tab = satu jadual. Skema dalam `backend/Schema.gs` (sumber kebenaran),
  dokumentasi dijana ke `docs/SKEMA.md`. 47 tab (16 `ref_*` + 31 data) + tab paparan `lihat_akaun` (formula, baca sahaja).
- **Repository** `backend/Repository.gs` ialah SATU-SATUNYA kod yang menyentuh Sheets:
  `getById, query, insert, update, remove, insertMany, removeWhere, replaceWhere`.
  Mengesahkan jenis, julat, enum `ref_*`, kunci asing, unik; sanitasi formula injection; buang nombor IC.
  `replaceWhere` = ganti pukal selamat (sahkan semua dahulu; gagal = data lama kekal).
- `dist/Code.gs` = gabungan semua `.gs` untuk ditampal pemilik ke Apps Script (`npm run bundle`).
  **Ujian gagal jika `dist/Code.gs` atau `docs/SKEMA.md` tidak dijana semula.**

### Fail backend
| Fail | Isi |
|---|---|
| Config.gs | pemalar, `getSpreadsheet()`, `MAX_REQUEST_CHARS` |
| Util.gs | AppError, UUID, tarikh ISO, sanitasi, `stripIdentityNumbers`, `pStr/pUuid/...`, telefon, `logAudit` |
| Schema.gs | semua jadual + `REF_SEEDS` |
| Repository.gs | lapisan data |
| Setup.gs | `setupTemplate()` (selamat diulang; selaraskan `ref_*`), `verifySetup()` |
| Auth.gs | hash SHA-256 + salt + pepper x1000, sesi 30 hari bergerak, had 8 cubaan/5 min, PDPA, tukar kata laluan |
| Akaun.gs | urus akaun (superadmin), `ciptaSuperadminPertama()` |
| Guru.gs | profil, telefon bertutup, `_sasaranGuru` (semakan pemilikan), rekod anak, cerapan, percubaan 6 bulan, subjek |
| Kurikulum.gs | jam kredit, jadual + kelas gabungan, pertindihan, slot kosong, kelas/waktu/had |
| Import.gs | import jadual aSc dan tugasan (pentadbir) |
| Kokurikulum.gs | unit, rumah sukan, juara, pertandingan |
| Hem.gs | usrah pelajar, peranan HEM, usrah guru, sesi dan kehadiran |
| Dashboard.gs | ringkasan seluruh sekolah, amaran percubaan/praktikal |
| Ganti.gs | guru tidak hadir ikut tarikh, calon pengganti, tetap/batal guru ganti (pentadbir) |

### Halaman frontend
`index` (log masuk), `privasi`, `tukar-password`, `utama`, `profil`, `kurikulum`, `koku`, `hem`, `usrah-sesi`,
`guru` (senarai, pentadbir), `guru-ganti` (relief + hebahan WhatsApp), `slot-kosong` (carian manual hari + waktu), `import-jadual`, `import-tugasan`,
`koku-urus`, `hem-urus`, `dashboard`, `akaun`, `rujukan` (superadmin).
Modul JS diuji di Node: `js/hebahan.js`, `js/asc.js`, `js/tugasan-import.js`, `js/dashboard-kira.js`.
Chart.js 4.4.1 dihos sendiri di `frontend/vendor/` (CDN disekat dalam persekitaran pembangunan).

### Peranan
- `guru`: data sendiri sahaja (disemak server).
- `pentadbir` (GK, PK, Pengetua): semua guru, dashboard, import, urus koku/HEM, buka kunci akaun.
- `superadmin`: semua + urus akaun + data rujukan.

### Alat pembangunan
- `npm test` (Node 20+, tiada pakej).
- `DEMO_PASSWORD=demo1234 PORT=8080 npm run dev`: backend sebenar atas Sheets palsu dalam memori + data demo
  (`scripts/demo-data.js`). Akaun SA001, AD901, SM901 (siap), SM902 (percubaan). Laporkan port dengan
  `report_preview_port`; proses latar terhad 2 jam.
- Ujian pelayar: Playwright (sudah dipasang), skrip dalam scratchpad sesi. Rangkaian: cdnjs disekat,
  registry npm dibenarkan.

### Keputusan pemilik setakat ini
Lihat `docs/KEPUTUSAN.md` (jadual "Keputusan pemilik" dan andaian setiap fasa). Yang paling penting:
cerapan ringkas (bilangan + pencerap, guru boleh isi sendiri); tiada gambar guru; status lantikan
Tetap/Percubaan/Praktikal/Lain-lain; percubaan 6 bulan + pengesahan pentadbir; tugasan diisi/diimport
pentadbir sahaja; guru boleh sunting jadual sendiri; jadual diimport dari eksport aSc (fail sebenar belum
diterima; format XML ditulis berdasarkan struktur aSc biasa); kehadiran usrah guru oleh murabbi sahaja,
mengikut sesi; sesi log masuk kekal 30 hari; tempoh simpanan data guru 2 tahun selepas dinyahaktif.

---

## 4. Penambahbaikan 08/11/2026 — SIAP

Butiran andaian dan nota teknikal: `docs/KEPUTUSAN.md` ("Penambahbaikan 08/11/2026").

| Item | Hasil |
|---|---|
| P0 kelajuan | cache sesi (CacheService, dibatalkan serta-merta bila akaun/guru ditulis atau log keluar), cache data rujukan 5 min, memo bacaan dalam satu permintaan, `audit_log` ditulis tanpa baca tab, dashboard ingat tahun yang dibuka, log `[MASA] AKSI ms bacaan=N` |
| Bar loading | bar di atas skrin untuk setiap panggilan API + label "Sedang memuatkan…" selepas 0.8 s; rangka (skeleton) kad |
| 1 | tarikh disimpan sebagai nilai tarikh Sheets, format `dd-mm-yyyy` / `dd-mm-yyyy, hh.mm` (24 jam), semua tab; `setupTemplate` tukar teks ISO lama |
| 2 | `guru.email` (unik, disemak dalam kod); kata laluan sementara diemel semasa cipta akaun dan reset (MailApp), tetap dipaparkan sekali sebagai sandaran; `PDPA_VERSI` 1.1 |
| 3 | UUID kekal; tab `lihat_akaun` (XLOOKUP) papar ID guru, nama, peranan, status |
| 4 | `senaraiTahun()` 10 tahun ke belakang + 10 ke hadapan, lalai tahun semasa |
| 5 | cetak jadual A4 landskap; warna subjek setiap guru (`warna_jadual`); pentadbir boleh cetak jadual guru lain |
| 6 | dropdown masa setiap 5 minit 7.30 pg–3.30 ptg + "Masa lain…"; paparan 12 jam |
| 7 | kotak berasingan setiap jenis unit di `koku-urus` dan `koku` |
| 8 | rumah sukan ditetapkan pentadbir sahaja (server + UI) |
| 9 | `UNIT_PUKAL` (satu nama setiap baris, langkau yang wujud) |
| 10–11 | `guru-ganti.html` + `Ganti.gs`: tarikh → guru tidak hadir → slot → calon (beban ganti bulan ini) → tetapkan; hebahan WhatsApp ikut templat pemilik + butang Salin |
| 12 | `guru.akaun_sistem`: ADMIN01 akaun sistem (tidak dikira guru di mana-mana); SM216 jadi Pentadbir |
| Praktikal | `tarikh_tamat_praktikal` + amaran 30 hari di dashboard/utama |

### Perkara yang masih terbuka
- **Fail eksport aSc sebenar** belum diterima; semak dan laraskan `frontend/js/asc.js` bila diterima.
- Emel admin sebenar (pemilik akan sediakan).
- Kelajuan: selepas P0 masih 6–10 s; selepas cache semua tab (09/11/2026) pemilik ukur **2–3 s setiap tukar halaman**.
  Pilihan seterusnya jika perlu: cache di pelayar (papar data lama serta-merta, kemas kini di belakang).

---

## 5. Urutan kerja seterusnya

1. Tunggu keputusan ujian Fasa 7 pemilik (`docs/SENARAI-SEMAK-FASA-7.md`). Baiki isu yang dilaporkan.
2. Pilihan yang sudah dibincang (tunggu keputusan pemilik): cache di pelayar (papar data terakhir serta-merta,
   kemas kini di belakang; padam semasa log keluar); laraskan `js/asc.js` bila fail aSc sebenar diterima;
   migrasi Supabase ikut `docs/MIGRASI-SUPABASE.md` (termasuk skrip eksport tarikh ISO dan penyesuai `js/api.js`).

Setiap perubahan skema: kemas kini `Schema.gs`, `npm run bundle`, `npm run skema-md`, `npm run sql`, ujian, senarai semak
yang menerangkan langkah kemas kini Sheet sedia ada (pemilik sudah ada Sheet ujian dengan data).
