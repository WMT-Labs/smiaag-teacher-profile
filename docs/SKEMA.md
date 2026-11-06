# Skema data

> Dijana automatik daripada `backend/Schema.gs` (`npm run skema-md`). Jangan edit di sini.

Setiap jadual ialah satu tab dalam Google Sheet. Ini juga asas skrip SQL untuk Supabase (Fasa 7).

## Jadual rujukan (ref_*)

### `ref_status_lantikan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_role`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_tahap_kelayakan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_jenis_opsyen`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_peringkat_kursus`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_kategori_subjek`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_jenis_tugasan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_kumpulan_tugasan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_jabatan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_hari`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_sumber_slot`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_jenis_unit`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_jawatan_unit`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_peringkat_pertandingan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_peranan_pertandingan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

### `ref_jenis_peranan_hem`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| kod | text | ya |  |  |
| label | text | ya |  |  |
| susunan | int [0..1000] | ya |  | 0 |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (kod)

## Jadual data

### `guru`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_kod | text | ya |  |  |
| nama_penuh | text | ya |  |  |
| status_lantikan | text | ya | ref → ref_status_lantikan |  |
| jawatan | text |  |  |  |
| tarikh_lantikan | date |  |  |  |
| no_telefon | text |  |  |  |
| tarikh_disahkan | date |  |  |  |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (guru_kod)

### `akaun`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| salt | text | ya |  |  |
| password_hash | text | ya |  |  |
| role | text | ya | ref → ref_role |  |
| wajib_tukar_password | bool | ya |  | true |
| percubaan_gagal | int [0..1000] | ya |  | 0 |
| persetujuan_pdpa_pada | datetime |  |  |  |
| aktif | bool | ya |  | true |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (guru_id)

### `sessions`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| token (PK) | uuid | ya |  |  |
| akaun_id | uuid | ya | FK → akaun |  |
| role | text | ya | ref → ref_role |  |
| expiry | datetime | ya |  |  |

### `kelayakan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| tahap | text | ya | ref → ref_tahap_kelayakan |  |
| bidang | text |  |  |  |
| institusi | text |  |  |  |
| tahun_tamat | year |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

### `opsyen_guru`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| jenis | text | ya | ref → ref_jenis_opsyen |  |
| subjek_id | uuid | ya | FK → subjek |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (guru_id, jenis, subjek_id)

### `kursus`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| tajuk | text | ya |  |  |
| penganjur | text |  |  |  |
| tarikh_mula | date |  |  |  |
| tarikh_tamat | date |  |  |  |
| jam | num [0..1000] |  |  |  |
| tahap | text | ya | ref → ref_peringkat_kursus |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

### `cerapan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| tahun_akademik | year | ya |  |  |
| bilangan_dicerap | int [0..50] | ya |  | 0 |
| pencerap | text |  |  |  |
| catatan | text |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (guru_id, tahun_akademik)

### `audit_log`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| masa | datetime | ya |  |  |
| akaun_id | uuid |  | FK → akaun |  |
| tindakan | text | ya |  |  |
| sasaran | text |  |  |  |
| butiran | text |  |  |  |

### `subjek`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| nama | text | ya |  |  |
| kod | text |  |  |  |
| kategori | text | ya | ref → ref_kategori_subjek | subjek |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (nama)

### `kelas`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| nama | text | ya |  |  |
| tingkatan | int [1..6] | ya |  |  |
| tahun_akademik | year | ya |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (nama, tahun_akademik)

### `tugasan_guru`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| tahun_akademik | year | ya |  |  |
| jenis_tugasan | text | ya | ref → ref_jenis_tugasan |  |
| kumpulan | text | ya | ref → ref_kumpulan_tugasan |  |
| nama_tugasan | text | ya |  |  |
| subjek_id | uuid |  | FK → subjek |  |
| bilangan_kelas | int [0..50] |  |  |  |
| jabatan | text |  | ref → ref_jabatan |  |
| jam_kredit | num [0..40] | ya |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

### `jadual_slot`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| tahun_akademik | year | ya |  |  |
| hari | text | ya | ref → ref_hari |  |
| masa_mula | time | ya |  |  |
| masa_akhir | time | ya |  |  |
| subjek_id | uuid |  | FK → subjek |  |
| label | text |  |  |  |
| tempoh | int [1..30] |  |  |  |
| sumber | text | ya | ref → ref_sumber_slot | manual |
| disahkan | bool | ya |  | false |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

### `jadual_slot_kelas`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| slot_id | uuid | ya | FK → jadual_slot |  |
| kelas_id | uuid | ya | FK → kelas |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (slot_id, kelas_id)

### `waktu`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| tahun_akademik | year | ya |  |  |
| nombor | int [1..30] | ya |  |  |
| masa_mula | time | ya |  |  |
| masa_akhir | time | ya |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (tahun_akademik, nombor)

### `had_jam_kredit`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| tahun_akademik | year | ya |  |  |
| had_berjadual | num [0..80] | ya |  | 22 |
| had_tidak_berjadual | num [0..80] | ya |  | 10 |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (tahun_akademik)

