# Audit keselamatan dan PDPA (Fasa 7)

> Tarikh: 09/11/2026. Skop: `backend/*.gs`, `frontend/`, tetapan Netlify, Sheet ujian pemilik.
> Rujukan: dokumen arahan projek Seksyen 3 dan senarai "7 teknik sekuriti" (Apps Script + Sheets + Netlify).
> Bukti: ujian automatik (`npm test`, 150 lulus) dan ujian pelayar Playwright pada pelayan dev.

## Keputusan

**Boleh digunakan untuk data guru sebenar**, dengan syarat langkah "Tindakan pemilik" di bawah dibuat.
Tiada isu kritikal terbuka. Tiga jurang ditemui dalam audit ini dan sudah dibaiki (Seksyen B).

## A. Semakan mengikut peraturan

| # | Peraturan | Status | Bukti |
|---|---|---|---|
| 1 | Tiada "Publish to Web"; Sheet tidak dikongsi | Lulus (tetapan pemilik) | Semua akses melalui `doPost`; `SS_ID` dalam Script Properties, bukan dalam frontend. Semak sendiri: Fail > Kongsi (hanya anda), Fail > Kongsi > Terbitkan ke web (tiada). |
| 2 | Kata laluan di-hash, salt unik, tiada plaintext | Lulus | `Auth.gs`: SHA-256 + salt setiap akaun + `PEPPER` (Script Properties) × 1000. `tests/auth.test.js`. |
| 3 | Token sesi rawak, disemak SETIAP permintaan, log keluar membatalkan di server | Lulus | `requireAuth()` langkah pertama setiap aksi kecuali `LOGIN`. `tests/keselamatan.test.js`: setiap aksi menolak tanpa token / token palsu. |
| 4 | Peranan dan pemilikan disemak di SERVER | Lulus | `getActions()` + `_sasaranGuru()`. `tests/keselamatan.test.js`: setiap aksi pentadbir ditolak untuk guru, setiap aksi superadmin ditolak untuk pentadbir, guru tidak boleh baca/ubah data guru lain. |
| 5 | Had cubaan log masuk | Lulus | 8 gagal / 5 minit setiap ID; masa jawapan sama untuk ID wujud/tidak; mesej sama ("ID guru atau kata laluan salah"). |
| 6a | XSS: tiada `innerHTML` untuk data | Lulus | Carian kod: tiada `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function` dalam `frontend/` (selain vendor Chart.js). Semua teks melalui `UI.el` / `textContent`. |
| 6b | Formula injection ke Sheets | Lulus | `sanitizeForSheet()` dalam `Repository.gs` untuk setiap tulisan. |
| 6c | Pengesahan input | Lulus | Skema (jenis, julat, enum, FK, unik), had saiz permintaan, nama aksi ditapis regex. |
| 7 | PDPA: notis, persetujuan, simpanan, akses, padam | Lulus | Notis privasi v1.2 + persetujuan wajib; eksport data sendiri; padam oleh superadmin; simpanan 2 tahun (Seksyen C). |
| — | Data terlarang (IC, gaji) | Lulus | Tiada lajur; nombor seperti IC dibuang daripada teks bebas (ujian skema). |
| — | Rahsia tidak dalam repo/frontend | Lulus | `config.js` hanya URL Web App (bukan rahsia). Ujian menyemak tiada rahsia dalam `dist/Code.gs`. |
| — | Header keselamatan laman | Lulus (dibaiki) | `frontend/_headers`: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| — | Log audit | Lulus | Log masuk, gagal, urus akaun, PDPA, bacaan telefon penuh, guru ganti. Ditulis tanpa membaca tab. |
| — | Ralat tidak membocorkan butiran | Lulus | Ralat tidak dijangka -> mesej umum kepada pengguna; butiran hanya dalam log Apps Script. |

## B. Jurang ditemui dan dibaiki dalam Fasa 7

1. **Header keselamatan tidak terpakai.** Header berada dalam `netlify.toml` di akar repo, tetapi pemilik
   menerbitkan dengan seret folder `frontend/` (fail itu tidak ikut). Dipindah ke `frontend/_headers` dan
   ditambah **Content-Security-Policy**: skrip hanya dari laman sendiri, sambungan rangkaian hanya ke laman
   sendiri dan `script.google.com` / `script.googleusercontent.com`. Jika ada XSS sekalipun, data tidak boleh
   dihantar ke pelayan lain. Semua 17 halaman diuji di pelayar dengan CSP aktif: tiada ralat.
