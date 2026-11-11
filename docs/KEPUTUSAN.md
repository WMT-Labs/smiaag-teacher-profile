# Catatan keputusan, andaian dan perkara untuk dibincangkan

Dikemas kini pada penghujung setiap fasa. Rujuk dokumen arahan projek (Seksyen 13 dan 14).

## Keputusan pemilik

| Tarikh | Keputusan |
|---|---|
| 06/11/2026 | Hash kata laluan: SHA-256 + salt + pepper, diulang (1000 kali). |
| 06/11/2026 | Had percubaan mengikut ID guru diterima; pentadbir boleh buka kunci. |
| 06/11/2026 | Kata laluan: minimum 8 aksara, tidak sama dengan ID guru. |
| 06/11/2026 | Sesi kekal walaupun tab ditutup (guru guna peranti sendiri). |
| 06/11/2026 | Data yang diubah guru terus disimpan, tanpa kelulusan pentadbir. |
| 06/11/2026 | Ciri gambar guru dibuang sepenuhnya. Sistem tidak lagi memerlukan akses Google Drive. |
| 06/11/2026 | Cerapan boleh dikemas kini oleh guru sendiri; GK, PK dan Pengetua (peranan pentadbir) boleh mengemas kini bagi pihak guru. |
| 06/11/2026 | Status "Dalam percubaan" selama 6 bulan dari tarikh lantikan. Pentadbir dimaklumkan bila tamat dan mengesahkan ke guru tetap. |
| 06/11/2026 | Jadual: guna jadual sekolah (PDF aSc Timetables, satu halaman setiap guru). Kaedah ekstrak: tidak berbayar (Claude API ditolak). |
| 06/11/2026 | Jadual diimport daripada eksport aSc Timetables (fail akan diberi kemudian; guna data contoh dahulu). |
| 06/11/2026 | Tugasan guru diimport/diisi oleh pentadbir sahaja; guru tidak mengisi satu persatu. |
| 06/11/2026 | Unit Syabab: KASPA, KRS, BSMM, Puteri Islam. Kelab diisi oleh pentadbir. Rumah sukan: Fatah (merah), Falah (hijau), Najah (biru), Solah (kuning). |
| 08/11/2026 | Penambahbaikan pemilik (12 item) disiapkan: lihat seksyen "Penambahbaikan 08/11/2026". |
| 08/11/2026 | Format tarikh dalam Sheet `08-11-2026, 08.15` (24 jam), semua tab. Paparan masa dalam sistem 12 jam (`12.50 tgh`). |
| 08/11/2026 | Emel: kod sedia; akaun penghantar akan ditukar ke emel admin baharu kemudian. Julat tahun 10 ke belakang dan 10 ke hadapan. |
| 08/11/2026 | Warna jadual dipilih setiap guru; pentadbir boleh cetak jadual guru lain. Guru ganti ditetapkan pentadbir sahaja, ikut tarikh. |
| 08/11/2026 | ADMIN01 ialah akaun sistem (bukan guru); SM216 menjadi akaun guru pemilik (peranan Pentadbir). Praktikal ada tarikh tamat + amaran 30 hari. |
| 08/11/2026 | Status lantikan: Tetap, Percubaan, Praktikal, Lain-lain. Kontrak dibuang (dinyahaktifkan, rekod lama kekal). Borang Tambah akaun mendapat medan tarikh lantikan. |
| 07/11/2026 | Tempoh simpanan data guru yang berpindah atau bersara: 2 tahun selepas akaun dinyahaktifkan (dilaksanakan pada Fasa 7). |
| 07/11/2026 | Guru boleh sunting jadual sendiri (pembetulan kecil, tukar masa dengan guru lain). |
| 07/11/2026 | Guru Tarbiah dan Usrah Murabbi Pelajar disimpan berasingan. |
| 07/11/2026 | Kehadiran usrah guru diisi oleh murabbi kumpulan, mengikut sesi yang dijalankan (bukan semestinya mingguan). |
| 06/11/2026 | Cerapan dipermudahkan: hanya bilangan dicerap setahun dan nama pencerap. Tiada sasaran, tiada tarikh dirancang. Jadual `sasaran_cerapan` dan `ref_status_cerapan` dibuang. |

