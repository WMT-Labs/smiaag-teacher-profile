# Serah tugas: status projek dan kerja seterusnya

> Dokumen ini ialah titik mula untuk sesi seterusnya. Baca keseluruhannya sebelum menulis kod.
> Dikemas kini: 08/11/2026. Branch: `claude/dreamy-einstein-9ucbl7` (repo `WMT-Labs/smiaag-teacher-profile`).
> Ujian automatik: **132 lulus, 0 gagal** (`npm test`). Semak `git log` untuk commit terkini.

---

## 1. Di mana kita berhenti

- **Fasa 0 hingga 6 siap** dan sudah diuji pemilik (Sheet + Apps Script + Netlify sebenar).
- **12 item penambahbaikan 08/11/2026 + P0 kelajuan + bar loading SIAP** (Seksyen 4). Pemilik sudah
  menjawab semua soalan terbuka; jawapan direkod dalam `docs/KEPUTUSAN.md`.
- **Langkah seterusnya:** pemilik kemas kini Sheet ujian dan uji semula mengikut
  `docs/SENARAI-SEMAK-PENAMBAHBAIKAN-1.md`, termasuk ukur semula masa (log `[MASA]` dalam Executions).
  Tunggu pengesahan pemilik, kemudian **Fasa 7** (Seksyen 6).
- Emel kata laluan sementara sekarang dihantar dari akaun Google pemilik skrip (latihan). Pemilik akan
  buat emel admin baharu kemudian; hanya tukar pemilik/deploy, tiada perubahan kod dijangka.

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
- Nilai `ref_*` tidak aktif (contoh `kontrak`) masih diterima server untuk rekod baharu jika dihantar terus
  melalui API (UI tidak menawarkannya). Pertimbangkan tolak dalam Fasa 7.
- Kelajuan: selepas P0 masih 6–10 s; selepas cache semua tab (09/11/2026) pemilik ukur **2–3 s setiap tukar halaman**.
  Pilihan seterusnya jika perlu: cache di pelayar (papar data lama serta-merta, kemas kini di belakang).

---

## 5. Urutan kerja seterusnya

1. Tunggu keputusan ujian semula pemilik (`docs/SENARAI-SEMAK-PENAMBAHBAIKAN-1.md`) dan masa baharu.
   Baiki apa-apa isu yang dilaporkan dahulu.
2. **Fasa 7**: audit keselamatan terhadap Seksyen 3 (senarai peraturan + bukti ujian); PDPA — superadmin
   eksport dan padam data seorang guru, tempoh simpanan 2 tahun selepas nyahaktif (penanda/arkib + fungsi
   pembersihan), senarai semak kebocoran data; `docs/MIGRASI-SUPABASE.md` (SQL `CREATE TABLE` dijana
   daripada `Schema.gs`, RLS, import CSV, Supabase Auth menggantikan `akaun`/`sessions`, kunci `anon`
   sahaja di frontend). Ambil kira tarikh kini nilai Date dalam Sheet (format eksport CSV).

Setiap perubahan skema: kemas kini `Schema.gs`, `npm run bundle`, `npm run skema-md`, ujian, senarai semak
yang menerangkan langkah kemas kini Sheet sedia ada (pemilik sudah ada Sheet ujian dengan data).
