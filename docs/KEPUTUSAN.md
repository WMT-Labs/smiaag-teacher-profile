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
| 06/11/2026 | Cerapan dipermudahkan: hanya bilangan dicerap setahun dan nama pencerap. Tiada sasaran, tiada tarikh dirancang. Jadual `sasaran_cerapan` dan `ref_status_cerapan` dibuang. |

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
| Kaedah ekstrak PDF (Claude API atau OCR Drive) dan format PDF jadual sebenar | Fasa 3 |
| Senarai tetap subjek, kelas, unit kokurikulum dan rumah sukan | Fasa 3 dan 4 |