## Penambahbaikan 08/11/2026: andaian dan nota teknikal

1. **Kelajuan:** cache bacaan tab dalam satu permintaan; cache 5 minit untuk jadual rujukan (`ref_*`, subjek, kelas, waktu, had, unit, rumah); cache sesi 5 minit dengan pembatalan serta-merta (token dipadam/diubah, akaun atau guru dikemas kini). Laluan tulisan sentiasa membaca data segar. Jika pemilik menyunting Sheet secara manual, data rujukan mungkin lambat dikemas kini sehingga 5 minit.
2. **`audit_log`** ditulis dengan `appendLog` (hanya membaca baris tajuk).
3. **Tarikh** disimpan sebagai nilai tarikh Sheets dengan format `dd-mm-yyyy` / `dd-mm-yyyy, hh.mm`; zon waktu Spreadsheet ditetapkan Asia/Kuala_Lumpur. Masa slot (JJ:MM) kekal teks. Eksport CSV dari Sheets akan memaparkan format tempatan (ambil kira semasa migrasi Supabase).
4. **`setupTemplate`** kini menyisip lajur baharu ke tab sedia ada secara automatik dan menukar teks tarikh lama; tab tidak perlu dipadam lagi bila skema bertambah. Lajur yang tidak dikenali tetap menghentikan setup (tidak menimpa data).
5. **ID boleh baca:** UUID kekal sebagai kunci dalaman. Tab baca-sahaja `lihat_akaun` (formula XLOOKUP) memaparkan ID guru, nama, peranan, status dan tarikh.
6. **Akaun sistem** (`guru.akaun_sistem`): mesti Pentadbir atau Superadmin; dikecualikan daripada senarai guru, dashboard, guru ganti, import, koku dan HEM. `ciptaSuperadminPertama` mencipta akaun sistem.
7. **Emel:** `guru.email` disimpan huruf kecil, unik bila diisi (disemak dalam kod kerana kekangan unik skema menganggap kosong sebagai sama). Emel dihantar semasa cipta akaun dan reset; kata laluan masih dipaparkan sekali sebagai sandaran; kegagalan emel tidak membatalkan akaun.
8. **Nama panggilan** untuk hebahan: `nama_panggilan`, atau perkataan sebelum bin/binti (maksimum 2 perkataan).
9. **Cetak jadual:** halaman cetakan berasingan (A4 landskap) dengan logo, nama, jam kredit, petunjuk warna, tarikh cetak. Warna lalai daripada palet lembut; teks gelap/terang ikut kecerahan.
10. **Masa slot:** dropdown setiap 5 minit 7.30 pg hingga 3.30 ptg + "Masa lain…" (input masa bebas). Akhiran: pg (sebelum 12), tgh (12.xx), ptg (1 hingga 6.59), mlm.
11. **Kokurikulum:** kotak berasingan Syabab / Kelab / Pasukan di halaman guru dan pentadbir; `UNIT_PUKAL`; rumah sukan kini ditetapkan pentadbir sahaja (`RUMAH_AHLI_SIMPAN`, jawatan dikekalkan).
12. **Guru ganti:** `ketidakhadiran_guru` (unik tarikh + guru) dan `guru_ganti` (unik ketidakhadiran + slot). Slot diambil daripada jadual disahkan mengikut hari tarikh itu. Hebahan hanya memasukkan slot yang ada pengganti; nombor ikut susunan rekod; pengganti diawali "Cg".
13. **Penunjuk loading:** bar nipis di atas skrin untuk setiap panggilan, label "Sedang memuatkan…" selepas 0.8 s, dan rangka (skeleton) kad semasa halaman pertama dimuat.

## Fasa 6: andaian

