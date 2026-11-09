# Pelan tindak balas kebocoran data

> Untuk Sistem Profil Guru SMIAAG. Simpan dokumen ini bersama nombor telefon pentadbir sistem dan Pengetua.
> Tempoh notifikasi di bawah diambil daripada ringkasan firma guaman terhadap **Garis Panduan Pemberitahuan
> Pelanggaran Data** Pesuruhjaya PDP (dikeluarkan Feb 2025, berkuat kuasa 1 Jun 2025). Sahkan dengan teks rasmi
> di laman Jabatan Perlindungan Data Peribadi (pdp.gov.my) sebelum bergantung kepadanya.

## Apa yang dikira kebocoran

- Sheet pangkalan data dikongsi kepada orang lain, atau "Terbitkan ke web" dihidupkan, walaupun seketika.
- Akaun Google pemilik skrip dicerobohi, atau ada editor lain dalam projek Apps Script / Sheet.
- `PEPPER` atau tangkapan skrin Script Properties tersebar.
- Fail eksport (CSV dashboard, JSON PDPA, salinan Sheet) dihantar ke kumpulan WhatsApp atau orang yang salah.
- Seseorang log masuk dengan akaun guru lain (kata laluan dikongsi atau dicuri).
- Telefon/komputer guru yang masih log masuk hilang.

## Langkah segera (dalam 1 jam)

| # | Tindakan | Cara |
|---|---|---|
| 1 | **Tutup kebocoran** | Sheet: Kongsi > buang semua orang selain pemilik; Fail > Kongsi > Terbitkan ke web > Henti. Apps Script: Project Settings > buang editor lain. |
| 2 | **Log keluar semua pengguna** | Editor Apps Script > pilih fungsi `logKeluarSemua` > Run. Semua token terbatal serta-merta. |
| 3 | **Akaun Google pemilik** | Tukar kata laluan, semak "Peranti anda" dan log keluar peranti asing, hidupkan 2FA. |
| 4 | **Akaun guru tertentu** | Urus akaun > Reset kata laluan (sesi guru itu terbatal) atau Nyahaktif. |
| 5 | **Jika `PEPPER` bocor** | Jangan padam dahulu. Hubungi pembangun: menukar `PEPPER` menjadikan SEMUA kata laluan tidak sah, jadi setiap akaun perlu direset selepas itu. |
| 6 | **Simpan bukti** | Tangkapan skrin (tanpa data guru), masa ditemui, siapa melapor. Muat turun tab `audit_log` (Fail > Muat turun) sebelum apa-apa dipadam. |

## Siasat (dalam 24 jam)

- `audit_log`: cari `LOGIN_BERJAYA` pada masa luar biasa, `LOGIN_GAGAL` berulang, `BACA_TELEFON_PENUH`,
  `PDPA_EKSPORT`, perubahan akaun (`AKAUN_*`).
- Google: Sheet > Fail > Sejarah versi; Apps Script > Executions (siapa/apa dijalankan); myaccount.google.com > Keselamatan.
- Tentukan: **data apa** (nama, telefon, emel, jadual...), **berapa guru**, **tempoh terdedah**, **siapa mungkin melihat**.

## Notifikasi (PDPA pindaan 2024)

| Kepada | Bila | Syarat |
|---|---|---|
| Pesuruhjaya PDP | Secepat mungkin, **tidak lewat 72 jam** (sumber berbeza sama ada dikira dari kebocoran berlaku atau ditemui; anggap yang lebih awal). Butiran tambahan boleh menyusul, tidak lewat 30 hari. | Jika kebocoran menyebabkan atau mungkin menyebabkan **kemudaratan ketara**, atau berskala besar (melebihi 1,000 subjek data). |
| Guru terlibat | Tanpa lengah, **tidak lewat 7 hari** selepas notifikasi kepada Pesuruhjaya. | Jika mungkin menyebabkan kemudaratan ketara. |
| Pengetua / pengurusan sekolah | Serta-merta | Sentiasa. Pihak sekolah ialah "data controller". |

Isi notifikasi kepada guru (ringkas, bahasa biasa): apa berlaku, data apa terlibat, apa sekolah sudah buat,
apa guru patut buat (contoh tukar kata laluan, berhati-hati dengan panggilan/mesej palsu), siapa dihubungi.

Untuk sekolah satu institusi (≈ 100 guru), kebanyakan insiden kecil (contoh satu fail eksport tersalah hantar
kepada seorang guru dan dipadam) tidak mencapai ambang Pesuruhjaya, tetapi **tetap direkod** dalam daftar di bawah.

## Daftar insiden (simpan sekurang-kurangnya 2 tahun)

Simpan dalam dokumen berasingan (bukan dalam Sheet sistem). Untuk setiap insiden:

| Tarikh ditemui | Diterangkan oleh | Data dan bilangan guru | Punca | Tindakan | Notifikasi (siapa, bila) | Ditutup |
|---|---|---|---|---|---|---|

## Selepas insiden

- Baiki punca (contoh cabut akses, latihan ringkas untuk pentadbir tentang fail eksport).
- Semak semula `docs/AUDIT-KESELAMATAN.md` bahagian E.
- Jika kata laluan terdedah: reset semua akaun terlibat dan minta guru tidak guna semula kata laluan itu di tempat lain.

## Pencegahan harian

- Fail eksport (CSV, JSON) disimpan dalam folder peribadi, bukan dihantar ke kumpulan. Padam selepas guna.
- Jangan kongsi kata laluan sementara dalam kumpulan WhatsApp.
- Log keluar pada komputer berkongsi (bilik guru, makmal).
- Pentadbir yang berhenti: nyahaktif akaun pada hari terakhir.
