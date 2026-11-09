# Senarai semak Fasa 7 (untuk pemilik)

Gunakan nama palsu untuk akaun ujian (contoh "Guru Ujian Tiga"). Anggaran masa: 30–40 minit.

## A. Kemas kini Sheet ujian

1. Apps Script: tampal `dist/Code.gs` baharu (`appsscript.json` tidak berubah).
2. Jalankan `setupTemplate`. Jangkaan dalam log:
   - lajur `dinyahaktif_pada` ditambah dalam tab `guru`;
   - "Pencetus: cache setiap jam sudah wujud; penyelenggaraan harian (3 pagi) dipasang."
   Benarkan jika Google minta kebenaran.
3. Deploy > Manage deployments > Edit > Version: New version > Deploy.
4. Netlify: muat naik semula folder `frontend` ke Deploys site yang sama (isi semula `API_URL` dalam `js/config.js`).
   **Pastikan fail `_headers` ada dalam folder `frontend`** (nama bermula dengan garis bawah, bukan fail tersembunyi).

## B. Header keselamatan

5. Buka laman Netlify > tekan F12 > tab Network > muat semula > klik baris pertama (`index.html` atau `/`).
   Di Response Headers mesti ada `content-security-policy`. Jika tiada, `_headers` tidak dimuat naik.
6. Log masuk dan buka setiap menu (Profil, Kurikulum, Koku, HEM, Dashboard, Guru ganti, Urus akaun).
   Tab Console (F12) tidak patut ada ralat merah "Content Security Policy". Jika ada, ambil tangkapan skrin.

## C. Muat turun data sendiri (guru)

7. Log masuk sebagai guru ujian. Profil > bahagian bawah "Data peribadi (PDPA)" > **Muat turun data saya**.
8. Fail `data-peribadi-<ID>-<tarikh>.json` dimuat turun. Buka dengan Notepad: ada nama, kursus, jadual dan
   sebagainya, dan **tiada** `password_hash` atau `salt`.
9. Notis privasi (privasi.html) kini menyebut "disimpan selama 2 tahun" dan butang muat turun.

## D. Tempoh simpanan dan padam data (superadmin, guna ADMIN01)

10. Urus akaun > nyahaktif guru ujian. Lencana "Simpan hingga dd/mm/yyyy" (2 tahun dari hari ini) muncul.
    Butang "Eksport data" dan "Padam data" muncul pada baris itu.
11. Bahagian "Tempoh simpanan data (PDPA)" di bawah: "Tiada data yang melepasi tempoh simpanan..." (guru baru dinyahaktif).
12. **Ujian tempoh tamat** (pilihan): dalam Sheet tab `guru`, tukar `dinyahaktif_pada` guru ujian itu kepada
    tarikh lebih 2 tahun lalu: taip `2024-01-01 08:00` (Sheets akan memaparkannya sebagai `01-01-2024, 08.00`). Jalankan `segarkanCache` dalam Apps Script.
    Muat semula Urus akaun: guru itu muncul dalam senarai dengan butang Eksport dan Padam kekal; lencana "Layak dipadam".
13. Tekan **Padam kekal**, taip ID yang salah > mesej ralat. Taip ID yang betul > "Data ... telah dipadam".
14. Sheet: tab `akaun` tiada lagi baris guru itu; tab `guru` baris itu bernama "Guru dipadam" dengan ID `PADAM-...`;
    kursus/kelayakan guru itu hilang; data guru lain tidak berubah.
15. Guru aktif tidak boleh dipadam (butang tidak muncul; API menolak).

## E. Kecemasan: log keluar semua

16. Log masuk sebagai guru ujian dalam tetingkap inkognito.
17. Apps Script editor > pilih fungsi `logKeluarSemua` > Run.
18. Tetingkap inkognito: tekan mana-mana menu > dibawa ke halaman log masuk. Anda sendiri juga perlu log masuk semula.
19. Tab `audit_log`: ada baris `LOG_KELUAR_SEMUA`.

## F. Baca dokumen

20. `docs/AUDIT-KESELAMATAN.md` bahagian E (tindakan pemilik): semak perkongsian Sheet, editor Apps Script, 2FA akaun Google.
21. `docs/PELAN-KEBOCORAN-DATA.md`: simpan salinan bersama nombor telefon Pengetua.
22. `docs/MIGRASI-SUPABASE.md`: untuk rujukan masa depan; tiada tindakan sekarang.

Laporkan nombor langkah yang gagal berserta tangkapan skrin (tanpa data guru sebenar).