1. **Penapisan di pelayar.** Server menghantar satu baris ringkasan bagi setiap guru aktif (tanpa telefon, hash atau data peribadi lain), dan penapis berjalan di pelayar supaya pantas. Ini selaras dengan Seksyen 3.4 kerana hanya pentadbir dan superadmin boleh memanggil `DASHBOARD`, dan mereka memang berhak melihat semua guru.
2. **Penapis "Jabatan"** berdasarkan jabatan dalam tugasan tidak berjadual guru. **"Subjek"** daripada tugasan dan jadual. **"Tingkatan"** daripada kelas dalam jadual guru.
3. **Chart.js 4.4.1 dihos sendiri** dalam `frontend/vendor/` (lesen MIT disertakan), bukan dari CDN. Tiada kebergantungan pada pelayan luar dan tiada risiko fail CDN diubah. Jika Chart.js gagal dimuat, carta bertukar kepada bar CSS ringkas.
4. **Eksport CSV** mengikut penapis dan susunan yang sedang dipaparkan, dengan lebih banyak lajur daripada jadual (subjek, tingkatan, unit, usrah, peranan HEM). Nilai yang bermula dengan `= + - @` diawali `'` supaya Excel tidak menjalankannya sebagai formula. Fail mempunyai BOM supaya huruf dipaparkan betul dalam Excel.
5. **"Cerapan akan datang"** dalam dokumen asal tidak dipaparkan kerana cerapan telah dipermudahkan (tiada tarikh dirancang). Dashboard memaparkan sudah / belum dicerap dan jumlah cerapan.
6. **Tambahan di luar dokumen:** kad tamat percubaan, ringkasan HEM (usrah guru, kehadiran bawah 50%, Guru Tarbiah, kelas tanpa guru kelas).
7. **`pratonton.html` dibuang** kerana digantikan oleh dashboard sebenar.
8. **Prestasi:** dashboard membaca setiap tab Sheet sekali sahaja (kira-kira 28 bacaan tetap, tidak bertambah mengikut bilangan guru). Jika terasa lambat dengan data sebenar, Fasa 7 boleh menambah cache ringkas.

## Fasa 5: andaian

1. **Jadual `sesi_usrah_guru` ditambah.** Dokumen asal menyimpan kehadiran dengan `usrah_guru_id` dan `tarikh` sahaja. Kini setiap sesi ada rekod sendiri (tarikh, tajuk, catatan), dan kehadiran merujuk sesi (`sesi_id`). Ini lebih tepat untuk "sesi dijalankan" dan membolehkan sesi tanpa kehadiran direkod. Satu sesi bagi setiap kumpulan pada satu tarikh.
2. **Kumpulan usrah guru ditetapkan oleh pentadbir** (nama, murabbi, hari, ahli). Seorang guru hanya boleh menjadi ahli satu kumpulan setiap tahun. Murabbi bukan ahli kumpulan sendiri, tetapi boleh menjadi ahli kumpulan lain.
3. **Hanya murabbi** boleh merekod, menyunting dan memadam sesi kumpulannya. Pentadbir boleh melihat semua tetapi tidak merekod (ikut keputusan pemilik). Jika murabbi bertukar, pentadbir tukar murabbi kumpulan itu.
4. **Ahli** melihat kehadiran sendiri sahaja (bukan rakan sekumpulan). Sesi tanpa rekod kehadiran seseorang dikira tidak hadir.
5. **Tarikh sesi** tidak boleh pada masa depan dan mesti dalam tahun kumpulan.
6. **Kumpulan yang sudah ada sesi** tidak boleh dipadam, supaya sejarah kehadiran kekal.
7. **Usrah murabbi pelajar dan peranan HEM** diisi oleh guru sendiri (atau pentadbir bagi pihak guru). Satu peranan setiap jenis setiap tahun bagi seorang guru (Guru Kelas: satu bagi setiap kelas). Guru Kelas mesti memilih kelas.
8. **Peratus kehadiran:** hijau 80% ke atas, kuning 50% hingga 79%, merah bawah 50%.

## Fasa 4 dan import: andaian

