# Senarai semak manual: Fasa 1 (Auth)

Ikut mengikut urutan. Jika ada yang gagal, catat apa yang anda nampak dan beritahu saya.

## 0. Kemas kini kod di Apps Script
- [ ] Tampal semula seluruh isi `dist/Code.gs` ke `Code.gs` dalam editor Apps Script. Save.
- [ ] Jika anda sudah menjalankan `setupTemplate` pada Fasa 0: tab `cerapan` kini lebih ringkas dan tab `sasaran_cerapan` serta `ref_status_cerapan` tidak digunakan lagi. Padam ketiga-tiga tab itu (masih kosong), kemudian jalankan `setupTemplate` semula.
- [ ] Jalankan `verifySetup`. Log: `OK: 41 tab, semua lajur betul.`
- [ ] **Deploy > Manage deployments > edit > Version: New version > Deploy.** (Tanpa langkah ini Web App masih guna kod lama.)

## 1. Superadmin pertama
- [ ] Tambah Script Properties `BOOTSTRAP_GURU_KOD` dan `BOOTSTRAP_NAMA`, jalankan `ciptaSuperadminPertama`.
- [ ] Execution log memaparkan kata laluan sementara. Script Properties kini tiada lagi dua nilai BOOTSTRAP.
- [ ] Jalankan `ciptaSuperadminPertama` sekali lagi. Ia patut menolak ("Superadmin sudah wujud").

## 2. Log masuk pertama (telefon dan komputer)
- [ ] Log masuk dengan ID (huruf kecil pun boleh) dan kata laluan sementara. Anda dibawa ke **Notis privasi**.
- [ ] Tekan "Setuju dan teruskan" tanpa tanda kotak: mesej meminta anda tandakan.
- [ ] Tandakan, teruskan. Anda dibawa ke **Tetapkan kata laluan baharu**.
- [ ] Cuba kata laluan sama dengan ID guru: ditolak. Cuba 7 aksara: ditolak.
- [ ] Tetapkan kata laluan yang sah. Anda tiba di **Laman utama**.
- [ ] Dalam Sheet tab `akaun`: `password_hash` bermula dengan `v1$1000$`, tiada kata laluan sebenar di mana-mana. `persetujuan_pdpa_pada` berisi tarikh.

## 3. Urus akaun (sebagai superadmin)
- [ ] Menu **Urus akaun**: tekan **Tambah akaun**, cipta akaun guru contoh (contoh ID `UJI01`, nama "Guru Ujian"). Kata laluan sementara dipaparkan sekali.
- [ ] Cuba cipta lagi dengan ID yang sama: mesej "sudah wujud".
- [ ] Buka tetingkap inkognito, log masuk sebagai `UJI01`. Selesaikan notis privasi dan tukar kata laluan.
- [ ] Sebagai guru: menu tiada "Urus akaun". Taip `akaun.html` pada alamat: dihantar balik ke Laman utama.
- [ ] Kembali ke superadmin: **Reset kata laluan** UJI01. Tetingkap inkognito: muat semula halaman, anda dilog keluar.
- [ ] **Nyahaktif** UJI01. Cuba log masuk sebagai UJI01: "Akaun anda tidak aktif". Rekod masih ada dalam Sheet.
- [ ] **Aktifkan** semula. Tukar peranan UJI01 kepada Pentadbir. Log masuk semula sebagai UJI01: menu "Urus akaun" kini muncul, tetapi tiada butang Tambah akaun atau Reset.
- [ ] Cuba nyahaktif atau tukar peranan akaun anda sendiri: tiada pilihan itu pada baris anda.

## 4. Had percubaan
- [ ] Log masuk sebagai UJI01 dengan kata laluan salah 8 kali. Percubaan ke-9 (walaupun kata laluan betul): "Terlalu banyak percubaan... 5 minit".
- [ ] Di Urus akaun, baris UJI01 menunjukkan **Dikunci**. Tekan **Buka kunci**, kemudian log masuk berjaya.

## 5. Sesi
- [ ] Tekan **Log keluar**. Tekan butang Back pelayar: anda tidak masuk semula ke halaman dalam.
- [ ] Dalam tab `sessions`, token sesi tadi sudah tiada.
- [ ] Tab `audit_log` mengandungi LOGIN_BERJAYA, LOGIN_GAGAL, AKAUN_CIPTA, SETUJU_PDPA, TUKAR_PASSWORD dan lain-lain.

## 6. Kelajuan
- [ ] Log masuk mengambil masa berapa saat? Jika lebih kira-kira 4 saat, beritahu saya. Saya boleh kurangkan `HASH_ITERATIONS`.

## 7. Ujian automatik (jika Node dipasang)
- [ ] `npm test` memaparkan `# fail 0`.