2. **Nilai rujukan tidak aktif masih diterima** (contoh `kontrak` dihantar terus ke API). Kini ditolak untuk
   rekod baharu atau bila nilai ditukar; rekod lama kekal sah. Ujian: `tests/keselamatan.test.js`.
3. **Tiada cara log keluar semua pengguna semasa kecemasan.** Fungsi `logKeluarSemua()` ditambah (jalankan
   dari editor Apps Script). Ujian menunjukkan sesi dalam cache juga terbatal serta-merta.

## C. PDPA

| Prinsip | Pelaksanaan |
|---|---|
| Notis dan pilihan | `privasi.html` (versi 1.2): data dikumpul, tujuan, siapa boleh lihat, tempoh simpanan, lokasi (Google, mungkin luar Malaysia), hak. Persetujuan wajib sebelum guna sistem; versi direkod dalam `audit_log`. |
| Penzahiran | Hanya guru sendiri dan pentadbir. Guru lain hanya nampak nama (relief, usrah). Telefon bertutup untuk bukan pentadbir. |
| Keselamatan | Seksyen A. |
| Penyimpanan | Data disimpan selama berkhidmat + **2 tahun selepas dinyahaktif** (`guru.dinyahaktif_pada`). Superadmin melihat senarai "Tempoh simpanan data (PDPA)" di Urus akaun dan memadam sendiri (sistem tidak memadam automatik supaya tiada kehilangan data tanpa semakan manusia). `audit_log` melebihi 2 tahun dibuang oleh pencetus harian. |
| Integriti | Guru boleh membetulkan data sendiri; pengesahan skema. |
| Akses (dan mudah alih) | Guru: Profil > "Muat turun data saya" (JSON, tanpa hash kata laluan). Superadmin boleh eksport bagi pihak guru. Setiap eksport direkod. |
| Pemadaman | Superadmin: Urus akaun > Padam data (guru mesti tidak aktif, taip ID guru untuk sahkan). Data peribadi dipadam; rekod dikongsi (kumpulan usrah, rekod relief) kekal dengan nama "Guru dipadam" supaya data guru lain tidak rosak. Ujian memastikan setiap jadual baharu yang merujuk guru mesti dikelaskan. |
| Kebocoran | `docs/PELAN-KEBOCORAN-DATA.md`. |

## D. Risiko yang diterima (keputusan pemilik atau had platform)

- **Sesi 30 hari dalam `localStorage`.** Pemilik mahu guru kekal log masuk pada peranti sendiri. Risiko: jika
  ada XSS, token boleh dibaca; dikurangkan dengan `textContent` sahaja + CSP. Nasihat guru: log keluar pada
  komputer berkongsi. Pentadbir boleh nyahaktif/reset untuk membatalkan sesi serta-merta.
- **`'unsafe-inline'` dalam CSP.** Setiap halaman ada skrip dalam fail HTML. Memindahkan semuanya ke fail `.js`
  ialah kerja besar dengan faedah kecil kerana tiada `innerHTML`; `connect-src` tetap menyekat penghantaran data
  keluar. Boleh dibuat semasa migrasi Supabase.
- **SHA-256 × 1000, bukan bcrypt/argon2.** Had Apps Script (tiada pustaka hash perlahan). Selesai bila pindah
  ke Supabase Auth (bcrypt).
- **Kata laluan sementara dalam emel.** Wajib ditukar pada log masuk pertama.
- **Data di pelayan Google, mungkin luar Malaysia** (pemindahan rentas sempadan). Dinyatakan dalam notis privasi.
- **Cache pelayan** menyimpan salinan data (dalam akaun Google yang sama) sehingga 6 jam; dibatalkan bila
  sistem menulis. Suntingan terus dalam Sheet muncul dalam masa ≤ 1 jam (atau jalankan `segarkanCache`).
- **Ambang DPO** (20,000 subjek data) jauh di atas saiz sekolah; tidak diperlukan sekarang.

## E. Tindakan pemilik (sekali sahaja)

1. Sahkan Sheet **tidak dikongsi** dan **tidak diterbitkan ke web**; editor projek Apps Script hanya anda.
2. Web App: *Execute as: Me*, *Who has access: Anyone* (perlu untuk Netlify; keselamatan dijaga oleh token).
3. Pastikan `frontend/_headers` ikut dimuat naik ke Netlify (ada dalam folder `frontend`). Semak: buka laman,
   F12 > Network > pilih `index.html` > Response Headers mesti ada `content-security-policy`.
4. Akaun Google pemilik skrip: aktifkan pengesahan 2 langkah (2FA). Akaun ini memegang Sheet dan `PEPPER`.
5. Jangan kongsi tangkapan skrin Script Properties.