1. **Format eksport aSc** ditulis berdasarkan struktur XML aSc yang biasa (`period`, `daysdef`, `subject`, `teacher`, `class`, `lesson`, `card`). Saya tak pasti 100% ia sama dengan versi sekolah. Bila fail sebenar diterima, saya semak dan laraskan `frontend/js/asc.js`. Fail sebenar mengandungi nama guru, jadi **jangan** letak dalam repo; uji melalui halaman Import jadual.
2. **Padanan guru aSc** guna nama penuh, atau singkatan aSc yang sama dengan ID guru. Selebihnya dipilih manual pada langkah 2.
3. **Singkatan aSc yang tiada dalam senarai subjek** (contoh Perhimpunan, Usrah) disimpan sebagai aktiviti, bukan subjek. Tambah subjek dengan kod yang sama jika ia sebenarnya subjek.
4. **Import jadual mengganti** jadual tahun itu bagi guru yang diimport sahaja. Guru lain tidak disentuh. Slot import ditanda `sumber = asc`.
5. **Ganti pukal yang selamat:** semua baris baharu disahkan dahulu. Jika satu baris gagal, data lama kekal (tiada separa simpan). Berlaku untuk import jadual, tugasan dan juara rumah sukan.
6. **Tugasan** kini hanya boleh ditambah/diubah oleh pentadbir (disemak di server). Guru melihat sahaja.
7. **Jadual** boleh disunting oleh guru sendiri (disahkan pemilik 07/11/2026). Import aSc seterusnya akan menggantinya.
8. **Unit Syabab** dimuat untuk tahun semasa oleh `setupTemplate`. Unit tahun baharu boleh disalin daripada tahun lepas (tanpa ahli). Label jenis "Badan beruniform (Syabab)".
9. **Keahlian unit dan rumah sukan** diisi oleh guru sendiri (atau pentadbir bagi pihak guru). Satu rumah sukan bagi setiap guru setiap tahun.
10. **Pertandingan** direkod oleh guru yang terlibat; guru itu menjadi peserta. Peserta lain boleh mengubah rekod. Pentadbir boleh menambah guru lain. Jika peserta terakhir keluar, rekod pertandingan dipadam.
11. **Carta juara** dilukis dengan CSS (bukan Chart.js) kerana ringkas. Chart.js akan digunakan pada dashboard (Fasa 6).

## Fasa 3: andaian dan perkara yang dibangkitkan

1. **OCR Google Drive tidak sesuai untuk jadual ini (dibangkitkan, menunggu keputusan).** PDF jadual sekolah ialah imej imbasan (300 dpi, tiada teks). OCR Google Drive hanya memulangkan teks biasa tanpa kedudukan, jadi sistem tidak dapat tahu sesuatu subjek berada pada hari dan waktu mana, terutama slot yang merentas beberapa waktu. Hasilnya hampir semua slot perlu ditaip semula. Alternatif percuma yang dicadangkan: eksport terus daripada aSc Timetables (fail XML atau Excel), yang 100% tepat. Import PDF belum dibina sehingga keputusan dibuat.
2. **Satu slot boleh ada beberapa kelas** (kelas gabungan seperti dalam jadual sebenar), jadi `jadual_slot.kelas_id` digantikan dengan jadual penghubung `jadual_slot_kelas`. Ditambah lajur `label` untuk slot bukan subjek (Perhimpunan, Usrah, KOKU, Mesyuarat).
3. **Jadual `waktu` baharu**: templat waktu persekolahan setiap tahun, diisi lalai dengan 18 waktu daripada jadual sekolah 2026 (07:30 hingga 15:30). Waktu khas Jumaat boleh dipilih terus semasa mengisi slot.
4. **Pertindihan kelas** (kelas sama, guru berbeza) dipaparkan sebagai amaran kuning sahaja, kerana kelas elektif yang dipecahkan (contoh KMA/EKO, ASK/RBT) adalah sah. Pertindihan guru sendiri dipaparkan merah.
5. **Status beban:** hijau di bawah 80% had, kuning 80% hingga had, merah melebihi had.
6. **Tugasan** diisi oleh guru sendiri daripada surat tugasan (pentadbir boleh membetulkan). Jam kredit ikut surat; bilangan slot jadual hanya untuk semakan silang.
7. **Carian guru ganti** menyusun guru mengikut jam kredit berjadual paling rendah dahulu. Tapisan jabatan berdasarkan jabatan dalam tugasan tidak berjadual guru itu (guru tidak mempunyai medan jabatan sendiri). Bilangan ganti yang sudah dibuat belum direkod (tidak wajib fasa pertama).
8. **Pengesahan percubaan:** guru boleh menukar status lantikan sendiri, kecuali daripada "Dalam percubaan" kepada "Tetap"; itu dibuat oleh pentadbir. Tarikh pengesahan disimpan dalam `guru.tarikh_disahkan`. Pentadbir boleh mengesahkan lebih awal dengan amaran.
9. **PDF jadual tidak disimpan dalam repo** kerana mengandungi nama guru sebenar. Data demo menggunakan nama kelas rekaan.

