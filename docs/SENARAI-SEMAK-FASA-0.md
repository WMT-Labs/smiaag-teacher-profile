# Senarai semak manual: Fasa 0

Ikut mengikut urutan. Tandakan setiap satu. Jika ada yang gagal, catat apa yang anda nampak dan beritahu saya.

## 1. Pangkalan data
- [ ] Sheet dicipta dan **tidak dikongsi** (butang Share tiada nama lain, dan akses umum = Restricted).
- [ ] `setupTemplate` dijalankan tanpa ralat. Execution log menyenaraikan tab "Dicipta".
- [ ] Dalam Sheet ada 44 tab: 16 tab `ref_*` (hijau) dan 28 tab data (biru). Tab `Sheet1` kosong sudah hilang.
- [ ] Tab `ref_hari` mengandungi isnin hingga ahad. Tab `ref_role` mengandungi guru, pentadbir, superadmin.
- [ ] Tab `had_jam_kredit` ada satu baris: tahun semasa, 22, 10.
- [ ] Jalankan `setupTemplate` sekali lagi. Bilangan baris dalam `ref_hari` kekal 7 (tiada duplikat).
- [ ] Jalankan `verifySetup`. Log berkata `OK: 44 tab, semua lajur betul.` (bilangan terkini; bertambah mengikut fasa)
- [ ] Project Settings > Script Properties: ada `SS_ID` dan `PEPPER`. (Jangan salin nilai ini ke mana-mana.)

## 2. Backend
- [ ] Deploy sebagai Web App (Execute as: Me, Access: Anyone) dan URL `/exec` diperoleh.
- [ ] Buka URL itu terus dalam pelayar. Anda patut nampak `{"ok":false,"code":"KAEDAH_TIDAK_DIBENARKAN",...}` dan bukan data apa-apa.

## 3. Frontend
- [ ] `frontend/js/config.js` diisi dengan URL tadi dan laman diterbitkan.
- [ ] `index.html`: logo kelihatan, tekan "Log masuk" tanpa isi apa-apa memberi mesej "Masukkan ID guru anda".
- [ ] Isi ID dan kata laluan rawak, tekan Log masuk. Mesej: "Log masuk belum diaktifkan..." (bermakna frontend dan backend bersambung).
- [ ] Buka `pratonton.html` pada telefon. Menu (ikon tiga garis) membuka sidebar dan tiada skrol ke tepi.
- [ ] Warna dan logo sesuai dengan imej sekolah? Catat apa-apa yang anda mahu ubah (terutama warna biru dan hijau).

## 4. Ujian automatik (jika Node dipasang)
- [ ] `npm test` memaparkan `# fail 0`.
