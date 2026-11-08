# Serah tugas: status projek dan kerja seterusnya

> Dokumen ini ialah titik mula untuk sesi seterusnya. Baca keseluruhannya sebelum menulis kod.
> Dikemas kini: 08/11/2026. Branch: `claude/dreamy-einstein-9ucbl7` (repo `WMT-Labs/smiaag-teacher-profile`).
> Commit terakhir sebelum dokumen ini: `9d2af57`. Ujian automatik: **113 lulus, 0 gagal** (`npm test`).

---

## 1. Di mana kita berhenti

- **Fasa 0 hingga 6 siap** dan sudah diuji oleh pemilik di Google Sheet + Apps Script + Netlify sebenar mengikut
  `docs/PANDUAN-UJIAN.md`. Pemilik mengesahkan semua langkah berjalan baik.
- **Masa diukur oleh pemilik (data ujian kecil):** log masuk 6 s, buka profil 6 s, buka dashboard 9 s,
  tukar tahun di dashboard lebih 3 s. Dianggap terlalu perlahan.
- **Pemilik telah memberi 12 item penambahbaikan** (Seksyen 4) dan meminta: **jangan ubah apa-apa lagi**,
  fahamkan dan susun dahulu. Sesi seterusnya mesti **mendapatkan jawapan soalan terbuka (Seksyen 5) dan
  persetujuan pemilik** sebelum mula mengubah kod.
- Senarai pemilik berakhir dengan "1. 2." kosong; **mungkin ada item tambahan**. Tanya dahulu.
- **Fasa 7 (pengukuhan) belum dimulakan** dan dibuat SELEPAS penambahbaikan (Seksyen 6).

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
  dokumentasi dijana ke `docs/SKEMA.md`. 44 tab (16 `ref_*` + 28 data).
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
| Dashboard.gs | ringkasan seluruh sekolah |

### Halaman frontend
`index` (log masuk), `privasi`, `tukar-password`, `utama`, `profil`, `kurikulum`, `koku`, `hem`, `usrah-sesi`,
`guru` (senarai, pentadbir), `slot-kosong` (cari guru ganti), `import-jadual`, `import-tugasan`,
`koku-urus`, `hem-urus`, `dashboard`, `akaun`, `rujukan` (superadmin).
Modul JS diuji di Node: `js/asc.js`, `js/tugasan-import.js`, `js/dashboard-kira.js`.
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

## 4. Senarai penambahbaikan pemilik (08/11/2026) — BELUM DIBUAT

Setiap item: maksud yang difahami, kesan teknikal, dan cadangan. Soalan terbuka di Seksyen 5.

### P0. Kelajuan (dibangkitkan pemilik bersama masa ujian)
- **Punca dianggarkan:** kos asas Apps Script ~1–2 s setiap panggilan; ~0.1–0.3 s setiap bacaan tab;
  profil ~13 bacaan, dashboard ~28; semakan sesi membaca 3 tab (`sessions`, `akaun`, `guru`) pada SETIAP
  permintaan; **`insert()` ke `audit_log` membaca seluruh tab** (makin perlahan bila log bertambah);
  hash 1000 ulangan semasa log masuk; tukar tahun dashboard = panggilan penuh semula.
- **Cadangan:** (a) tulis `audit_log` tanpa membaca tab; (b) cache sesi sah dalam CacheService dengan
  pembatalan serta-merta semasa log keluar/reset/nyahaktif/tukar peranan; (c) cache data rujukan beberapa
  minit (dibatalkan bila ditulis); (d) cache bacaan tab dalam satu permintaan (reset di awal
  `handleRequest`, jangan bocor antara ujian); (e) dashboard ingat data tahun yang sudah dibuka;
  (f) ukur masa setiap bahagian dan tulis ke log Apps Script.
- **Jangkaan jujur:** turun ~30–50% (belum diukur). Bawah 1 s hanya realistik selepas Supabase.
- Lakukan SEBELUM Fasa 7 kerana cache sesi menyentuh keselamatan.

### 1. Format tarikh dan masa dalam Sheet (contoh tab `akaun.created_at`)
- Sekarang teks ISO `2026-11-08T07:20:24+08:00`. Pemilik mahu mudah dibaca, contoh `08-11-2026, 08.15`.
- **Cadangan:** simpan lajur `datetime` (dan `date`) sebagai **nilai tarikh sebenar Sheets** dengan format
  paparan `dd-mm-yyyy, hh.mm` (dan `dd-mm-yyyy`), bukan teks. Data kekal tepat untuk sistem dan migrasi;
  Sheet mudah dibaca. Repository sudah membaca objek Date (`_fromCell`); perlu ubah `_toCell` dan
  `_ensureTab` (format lajur), pastikan zon waktu Spreadsheet = Asia/Kuala_Lumpur.
  Guna untuk SEMUA tab, bukan `akaun` sahaja (konsisten). Sheet sedia ada perlu skrip tukar format.
- Kesan: eksport CSV Sheets untuk migrasi akan memaparkan format tempatan; kemas kini rancangan migrasi.