## Fasa 2: andaian yang saya buat

1. **Guru boleh mengubah semua maklumat teras sendiri** (nama, status lantikan, jawatan, tarikh lantikan, telefon), terus disimpan. ID guru hanya boleh diubah oleh superadmin (belum ada skrin, jarang diperlukan).
2. ~~Cerapan dicatat oleh pentadbir sahaja~~ Diubah pada Fasa 3: guru boleh mengemas kini sendiri.
3. **Telefon:** guru menaip nombor baharu untuk menggantikan yang lama, atau tanda "Padam nombor telefon". Nombor disimpan sebagai digit sahaja (`0123456789`).
4. ~~Gambar guru~~ dibuang pada Fasa 3 atas permintaan pemilik.
6. **Senarai guru** untuk pentadbir ditambah (bukan dalam dokumen asal untuk Fasa 2), supaya pentadbir boleh membuka profil guru sebelum dashboard siap pada Fasa 6.
7. **Data rujukan subjek** boleh diisi superadmin sekarang, kerana opsyen guru memerlukan senarai subjek. Senarai tetap subjek masih perlu anda sahkan (Fasa 3).
8. **Pentadbir menyunting profil guru lain** direkod dalam `audit_log` (`SUNTING_PROFIL_GURU`).

## Fasa 1: andaian yang saya buat

1. **Sesi kekal 30 hari dan bergerak.** Setiap kali guru guna sistem, kiraan 30 hari bermula semula (paling kerap sekali sehari). Guru yang tidak guna sistem selama 30 hari perlu log masuk semula. Boleh diubah (`SESSION_TTL_DAYS` dalam `Auth.gs`).
2. **Kata laluan sementara dijana oleh sistem** (10 aksara, tiada aksara mengelirukan seperti 0/O atau 1/l), bukan ditaip oleh superadmin. Dipaparkan sekali sahaja.
3. **Urutan log masuk pertama:** notis privasi dahulu, kemudian tukar kata laluan. Sebelum kedua-duanya selesai, server menolak semua aksi lain (bukan hanya disorok di frontend).
4. **Pentadbir boleh melihat senarai akaun dan buka kunci.** Cipta, reset, nyahaktif dan tukar peranan hanya superadmin.
5. **Nyahaktif akaun juga menandakan `guru.aktif` = FALSE**, kerana guru yang tidak boleh log masuk biasanya sudah tidak berkhidmat. Rekod tidak dipadam.
6. **Sentiasa ada sekurang-kurangnya seorang superadmin aktif.** Superadmin tidak boleh menyahaktif, menukar peranan atau reset kata laluan akaun sendiri melalui Urus akaun (guna Tukar kata laluan).
7. **Tukar kata laluan dan reset** melog keluar peranti lain. Tukar peranan juga memaksa log masuk semula.
8. **Superadmin pertama** dicipta dengan fungsi `ciptaSuperadminPertama` yang membaca ID dan nama daripada Script Properties, supaya tiada data dalam kod. Fungsi menolak jika superadmin sudah wujud.
9. **ID guru disimpan dalam huruf besar**, dan log masuk tidak sensitif huruf besar/kecil.
10. **Bilangan ulangan hash (1000)** ialah anggaran saya. Saya tak pasti kelajuan sebenar Apps Script untuk ini. Ujian manual Fasa 1 meminta anda catat masa log masuk. Hash menyimpan bilangan ulangan, jadi nilai boleh diubah tanpa merosakkan kata laluan sedia ada.
11. **Token disimpan dalam `localStorage`**, jadi guru kekal log masuk walaupun tab ditutup. Sesuai kerana setiap guru guna peranti sendiri. Server masih boleh membatalkan token bila-bila masa (log keluar, reset, nyahaktif). Jika guru terpaksa guna komputer kongsi, mereka perlu tekan Log keluar.