### `unit_kokurikulum`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| nama | text | ya |  |  |
| jenis | text | ya | ref → ref_jenis_unit |  |
| tahun_akademik | year | ya |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (nama, tahun_akademik)

### `keahlian_unit`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| unit_id | uuid | ya | FK → unit_kokurikulum |  |
| tahun_akademik | year | ya |  |  |
| jawatan | text | ya | ref → ref_jawatan_unit |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (guru_id, unit_id, tahun_akademik)

### `rumah_sukan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| nama | text | ya |  |  |
| warna | text |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (nama)

### `guru_rumah`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| rumah_sukan_id | uuid | ya | FK → rumah_sukan |  |
| tahun_akademik | year | ya |  |  |
| jawatan | text |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (guru_id, tahun_akademik)

### `juara_rumah_sukan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| tahun_akademik | year | ya |  |  |
| rumah_sukan_id | uuid | ya | FK → rumah_sukan |  |
| kedudukan | int [1..4] | ya |  |  |
| catatan | text |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (tahun_akademik, rumah_sukan_id), (tahun_akademik, kedudukan)

### `pertandingan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| nama_acara | text | ya |  |  |
| peringkat | text | ya | ref → ref_peringkat_pertandingan |  |
| tarikh | date |  |  |  |
| bilangan_murid | int [0..2000] |  |  |  |
| pencapaian | text |  |  |  |
| unit_id | uuid |  | FK → unit_kokurikulum |  |
| tahun_akademik | year | ya |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

### `penyertaan_pertandingan`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| pertandingan_id | uuid | ya | FK → pertandingan |  |
| guru_id | uuid | ya | FK → guru |  |
| peranan | text | ya | ref → ref_peranan_pertandingan |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (pertandingan_id, guru_id)

### `kumpulan_usrah_pelajar`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| tahun_akademik | year | ya |  |  |
| nama_kumpulan | text | ya |  |  |
| tingkatan | int [1..6] |  |  |  |
| hari | text |  | ref → ref_hari |  |
| bilangan_murid | int [0..500] |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

### `usrah_guru`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| tahun_akademik | year | ya |  |  |
| murabbi_guru_id | uuid | ya | FK → guru |  |
| nama_kumpulan | text | ya |  |  |
| hari | text |  | ref → ref_hari |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

### `keahlian_usrah_guru`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| usrah_guru_id | uuid | ya | FK → usrah_guru |  |
| guru_id | uuid | ya | FK → guru |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (usrah_guru_id, guru_id)

### `kehadiran_usrah_guru`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| usrah_guru_id | uuid | ya | FK → usrah_guru |  |
| guru_id | uuid | ya | FK → guru |  |
| tarikh | date | ya |  |  |
| hadir | bool | ya |  |  |
| catatan | text |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

Unik: (usrah_guru_id, guru_id, tarikh)

### `peranan_hem`

| Lajur | Jenis | Wajib | Rujukan | Lalai |
|---|---|---|---|---|
| id (PK) | uuid | ya |  |  |
| guru_id | uuid | ya | FK → guru |  |
| tahun_akademik | year | ya |  |  |
| jenis | text | ya | ref → ref_jenis_peranan_hem |  |
| kelas_id | uuid |  | FK → kelas |  |
| butiran | text |  |  |  |
| created_at | datetime |  |  |  |
| updated_at | datetime |  |  |  |
| updated_by | text |  |  |  |

## Nilai rujukan asal

- `ref_status_lantikan`: tetap, percubaan, kontrak, lain_lain
- `ref_role`: guru, pentadbir, superadmin
- `ref_tahap_kelayakan`: sijil, diploma, ijazah_sarjana_muda, ijazah_sarjana, doktor_falsafah, lain_lain
- `ref_jenis_opsyen`: major, minor
- `ref_peringkat_kursus`: sekolah, daerah, negeri, kebangsaan, lain_lain
- `ref_kategori_subjek`: subjek, al_quran_tutorial, lain
- `ref_jenis_tugasan`: berjadual, tidak_berjadual
- `ref_kumpulan_tugasan`: subjek, al_quran_tutorial, aktiviti_lain, tugasan_tidak_berjadual
- `ref_jabatan`: KURI, HEM, KOKU, lain_lain
- `ref_hari`: isnin, selasa, rabu, khamis, jumaat, sabtu, ahad
- `ref_sumber_slot`: asc, pdf, manual
- `ref_jenis_unit`: badan_beruniform, kelab_persatuan, pasukan_sekolah
- `ref_jawatan_unit`: penasihat, penyelaras, ajk, lain_lain
- `ref_peringkat_pertandingan`: sekolah, daerah, negeri, kebangsaan
- `ref_peranan_pertandingan`: pengurus, jurulatih, pengiring, lain_lain
- `ref_jenis_peranan_hem`: guru_tarbiah, guru_kelas, bidang_disiplin