### 2. Emel guru + hantar kata laluan sementara ke emel
- Tambah lajur `guru.email` (pengesahan format, unik). Borang Tambah akaun + profil.
- Hantar emel semasa **cipta akaun** dan **reset kata laluan** menggunakan `MailApp` (scope baharu
  `script.send_mail`; pemilik perlu membenarkan semula). Emel dihantar dari akaun Google pemilik skrip.
- **Had:** akaun Gmail biasa ~100 emel/hari, Google Workspace ~1500/hari (sahkan semasa pelaksanaan).
- **Keselamatan:** kata laluan sementara dalam emel boleh diterima kerana wajib tukar pada log masuk
  pertama; masih paparkan sekali kepada superadmin sebagai sandaran jika emel gagal. Log `audit_log`
  tanpa kata laluan. Kemas kini notis privasi (emel kini dikumpul) dan `PDPA_VERSI`.

### 3. Lajur ID dalam Sheet sukar dibaca (`id`, `guru_id` UUID)
- **Jangan tukar kunci utama kepada kod boleh baca.** UUID membolehkan ID guru ditukar tanpa memecahkan
  rekod lain (item 12 sendiri memerlukan ini) dan diperlukan untuk migrasi Supabase.
- **Cadangan:** tab paparan baca-sahaja (contoh `lihat_akaun`, `lihat_guru`) yang menggunakan formula
  Sheets (XLOOKUP/QUERY) untuk memaparkan ID guru, nama, peranan, status, tarikh — tanpa UUID.
  Dicipta oleh `setupTemplate`, tidak disentuh oleh sistem, tiada risiko data bercanggah.
  Alternatif: lajur tambahan `guru_kod` dalam tab data (ditulis sistem) — tidak dicadangkan
  (data berganda boleh tidak sepadan).

### 4. Penapis tahun sekurang-kurangnya 20 tahun, lalai tahun semasa
- Semua pilihan tahun (kurikulum, koku, HEM, dashboard, rujukan, import, koku-urus, hem-urus).
- Satu fungsi bersama dalam `js/app.js` (contoh `App.pilihanTahun()`), bukan tulis semula di setiap halaman.

### 5. Kurikulum: cetak jadual + warna subjek boleh diubah
- Butang **Cetak jadual**: `@media print`, A4 landskap, kepala dengan logo, nama guru, tahun; grid hari ×
  waktu seperti jadual sekolah.
- Warna setiap subjek boleh dipilih supaya jelas selepas dicetak (warna juga dipakai di skrin).
- Perlu keputusan: warna milik setiap guru atau warna sekolah (Seksyen 5).

### 6. Kurikulum: pilihan masa slot lebih mudah
- Dropdown masa ringkas 7.30 pagi hingga 3.30 petang (tanpa label "mula waktu 3"), tetapi masih boleh
  memasukkan masa lain (contoh 12.00–12.50). Cadangan: dropdown setiap 5 minit dalam julat itu +
  pilihan "Masa lain…" yang membuka input masa bebas. Format paparan perlu dipersetujui (Seksyen 5).
- Pengiraan `tempoh` (bilangan waktu) kekal berasaskan templat waktu.

### 7. Koku: tambah kelab dan pasukan dalam kotak berasingan
- Sekarang satu borang "Tambah unit atau kelab" dengan pilihan jenis. Pemilik mahu kotak berasingan untuk
  setiap jenis (Kelab/persatuan, Pasukan sekolah; Syabab sudah dimuat awal). Tafsiran: di `koku-urus.html`,
  setiap kumpulan ada butang tambah sendiri. Sahkan sama ada `koku.html` (guru) juga perlu dipisahkan.

### 8. Koku: rumah sukan diisi pentadbir sahaja
- Guru tidak lagi boleh memilih rumah sendiri (paparan sahaja). Server: tulis `guru_rumah` untuk
  pentadbir sahaja (sama seperti `_semakPenulisTugasan`). `koku-urus.html`: tetapkan guru ke rumah
  (sebaiknya pukal, contoh multicheck setiap rumah). Kemas kini ujian kokurikulum.

### 9. Tambah unit kelab dan pasukan secara pukal
- Textarea satu nama setiap baris, setiap jenis (gabung dengan item 7). Aksi baharu contoh `UNIT_PUKAL`
  guna `insertMany`, langkau yang sudah wujud (seperti `KELAS_PUKAL`).

### 10. Cari guru ganti: mula dari guru yang tidak hadir
- Aliran baharu: pilih **tarikh** dan **guru tidak hadir** → paparkan semua slot guru itu pada hari
  tersebut → tekan satu slot → senarai guru lapang untuk slot itu (logik `cariGuruKosong` sedia ada,
  tapis opsyen/jabatan, beban ringan dahulu). Kekalkan juga carian manual hari + waktu.

### 11. Pilih guru pengganti → senarai guru ganti harian (format hebahan WhatsApp)
- Tekan guru lapang untuk menetapkannya sebagai pengganti; rekod disimpan dalam jadual baharu
  (cadangan `guru_ganti`: id, tarikh, guru_tidak_hadir_id, slot_id, masa_mula, masa_akhir, kelas, subjek,
  guru_ganti_id, catatan + audit). Senarai hari itu dijana dalam format teks WhatsApp dengan butang Salin.