## Fasa 0: andaian

1. `had_jam_kredit` diberi lajur `id` (UUID) supaya ikut peraturan "setiap tab ada id". `sessions` guna `token` sebagai kunci utama.
2. Lajur tambahan `akaun.persetujuan_pdpa_pada` untuk bukti persetujuan PDPA (Seksyen 9).
3. Jadual `ref_*` tambahan: `ref_tahap_kelayakan`, `ref_jenis_opsyen`, `ref_peringkat_kursus` dan `ref_peringkat_pertandingan`, `ref_hari` (isnin hingga ahad). Kod nilai dalam `snake_case` (`al_quran_tutorial`).
4. Lajur nilai terhad menyimpan `kod` (boleh dibaca manusia). Dalam Postgres ia menjadi kunci asing kepada `ref_*.kod`.
5. Dalam kekangan unik, nilai kosong dianggap sama (`UNIQUE NULLS NOT DISTINCT` dalam Postgres).
6. Nombor IC dalam teks bebas dibuang senyap-senyap semasa simpan. Nombor telefon tidak terkesan.
7. Aksi tanpa token, termasuk yang tidak wujud, dijawab `TIDAK_LOG_MASUK`.
8. `dist/Code.gs` ialah gabungan fail backend untuk salin-tampal.
9. UI: warna logo tepat untuk jenama dan butang utama, versi lembut untuk latar. Status "hampir had" pada 80% had.

## Perkara belum diputuskan (Seksyen 14)

| Perkara | Diperlukan pada |
|---|---|
| Fail eksport aSc sebenar (untuk menyemak format) | Bila tersedia |
| Senarai tetap subjek dan kelas (superadmin boleh isi sendiri di Data rujukan, tambah pukal) | Sebelum guna sebenar |

## Kelajuan peringkat 2 (09/11/2026)

Ukuran pemilik selepas P0: log masuk 6 s, profil 6 s, dashboard 10 s, tukar tahun 6 s. Executions menunjukkan
`SESI_SAYA` (dari cache) ~0.85 s, tetapi aksi data 3–9 s, jadi kos utama ialah membaca tab Sheet.

- **Semua tab dicache** dalam CacheService (kecuali `audit_log`, `sessions`), dipecah kepada kepingan 30k aksara,
  TTL 6 jam. Setiap tab ada "versi"; setiap tulisan menukar versi SELEPAS menulis (dalam kunci), pembaca
  menetapkan versi SEBELUM membaca Sheet. Jadi data lama tidak dipulangkan selepas sistem menulis.
- **Spreadsheet dibuka sekali setiap permintaan** (sebelum ini `openById` dipanggil untuk setiap tab).
- **Pencetus `panaskanCache` setiap jam** (dipasang oleh `setupTemplate`) mengisi cache dan membatalkan cache sesi.
- **Andaian / kesan:** suntingan TERUS dalam Sheet (bukan melalui sistem) muncul dalam sistem selepas maksimum
  ~1 jam. Untuk serta-merta: jalankan `segarkanCache` dalam editor Apps Script.
- Hash kata laluan 1000 ulangan semasa log masuk tidak dikurangkan (keselamatan Seksyen 3).
- Koku urus: senarai unit dalam setiap kotak terhad 420 px dan skrol di dalam kotak.

## Fasa 7 (09/11/2026): andaian

- **Padam selepas 2 tahun dibuat manual oleh superadmin**, bukan automatik. Sebab: pemadaman tidak boleh diundur;
  sistem memaparkan senarai "layak dipadam" dan lencana di Urus akaun. Boleh ditukar kepada automatik jika pemilik mahu.
