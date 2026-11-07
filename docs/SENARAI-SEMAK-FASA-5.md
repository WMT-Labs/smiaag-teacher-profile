# Senarai semak manual: Fasa 5 (HEM)

## 0. Kemas kini kod dan Sheet
- [ ] Tampal semula seluruh `dist/Code.gs`. Save.
- [ ] Tab `kehadiran_usrah_guru` berubah lajur (kini `sesi_id`). Jika tab itu masih kosong, padamkannya. Jika sudah ada data, beritahu saya dahulu.
- [ ] Jalankan `setupTemplate`: tab baharu `sesi_usrah_guru` dicipta. `verifySetup`: semua lajur betul.
- [ ] **Deploy > Manage deployments > edit > New version > Deploy.**

## 1. Pentadbir: kumpulan usrah guru
- [ ] Menu **Urus HEM > Kumpulan baharu**: nama, murabbi, hari.
- [ ] **Ahli**: tandakan guru. Guru yang sudah dalam kumpulan lain tidak disenaraikan.
- [ ] Kad "Guru tanpa kumpulan usrah" berkurang. Senarai di bawah kad kumpulan menunjukkan siapa yang belum.

## 2. Murabbi: rekod kehadiran (guna telefon)
- [ ] Log masuk sebagai murabbi. Menu **HEM > Kumpulan yang saya bimbing > Rekod kehadiran**.
- [ ] **Sesi baharu**: tarikh sesi, tajuk, buang tanda bagi yang tidak hadir dan isi sebab. Simpan.
- [ ] Rekod satu lagi sesi dengan tarikh yang sama: mesej "sudah direkod".
- [ ] Tarikh masa depan tidak boleh dipilih.
- [ ] Tekan tarikh dalam jadual kehadiran untuk sunting atau padam sesi.

## 3. Ahli
- [ ] Log masuk sebagai ahli. **HEM > Usrah guru**: nama kumpulan, murabbi, peratus hadir dan senarai sesi sendiri (✓/✗ dan sebab).
- [ ] Buka halaman kehadiran kumpulan: hanya baris sendiri, tiada butang Sesi baharu.

## 4. Guru: usrah pelajar dan peranan HEM
- [ ] **Usrah murabbi pelajar > Tambah**: nama kumpulan, tingkatan, hari, bilangan murid.
- [ ] **Guru Tarbiah, Guru Kelas, Disiplin > Tambah**: Guru Tarbiah. Tambah Guru Tarbiah lagi: ditolak (satu setahun).
- [ ] Guru Kelas tanpa kelas: ditolak. Dengan kelas: berjaya.
- [ ] Dalam Sheet: Guru Tarbiah dalam tab `peranan_hem`, usrah pelajar dalam tab `kumpulan_usrah_pelajar` (berasingan).

## 5. Ringkasan pentadbir
- [ ] **Urus HEM**: bilangan Guru Tarbiah, kelas tanpa guru kelas, jumlah murid usrah.

## 6. Sekatan akses
- [ ] Ahli atau pentadbir cuba merekod sesi (melalui API): ditolak. Hanya murabbi.
- [ ] Guru bukan ahli membuka `usrah-sesi.html?id=...`: "Anda bukan ahli kumpulan ini".

## 7. Ujian automatik
- [ ] `npm test` memaparkan `# fail 0`.
