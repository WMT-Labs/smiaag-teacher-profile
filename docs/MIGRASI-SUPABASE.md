# Rancangan migrasi ke Supabase

> Status: **rancangan + skrip SQL siap; migrasi belum dibuat.** Buat bila kelajuan Apps Script (2–3 s setiap
> halaman) tidak lagi memadai, atau bilangan guru/data membesar. Jangkaan selepas migrasi: bawah 1 s.

## Ringkasan

| Perkara | Sekarang (Google) | Selepas (Supabase) |
|---|---|---|
| Pangkalan data | Google Sheets | PostgreSQL (`docs/supabase/schema.sql`, dijana daripada `Schema.gs`) |
| Kawalan akses | `requireAuth` + `getActions()` dalam Apps Script | **Row Level Security (RLS)** dalam pangkalan data + fungsi pelayan untuk tindakan sensitif |
| Log masuk | `akaun` + `sessions` + SHA-256 buatan sendiri | **Supabase Auth** (bcrypt, had cubaan, reset melalui emel) |
| Frontend | Netlify, `Api.call(aksi, params)` | Sama. Hanya `js/api.js` diganti dengan penyesuai Supabase |
| Kunci di frontend | URL Web App | URL projek + kunci **`anon`** sahaja. Kunci `service_role` TIDAK SEKALI-KALI di frontend |

Prinsip yang sama seperti `Repository.gs`: halaman tidak perlu tahu data disimpan di mana. Kebanyakan halaman tidak berubah.

## Fail yang sudah disediakan

- `docs/supabase/schema.sql`: semua jadual (jenis, wajib, julat, unik, FK, indeks), nilai rujukan, fungsi
  `app_guru_id()` / `app_role()` / `app_is_admin()`, RLS pada SEMUA jadual dan dasar setiap jadual.
  Jana semula dengan `npm run sql` selepas mengubah `Schema.gs` (ujian gagal jika terlupa, atau jika jadual baharu tiada dasar RLS).
- `docs/supabase/ujian-rls.sql`: ujian asap RLS untuk PostgreSQL tempatan. Sudah dijalankan (PostgreSQL 16):
  46 jadual, 84 dasar, semua jadual ada RLS. Guru hanya nampak data sendiri, tidak boleh menulis tugasan atau
  data rujukan, dan pengguna Auth tanpa akaun aktif tidak nampak apa-apa.

Perbezaan skema yang disengajakan:
- `sessions` tidak dipindah (Supabase Auth). `akaun.salt`, `password_hash`, `percubaan_gagal` dibuang;
  `akaun.auth_user_id` ditambah (pautan ke `auth.users`).
- `tahun_akademik` kekal teks 4 digit (supaya API sama). Tarikh = `date`, masa+tarikh = `timestamptz`.
- FK pilihan `on delete set null` (contoh `audit_log.akaun_id` bila akaun dipadam atas permintaan PDPA).
- Guru lain dilihat melalui view `guru_awam` (nama sahaja, tanpa telefon/emel).

## Langkah migrasi

### 1. Sediakan projek (pemilik, ±30 minit)
1. Daftar di supabase.com, cipta projek. **Region: Southeast Asia (Singapore)**, paling hampir dengan Malaysia
   (masih rentas sempadan; notis privasi sudah menyatakannya).
2. Authentication > Providers > Email: **matikan "Allow new users to sign up"** (hanya superadmin mencipta akaun).
3. Authentication > URL Configuration: isi alamat laman Netlify.
4. SQL Editor: tampal dan jalankan `docs/supabase/schema.sql`.
5. Semak harga dan had pelan percuma semasa (pelan percuma boleh dijeda jika lama tidak digunakan; sahkan di laman Supabase).

### 2. Fungsi pelayan untuk tindakan sensitif (pembangun)
RLS menjaga baca/tulis biasa. Tindakan berikut perlu fungsi pelayan (Postgres `security definer` RPC atau Edge
Function) kerana melibatkan beberapa jadual, peraturan perniagaan atau kunci `service_role`:

| Aksi sekarang | Pelaksanaan Supabase |
|---|---|
| `AKAUN_CIPTA`, `AKAUN_RESET_PASSWORD`, `AKAUN_SET_AKTIF`, `AKAUN_TUKAR_ROLE` | Edge Function (Auth Admin API: cipta pengguna + jemputan emel; nyahaktif = `ban`) |
| `PDPA_PADAM`, `PDPA_EKSPORT` | RPC (logik sama seperti `Pdpa.gs`; senarai jadual yang sama) |
| `JADUAL_IMPORT`, `TUGASAN_IMPORT`, `JUARA_IMPORT` | RPC dalam satu transaksi (ganti `replaceWhere`) |
| `GANTI_TETAP`, `GANTI_BATAL`, `PERCUBAAN_SAHKAN`, `RUMAH_AHLI_SIMPAN` | RPC (semak peranan + kekangan) |
| Lajur terhad dalam `guru` (`aktif`, `akaun_sistem`, `tarikh_disahkan`) | `revoke update` pada lajur itu untuk `authenticated`; ubah melalui RPC |
| `BACA_TELEFON_PENUH` (dengan audit) | RPC yang memulangkan telefon + menulis `audit_log` |
| `audit_log` | Ditulis oleh RPC/Edge Function sahaja (tiada dasar insert untuk pengguna) |
| `DASHBOARD` | View atau RPC (satu pertanyaan SQL, jauh lebih laju) |
| `penyelenggaraanHarian`, `panaskanCache` | `pg_cron` untuk pembersihan; cache tidak diperlukan |

### 3. Pindah data (pemilik + pembangun, satu petang)
1. Umumkan waktu henti. Jalankan `logKeluarSemua` dan jangan benarkan perubahan semasa migrasi.
2. Eksport setiap tab sebagai CSV. **Nota:** tarikh dalam Sheet kini nilai tarikh dengan format `dd-mm-yyyy`;
   CSV akan mengikut format paparan itu. Sediakan skrip penukaran ke ISO (`yyyy-mm-dd`, `...T08:15:00+08:00`)
   sebelum import, atau tukar format lajur tarikh ke ISO pada salinan Sheet. (Skrip eksport ISO akan dibina semasa migrasi.)
3. Import ikut urutan dalam `schema.sql` (ref dahulu, kemudian `guru`, `akaun`, ...). Table Editor > Import CSV.
   Langkau `sessions`; buang lajur `salt`, `password_hash`, `percubaan_gagal` daripada CSV `akaun`.
4. Semak bilangan baris setiap jadual sama dengan Sheet.

### 4. Akaun pengguna
- Kata laluan **tidak boleh dipindah** (format hash berbeza). Setiap guru menerima emel jemputan/tetapan kata
  laluan daripada Supabase. Sebab itu emel guru (item 2) perlu lengkap sebelum migrasi: Urus akaun menunjukkan
  lencana "Tiada emel".
- Edge Function mencipta pengguna Auth bagi setiap `akaun` aktif dan mengisi `akaun.auth_user_id`.
- Persetujuan PDPA kekal (lajur `persetujuan_pdpa_pada` dipindah).

### 5. Frontend
1. Simpan `supabase-js` dalam `frontend/vendor/` (hos sendiri, versi tetap).
2. Ganti `js/api.js` dengan penyesuai: `Api.call(aksi, params)` memanggil pertanyaan Supabase atau RPC yang
   sepadan. Halaman lain tidak berubah.
3. `js/config.js`: URL projek + kunci `anon`.
4. `frontend/_headers`: tukar `connect-src` kepada `https://<projek>.supabase.co` (buang Google).

### 6. Uji dan tukar
1. Jalankan semula `docs/PANDUAN-UJIAN.md` dengan akaun ujian.
2. Ujian RLS dalam projek sebenar: log masuk sebagai guru, cuba baca jadual guru lain melalui konsol pelayar
   (mesti kosong). Supabase > Advisors > Security: tiada amaran kritikal.
3. Tukar Netlify ke versi Supabase. Simpan Sheet lama sebagai baca sahaja selama 30 hari, kemudian padam
   (selaras dengan tempoh simpanan dalam notis privasi).

## Risiko dan cara kawal

| Risiko | Kawalan |
|---|---|
| Dasar RLS tertinggal untuk jadual baharu | Penjana SQL gagal jika jadual tiada dasar; ujian menyemak tiada `using (true)` |
| Kunci `service_role` bocor | Hanya dalam Edge Function (rahsia Supabase), tidak dalam repo atau frontend |
| Peraturan dalam Apps Script terlepas | Senarai aksi dalam `getActions()` ialah senarai semak: setiap aksi mesti ada padanan (RLS atau RPC) |
| Data tarikh rosak semasa import | Semak bilangan baris dan beberapa rekod rawak sebelum tukar |
