# Catatan keputusan, andaian dan perkara untuk dibincangkan

Dikemas kini pada penghujung setiap fasa. Rujuk dokumen arahan projek (Seksyen 13 dan 14).

## Fasa 0: andaian yang saya buat

Semua ini kecil dan mudah diubah. Beritahu saya jika mahu lain.

1. **Jadual dalam dokumen yang tiada lajur `id`.** `sasaran_cerapan` dan `had_jam_kredit` saya beri `id` (UUID) supaya ikut peraturan "setiap tab ada id". `sasaran_cerapan` juga dapat lajur `guru_id`: kosong bermaksud nilai lalai sekolah, berisi bermaksud sasaran khusus guru itu. `sessions` menggunakan `token` sebagai kunci utama, seperti dalam dokumen.
2. **Lajur tambahan `akaun.persetujuan_pdpa_pada`.** Seksyen 9 mahu persetujuan guru direkod. Tanpa lajur ini tiada bukti bila guru bersetuju.
3. **Jadual `ref_*` yang saya tambah** selain yang dinyatakan jelas: `ref_tahap_kelayakan` (sijil hingga PhD), `ref_jenis_opsyen`, `ref_peringkat_kursus` (ada "lain-lain") dan `ref_peringkat_pertandingan` (tanpa "lain-lain", ikut dokumen), `ref_hari` (isnin hingga ahad). Kod nilai guna `snake_case`, jadi "al-quran-tutorial" menjadi `al_quran_tutorial`. Label paparan kekal cantik.
4. **Lajur nilai terhad menyimpan `kod`**, bukan id, supaya data di Sheet masih boleh dibaca manusia. Dalam Postgres ia menjadi kunci asing kepada `ref_*.kod`.
5. **Nilai null dalam kekangan unik dianggap sama.** Ini membolehkan hanya satu sasaran cerapan lalai sekolah bagi setiap tahun. Dalam Postgres: `UNIQUE NULLS NOT DISTINCT` (Supabase menyokongnya).
6. **Nombor IC dalam teks bebas dibuang senyap-senyap** semasa simpan, mengikut arahan "abaikan, jangan simpan". Corak: 12 digit dengan atau tanpa sempang (`YYMMDD-PB-####`). Nombor telefon tidak terkesan.
7. **Aksi tanpa token** (termasuk yang tidak wujud) semuanya dijawab `TIDAK_LOG_MASUK`, supaya orang luar tidak dapat meneka aksi yang ada. Saya sengaja tidak buat aksi `PING`, kerana dokumen mengatakan hanya `LOGIN` tanpa token.
8. **`dist/Code.gs`** ialah gabungan fail backend dalam satu fail, supaya anda tidak perlu salin-tampal tujuh fail. Ia dijana dan dijaga oleh ujian.
9. **Reka bentuk UI.** Warna logo tepat (`#00548d`, `#008c21`) hanya untuk jenama dan butang utama. Latar dan kad guna versi lembut. Semua gandingan warna teks melepasi nisbah kontras WCAG AA 4.5:1. Pada pratonton, status "hampir had" ditetapkan pada 80% had. Itu cadangan saya, bukan daripada dokumen, dan boleh diubah.

## Untuk dibincangkan sebelum Fasa 1 (keselamatan)

Seksyen 13 meminta saya bangkitkan terus jika sesuatu bercanggah dengan amalan lebih baik.

- **SHA-256 + salt sahaja agak lemah** terhadap tekaan pantas jika Sheet bocor, kerana SHA-256 sangat laju. Cadangan saya: kekal SHA-256 dengan salt dan pepper seperti dalam dokumen, tetapi ulang pengiraan beberapa ribu kali (key stretching). Ia masih mematuhi spesifikasi dan hanya menambah beberapa ratus milisaat semasa log masuk. Saya akan buat begini pada Fasa 1 melainkan awak tidak mahu.
- **Had percubaan login mengikut ID guru** bermaksud sesiapa yang tahu ID guru boleh sengaja mengunci akaun guru itu selama 5 minit. Apps Script tidak memberi alamat IP, jadi tidak dapat dihadkan mengikut IP. Saya cadangkan terima kos ini (ia hanya kacau, bukan bocor) dan pentadbir boleh buka kunci.
- **Peraturan kata laluan.** Cadangan: minimum 8 aksara, tidak boleh sama dengan ID guru. Setuju?

## Perkara belum diputuskan (Seksyen 14)

| Perkara | Diperlukan pada |
|---|---|
| Kaedah ekstrak PDF (Claude API atau OCR Drive) dan format PDF jadual sebenar | Fasa 3 |
| Adakah data isian guru perlu disahkan pentadbir (draf dan disahkan)? | Fasa 2 |
| Sasaran bilangan cerapan setahun | Fasa 2 |
| Tempoh simpanan data guru yang berpindah atau bersara | Fasa 1 dan 7 |
| Senarai tetap subjek, kelas, unit kokurikulum dan rumah sukan | Fasa 3 dan 4 |