- Membolehkan kiraan bilangan ganti setiap guru (spesifikasi asal 6.2, "tidak wajib fasa pertama") untuk
  keadilan agihan.
- **Menunggu templat hebahan WhatsApp daripada pemilik.**

### 12. Tukar superadmin SM216 kepada ADMIN01
- SM216 ialah pemilik sebagai guru; akaun pentadbiran sistem patut berasingan (`ADMIN01`).
- Masalah: setiap akaun kini mesti ada rekod `guru`, jadi ADMIN01 akan dikira sebagai guru dalam senarai
  guru, dashboard, cari guru ganti, dan "guru tanpa unit/usrah".
- **Cadangan:** tambah penanda akaun sistem (contoh `guru.akaun_sistem` bool, lalai FALSE) dan kecualikan
  daripada semua senarai/kiraan guru. Kemudian: (a) fungsi superadmin untuk menukar ID guru
  (UUID menjadikannya selamat), atau (b) cipta ADMIN01 baharu sebagai superadmin dan turunkan SM216
  kepada guru. Sentiasa kekalkan sekurang-kurangnya seorang superadmin aktif.
- Di Sheet ujian pemilik, superadmin sekarang ialah SM216.

### Perkara lain yang masih terbuka
- **Praktikal:** adakah perlu tarikh tamat praktikal dan peringatan seperti Percubaan? (belum dijawab)
- **Fail eksport aSc sebenar** belum diterima; semak dan laraskan `frontend/js/asc.js` bila diterima.
- **Templat hebahan WhatsApp** untuk item 11 belum diterima.
- Nilai `kontrak` yang dinyahaktif masih diterima server untuk rekod baharu jika dihantar terus melalui API
  (UI tidak menawarkannya). Pertimbangkan tolak nilai `ref_*` tidak aktif untuk rekod baharu.

---

## 5. Soalan untuk pemilik sebelum mula

1. **Item 1:** format paparan `08-11-2026, 08.15` (24 jam) atau `08-11-2026, 8.15 pg` (12 jam)? Guna untuk semua tab?
2. **Item 2:** emel dihantar dari akaun Gmail biasa atau Google Workspace sekolah? Mahu pautan laman sistem dalam emel? Hantar juga semasa reset kata laluan?
3. **Item 3:** setuju dengan tab paparan baca-sahaja (UUID kekal di belakang)?
4. **Item 4:** julat 20 tahun ke belakang dan berapa ke hadapan? (cadangan: 15 tahun lepas hingga 4 tahun depan)
5. **Item 5:** warna subjek ditetapkan oleh setiap guru (pilihan sendiri) atau sekali untuk seluruh sekolah oleh superadmin? Perlu cetak juga untuk pentadbir (jadual guru lain)?
6. **Item 6:** paparan masa 24 jam (`12.50`) atau 12 jam (`12.50 ptg`)? Selang dropdown 5 minit?
7. **Item 7:** kotak berasingan di halaman Urus kokurikulum sahaja, atau di halaman Kokurikulum guru juga?
8. **Item 10/11:** siapa boleh menetapkan guru ganti (pentadbir sahaja, atau guru bertugas jadual ganti)? Guru tidak hadir dipilih mengikut tarikh (bukan hari minggu)?
9. **Item 12:** ADMIN01 hanya untuk urus sistem (tidak dikira sebagai guru)? SM216 kekal sebagai guru biasa atau pentadbir?
10. Ada item tambahan selepas 12?

---

## 6. Urutan kerja dicadangkan (selepas soalan dijawab)

1. P0 kelajuan + item 1 format tarikh (kedua-duanya dalam `Repository.gs`/`Setup.gs`).
2. Item 12 + item 3 (model akaun sistem dan tab paparan).
3. Item 2 emel.
4. Item 4 pilihan tahun (`js/app.js`).
5. Item 6 dan 5 (kurikulum).
6. Item 7, 8, 9 (kokurikulum).
7. Item 10 dan 11 (guru ganti) — selepas templat WhatsApp diterima.
8. Kemas kini `docs/PANDUAN-UJIAN.md`, `docs/KEPUTUSAN.md`, senarai semak; pemilik uji semula.
9. **Fasa 7**: audit keselamatan terhadap Seksyen 3 (senarai peraturan + bukti ujian); PDPA — superadmin
   eksport dan padam data seorang guru, tempoh simpanan 2 tahun selepas nyahaktif (penanda/arkib + fungsi
   pembersihan), senarai semak kebocoran data; `docs/MIGRASI-SUPABASE.md` (SQL `CREATE TABLE` dijana
   daripada `Schema.gs`, RLS, import CSV, Supabase Auth menggantikan `akaun`/`sessions`, kunci `anon`
   sahaja di frontend).

Setiap perubahan skema: kemas kini `Schema.gs`, `npm run bundle`, `npm run skema-md`, ujian, senarai semak
yang menerangkan langkah kemas kini Sheet sedia ada (pemilik sudah ada Sheet ujian dengan data).