- **Padam = nyahnama + padam data milik.** Rekod `guru` kekal sebagai "Guru dipadam" (ID `PADAM-xxxx`) supaya kumpulan
  usrah, rekod relief dan ketidakhadiran yang dikongsi dengan guru lain tidak rosak. Sebab ketidakhadiran dikosongkan.
- **Guru boleh memadam? Tidak.** Guru memohon kepada pentadbir (notis privasi). Guru boleh memuat turun data sendiri.
- **Eksport dalam JSON** (format mudah alih, semua jadual dalam satu fail). Tanpa hash/salt kata laluan.
- **audit_log disimpan 2 tahun** (log keselamatan), dibuang oleh pencetus harian 3 pagi.
- **Tarikh nyahaktif untuk data lama**: jika `dinyahaktif_pada` kosong (akaun dinyahaktif sebelum Fasa 7), `updated_at` digunakan.
- **CSP** membenarkan `'unsafe-inline'` kerana skrip halaman berada dalam fail HTML; `connect-src` tetap terhad kepada
  laman sendiri dan Google Apps Script.
- **Supabase**: kata laluan tidak dipindah (guru tetapkan semula melalui emel); `guru_awam` view untuk nama rakan sekerja;
  pendaftaran awam Supabase Auth dimatikan.

## Integrasi e-Cuti (10/11/2026)

- **Pilihan A (pemilik):** log masuk sekali (SSO); e-Cuti kekal sistem berasingan (Apps Script, Sheet, Netlify sendiri).
- **Repo e-Cuti tunggal:** `WeBake/e-Cuti-SMIAAG` (private). Netlify `ecutismiaag` disambung ke repo ini; repo
  `wanmuhammadtaufiq/e-Cuti-SMIAAG` di-archive. `index.html` v2.1 diselaraskan melalui PR WeBake/e-Cuti-SMIAAG#1.
- **Padanan pengguna = emel** (huruf kecil). Tiket tidak membawa peranan; e-Cuti menentukan peranan sendiri.
- **Tiket:** HMAC-SHA256 dengan kunci kongsi `ECUTI_SSO_SECRET` (Script Properties kedua-dua projek), sah 60 saat,
  nonce sekali guna (disemak oleh e-Cuti), dihantar dalam fragmen `#sso=` (tidak masuk log pelayan) dan dibuang
  daripada bar alamat oleh e-Cuti.
- **Akaun sistem (ADMIN01) tiada SSO** kerana bukan guru. Staf bukan guru kekal guna log masuk biasa e-Cuti.

## Pelan 2: keputusan dan andaian (10–11/11/2026)

- **Akaun e-Cuti automatik (pilihan A):** guru dengan emel dalam Profil Guru mendapat akaun e-Cuti GURU pada klik pertama
  menu e-Cuti, tanpa kata laluan e-Cuti. Akaun e-Cuti sedia ada kekal dengan kata laluan sendiri.
- **Kelayakan cuti lalai 12 hari setahun**; pemilik mengubah angka secara manual dalam `DATA_GURU`.
- **B7:** e-Cuti kekal cuti tahunan sahaja. Cuti sakit, kursus, program, cuti tanpa gaji dan cuti ehsan direkod pentadbir
  sebagai jenis ketidakhadiran dalam Guru ganti; tiada kuota, tiada kelulusan, tidak dipaparkan dalam kalendar e-Cuti.
- **Andaian hebahan:** catatan pentadbir diutamakan dalam kurungan. Tanpa catatan, jenis dipaparkan, kecuali cuti sakit,
  cuti tanpa gaji dan cuti ehsan yang dihebahkan sebagai "Cuti" sahaja (maklumat peribadi tidak disiar dalam kumpulan WhatsApp).
- **B5:** hanya tarikh dalam pekeliling Kalendar Akademik 2027 (Kumpulan B) diisi automatik; cuti umum lain ditambah admin.
- **B6 dibatalkan; A2 ditangguhkan; staf bukan guru akan didaftarkan dalam Profil Guru.**
