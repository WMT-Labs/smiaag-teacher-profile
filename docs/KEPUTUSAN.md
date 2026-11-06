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
| 06/11/2026 | Cerapan dipermudahkan: hanya bilangan dicerap setahun dan nama pencerap. Tiada sasaran, tiada tarikh dirancang. Jadual `sasaran_cerapan` dan `ref_status_cerapan` dibuang. |

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
| Tempoh simpanan data guru yang berpindah atau bersara (notis privasi kini menyebut "mengikut tempoh yang ditetapkan oleh pihak sekolah") | Fasa 7 |
| Kaedah import jadual: eksport aSc Timetables (dicadangkan) atau OCR Google Drive dengan had yang dinyatakan | Sebelum import jadual dibina |
| Senarai tetap subjek dan kelas (superadmin boleh isi sendiri di Data rujukan, tambah pukal) | Sebelum guna sebenar |
| Senarai unit kokurikulum dan rumah sukan | Fasa 4 |
