-- Skema Supabase (PostgreSQL) untuk Sistem Profil Guru SMIAAG.
-- DIJANA daripada backend/Schema.gs oleh `npm run sql`. Jangan edit secara manual.
-- Jalankan dalam Supabase > SQL Editor pada projek BAHARU. Lihat docs/MIGRASI-SUPABASE.md.

create extension if not exists pgcrypto;

create table ref_status_lantikan (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_role (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_tahap_kelayakan (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_jenis_opsyen (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_peringkat_kursus (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_kategori_subjek (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_jenis_tugasan (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_kumpulan_tugasan (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_jabatan (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_hari (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_sumber_slot (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_jenis_ketidakhadiran (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_jenis_unit (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_jawatan_unit (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_peringkat_pertandingan (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_peranan_pertandingan (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table ref_jenis_peranan_hem (
  id uuid primary key default gen_random_uuid(),
  kod text not null check (char_length(kod) <= 200),
  label text not null check (char_length(label) <= 200),
  susunan integer not null default 0 check (susunan between 0 and 1000),
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (kod)
);

create table guru (
  id uuid primary key default gen_random_uuid(),
  guru_kod text not null check (char_length(guru_kod) <= 200),
  nama_penuh text not null check (char_length(nama_penuh) <= 200),
  nama_panggilan text check (char_length(nama_panggilan) <= 200),
  status_lantikan text not null references ref_status_lantikan(kod) on update cascade,
  jawatan text check (char_length(jawatan) <= 200),
  tarikh_lantikan date,
  tarikh_tamat_praktikal date,
  no_telefon text check (char_length(no_telefon) <= 200),
  email text check (char_length(email) <= 200),
  tarikh_disahkan date,
  akaun_sistem boolean not null default false,
  aktif boolean not null default true,
  dinyahaktif_pada timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (guru_kod)
);

create table akaun (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  role text not null references ref_role(kod) on update cascade,
  wajib_tukar_password boolean not null default true,
  persetujuan_pdpa_pada timestamptz,
  aktif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  unique (guru_id)
);

create table kelayakan (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  tahap text not null references ref_tahap_kelayakan(kod) on update cascade,
  bidang text check (char_length(bidang) <= 200),
  institusi text check (char_length(institusi) <= 200),
  tahun_tamat text check (tahun_tamat ~ '^[0-9]{4}$'),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200)
);

create table subjek (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(nama) <= 200),
  kod text check (char_length(kod) <= 200),
  kategori text not null default 'subjek' references ref_kategori_subjek(kod) on update cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (nama)
);

create table opsyen_guru (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  jenis text not null references ref_jenis_opsyen(kod) on update cascade,
  subjek_id uuid not null references subjek(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (guru_id, jenis, subjek_id)
);

create table kursus (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  tajuk text not null check (char_length(tajuk) <= 200),
  penganjur text check (char_length(penganjur) <= 200),
  tarikh_mula date,
  tarikh_tamat date,
  jam numeric check (jam between 0 and 1000),
  tahap text not null references ref_peringkat_kursus(kod) on update cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200)
);

create table cerapan (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  bilangan_dicerap integer not null default 0 check (bilangan_dicerap between 0 and 50),
  pencerap text check (char_length(pencerap) <= 200),
  catatan text check (char_length(catatan) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (guru_id, tahun_akademik)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  masa timestamptz not null,
  akaun_id uuid references akaun(id) on delete set null,
  tindakan text not null check (char_length(tindakan) <= 200),
  sasaran text check (char_length(sasaran) <= 200),
  butiran text check (char_length(butiran) <= 1000)
);

create table kelas (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(nama) <= 200),
  tingkatan integer not null check (tingkatan between 1 and 6),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (nama, tahun_akademik)
);

create table tugasan_guru (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  jenis_tugasan text not null references ref_jenis_tugasan(kod) on update cascade,
  kumpulan text not null references ref_kumpulan_tugasan(kod) on update cascade,
  nama_tugasan text not null check (char_length(nama_tugasan) <= 200),
  subjek_id uuid references subjek(id) on delete set null,
  bilangan_kelas integer check (bilangan_kelas between 0 and 50),
  jabatan text references ref_jabatan(kod) on update cascade,
  jam_kredit numeric not null check (jam_kredit between 0 and 40),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200)
);

create table jadual_slot (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  hari text not null references ref_hari(kod) on update cascade,
  masa_mula time not null,
  masa_akhir time not null,
  subjek_id uuid references subjek(id) on delete set null,
  label text check (char_length(label) <= 200),
  tempoh integer check (tempoh between 1 and 30),
  sumber text not null default 'manual' references ref_sumber_slot(kod) on update cascade,
  disahkan boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200)
);

create table jadual_slot_kelas (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references jadual_slot(id),
  kelas_id uuid not null references kelas(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (slot_id, kelas_id)
);

create table warna_jadual (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  kunci text not null check (char_length(kunci) <= 200),
  warna text not null check (char_length(warna) <= 200),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (guru_id, kunci)
);

create table ketidakhadiran_guru (
  id uuid primary key default gen_random_uuid(),
  tarikh date not null,
  guru_id uuid not null references guru(id),
  sebab text check (char_length(sebab) <= 200),
  jenis text not null default 'lain_lain' references ref_jenis_ketidakhadiran(kod) on update cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (tarikh, guru_id)
);

create table guru_ganti (
  id uuid primary key default gen_random_uuid(),
  ketidakhadiran_id uuid not null references ketidakhadiran_guru(id),
  slot_id uuid references jadual_slot(id) on delete set null,
  masa_mula time not null,
  masa_akhir time not null,
  subjek text check (char_length(subjek) <= 200),
  kelas text check (char_length(kelas) <= 200),
  guru_ganti_id uuid not null references guru(id),
  catatan text check (char_length(catatan) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (ketidakhadiran_id, slot_id)
);

create table waktu (
  id uuid primary key default gen_random_uuid(),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  nombor integer not null check (nombor between 1 and 30),
  masa_mula time not null,
  masa_akhir time not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (tahun_akademik, nombor)
);

create table had_jam_kredit (
  id uuid primary key default gen_random_uuid(),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  had_berjadual numeric not null default 22 check (had_berjadual between 0 and 80),
  had_tidak_berjadual numeric not null default 10 check (had_tidak_berjadual between 0 and 80),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (tahun_akademik)
);

create table unit_kokurikulum (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(nama) <= 200),
  jenis text not null references ref_jenis_unit(kod) on update cascade,
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (nama, tahun_akademik)
);

create table keahlian_unit (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  unit_id uuid not null references unit_kokurikulum(id),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  jawatan text not null references ref_jawatan_unit(kod) on update cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (guru_id, unit_id, tahun_akademik)
);

create table rumah_sukan (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(nama) <= 200),
  warna text check (char_length(warna) <= 200),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (nama)
);

create table guru_rumah (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  rumah_sukan_id uuid not null references rumah_sukan(id),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  jawatan text check (char_length(jawatan) <= 200),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (guru_id, tahun_akademik)
);

create table juara_rumah_sukan (
  id uuid primary key default gen_random_uuid(),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  rumah_sukan_id uuid not null references rumah_sukan(id),
  kedudukan integer not null check (kedudukan between 1 and 4),
  catatan text check (char_length(catatan) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (tahun_akademik, rumah_sukan_id),
  unique (tahun_akademik, kedudukan)
);

create table pertandingan (
  id uuid primary key default gen_random_uuid(),
  nama_acara text not null check (char_length(nama_acara) <= 200),
  peringkat text not null references ref_peringkat_pertandingan(kod) on update cascade,
  tarikh date,
  bilangan_murid integer check (bilangan_murid between 0 and 2000),
  pencapaian text check (char_length(pencapaian) <= 1000),
  unit_id uuid references unit_kokurikulum(id) on delete set null,
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200)
);

create table penyertaan_pertandingan (
  id uuid primary key default gen_random_uuid(),
  pertandingan_id uuid not null references pertandingan(id),
  guru_id uuid not null references guru(id),
  peranan text not null references ref_peranan_pertandingan(kod) on update cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (pertandingan_id, guru_id)
);

create table kumpulan_usrah_pelajar (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  nama_kumpulan text not null check (char_length(nama_kumpulan) <= 200),
  tingkatan integer check (tingkatan between 1 and 6),
  hari text references ref_hari(kod) on update cascade,
  bilangan_murid integer check (bilangan_murid between 0 and 500),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200)
);

create table usrah_guru (
  id uuid primary key default gen_random_uuid(),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  murabbi_guru_id uuid not null references guru(id),
  nama_kumpulan text not null check (char_length(nama_kumpulan) <= 200),
  hari text references ref_hari(kod) on update cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (tahun_akademik, nama_kumpulan)
);

create table keahlian_usrah_guru (
  id uuid primary key default gen_random_uuid(),
  usrah_guru_id uuid not null references usrah_guru(id),
  guru_id uuid not null references guru(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (usrah_guru_id, guru_id)
);

create table sesi_usrah_guru (
  id uuid primary key default gen_random_uuid(),
  usrah_guru_id uuid not null references usrah_guru(id),
  tarikh date not null,
  tajuk text check (char_length(tajuk) <= 200),
  catatan text check (char_length(catatan) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (usrah_guru_id, tarikh)
);

create table kehadiran_usrah_guru (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references sesi_usrah_guru(id),
  guru_id uuid not null references guru(id),
  hadir boolean not null,
  catatan text check (char_length(catatan) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (sesi_id, guru_id)
);

create table peranan_hem (
  id uuid primary key default gen_random_uuid(),
  guru_id uuid not null references guru(id),
  tahun_akademik text not null check (tahun_akademik ~ '^[0-9]{4}$'),
  jenis text not null references ref_jenis_peranan_hem(kod) on update cascade,
  kelas_id uuid references kelas(id) on delete set null,
  butiran text check (char_length(butiran) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by text check (char_length(updated_by) <= 200),
  unique (guru_id, tahun_akademik, jenis, kelas_id)
);

create index on akaun (guru_id);
create index on kelayakan (guru_id);
create index on opsyen_guru (guru_id);
create index on opsyen_guru (subjek_id);
create index on kursus (guru_id);
create index on cerapan (guru_id);
create index on audit_log (akaun_id);
create index on tugasan_guru (guru_id);
create index on tugasan_guru (subjek_id);
create index on jadual_slot (guru_id);
create index on jadual_slot (subjek_id);
create index on jadual_slot_kelas (slot_id);
create index on jadual_slot_kelas (kelas_id);
create index on warna_jadual (guru_id);
create index on ketidakhadiran_guru (guru_id);
create index on guru_ganti (ketidakhadiran_id);
create index on guru_ganti (slot_id);
create index on guru_ganti (guru_ganti_id);
create index on keahlian_unit (guru_id);
create index on keahlian_unit (unit_id);
create index on guru_rumah (guru_id);
create index on guru_rumah (rumah_sukan_id);
create index on juara_rumah_sukan (rumah_sukan_id);
create index on pertandingan (unit_id);
create index on penyertaan_pertandingan (pertandingan_id);
create index on penyertaan_pertandingan (guru_id);
create index on kumpulan_usrah_pelajar (guru_id);
create index on usrah_guru (murabbi_guru_id);
create index on keahlian_usrah_guru (usrah_guru_id);
create index on keahlian_usrah_guru (guru_id);
create index on sesi_usrah_guru (usrah_guru_id);
create index on kehadiran_usrah_guru (sesi_id);
create index on kehadiran_usrah_guru (guru_id);
create index on peranan_hem (guru_id);
create index on peranan_hem (kelas_id);

-- Nilai rujukan asal
insert into ref_status_lantikan (kod, label, susunan) values ('tetap', 'Tetap', 1), ('percubaan', 'Percubaan', 2), ('praktikal', 'Praktikal', 3), ('lain_lain', 'Lain-lain', 4);
insert into ref_role (kod, label, susunan) values ('guru', 'Guru', 1), ('pentadbir', 'Pentadbir', 2), ('superadmin', 'Superadmin', 3);
insert into ref_tahap_kelayakan (kod, label, susunan) values ('sijil', 'Sijil', 1), ('diploma', 'Diploma', 2), ('ijazah_sarjana_muda', 'Ijazah Sarjana Muda', 3), ('ijazah_sarjana', 'Ijazah Sarjana', 4), ('doktor_falsafah', 'Doktor Falsafah', 5), ('lain_lain', 'Lain-lain', 6);
insert into ref_jenis_opsyen (kod, label, susunan) values ('major', 'Major', 1), ('minor', 'Minor', 2);
insert into ref_peringkat_kursus (kod, label, susunan) values ('sekolah', 'Sekolah', 1), ('daerah', 'Daerah', 2), ('negeri', 'Negeri', 3), ('kebangsaan', 'Kebangsaan', 4), ('lain_lain', 'Lain-lain', 5);
insert into ref_kategori_subjek (kod, label, susunan) values ('subjek', 'Subjek', 1), ('al_quran_tutorial', 'Al-Quran / Tutorial', 2), ('lain', 'Lain', 3);
insert into ref_jenis_tugasan (kod, label, susunan) values ('berjadual', 'Berjadual', 1), ('tidak_berjadual', 'Tidak berjadual', 2);
insert into ref_kumpulan_tugasan (kod, label, susunan) values ('subjek', 'Subjek', 1), ('al_quran_tutorial', 'Al-Quran / Tutorial', 2), ('aktiviti_lain', 'Aktiviti lain', 3), ('tugasan_tidak_berjadual', 'Tugasan tidak berjadual', 4);
insert into ref_jabatan (kod, label, susunan) values ('KURI', 'Kurikulum', 1), ('HEM', 'Hal Ehwal Murid', 2), ('KOKU', 'Kokurikulum', 3), ('lain_lain', 'Lain-lain', 4);
insert into ref_hari (kod, label, susunan) values ('isnin', 'Isnin', 1), ('selasa', 'Selasa', 2), ('rabu', 'Rabu', 3), ('khamis', 'Khamis', 4), ('jumaat', 'Jumaat', 5), ('sabtu', 'Sabtu', 6), ('ahad', 'Ahad', 7);
insert into ref_sumber_slot (kod, label, susunan) values ('asc', 'Import aSc', 1), ('pdf', 'Import PDF', 2), ('manual', 'Manual', 3);
insert into ref_jenis_ketidakhadiran (kod, label, susunan) values ('cuti_tahunan', 'Cuti tahunan', 1), ('cuti_sakit', 'Cuti sakit', 2), ('kursus', 'Kursus', 3), ('program', 'Program', 4), ('cuti_tanpa_gaji', 'Cuti tanpa gaji', 5), ('cuti_ehsan', 'Cuti ehsan', 6), ('lain_lain', 'Lain-lain', 7);
insert into ref_jenis_unit (kod, label, susunan) values ('badan_beruniform', 'Badan beruniform (Syabab)', 1), ('kelab_persatuan', 'Kelab / persatuan', 2), ('pasukan_sekolah', 'Pasukan sekolah', 3);
insert into ref_jawatan_unit (kod, label, susunan) values ('penasihat', 'Penasihat', 1), ('penyelaras', 'Penyelaras', 2), ('ajk', 'AJK', 3), ('lain_lain', 'Lain-lain', 4);
insert into ref_peringkat_pertandingan (kod, label, susunan) values ('sekolah', 'Sekolah', 1), ('daerah', 'Daerah', 2), ('negeri', 'Negeri', 3), ('kebangsaan', 'Kebangsaan', 4);
insert into ref_peranan_pertandingan (kod, label, susunan) values ('pengurus', 'Pengurus', 1), ('jurulatih', 'Jurulatih', 2), ('pengiring', 'Pengiring', 3), ('lain_lain', 'Lain-lain', 4);
insert into ref_jenis_peranan_hem (kod, label, susunan) values ('guru_tarbiah', 'Guru Tarbiah', 1), ('guru_kelas', 'Guru Kelas', 2), ('bidang_disiplin', 'Bidang Disiplin', 3);

-- Peranan pengguna semasa (daripada Supabase Auth)
create or replace function app_guru_id() returns uuid language sql stable security definer set search_path = public as
  $$ select a.guru_id from akaun a where a.auth_user_id = auth.uid() and a.aktif $$;
create or replace function app_role() returns text language sql stable security definer set search_path = public as
  $$ select a.role from akaun a where a.auth_user_id = auth.uid() and a.aktif $$;
create or replace function app_is_admin() returns boolean language sql stable security definer set search_path = public as
  $$ select coalesce(app_role() in ('pentadbir', 'superadmin'), false) $$;

-- Row Level Security: SEMUA jadual. Tanpa dasar = tiada akses (kunci anon tidak boleh membaca apa-apa).
-- Pengguna Auth tanpa akaun aktif (app_guru_id() null) juga tidak nampak apa-apa.
alter table ref_status_lantikan enable row level security;
alter table ref_role enable row level security;
alter table ref_tahap_kelayakan enable row level security;
alter table ref_jenis_opsyen enable row level security;
alter table ref_peringkat_kursus enable row level security;
alter table ref_kategori_subjek enable row level security;
alter table ref_jenis_tugasan enable row level security;
alter table ref_kumpulan_tugasan enable row level security;
alter table ref_jabatan enable row level security;
alter table ref_hari enable row level security;
alter table ref_sumber_slot enable row level security;
alter table ref_jenis_ketidakhadiran enable row level security;
alter table ref_jenis_unit enable row level security;
alter table ref_jawatan_unit enable row level security;
alter table ref_peringkat_pertandingan enable row level security;
alter table ref_peranan_pertandingan enable row level security;
alter table ref_jenis_peranan_hem enable row level security;
alter table guru enable row level security;
alter table akaun enable row level security;
alter table kelayakan enable row level security;
alter table subjek enable row level security;
alter table opsyen_guru enable row level security;
alter table kursus enable row level security;
alter table cerapan enable row level security;
alter table audit_log enable row level security;
alter table kelas enable row level security;
alter table tugasan_guru enable row level security;
alter table jadual_slot enable row level security;
alter table jadual_slot_kelas enable row level security;
alter table warna_jadual enable row level security;
alter table ketidakhadiran_guru enable row level security;
alter table guru_ganti enable row level security;
alter table waktu enable row level security;
alter table had_jam_kredit enable row level security;
alter table unit_kokurikulum enable row level security;
alter table keahlian_unit enable row level security;
alter table rumah_sukan enable row level security;
alter table guru_rumah enable row level security;
alter table juara_rumah_sukan enable row level security;
alter table pertandingan enable row level security;
alter table penyertaan_pertandingan enable row level security;
alter table kumpulan_usrah_pelajar enable row level security;
alter table usrah_guru enable row level security;
alter table keahlian_usrah_guru enable row level security;
alter table sesi_usrah_guru enable row level security;
alter table kehadiran_usrah_guru enable row level security;
alter table peranan_hem enable row level security;

-- ref_status_lantikan: rujukan_super
create policy ref_status_lantikan_baca on ref_status_lantikan for select to authenticated using (app_guru_id() is not null);
create policy ref_status_lantikan_tulis on ref_status_lantikan for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_role: rujukan_super
create policy ref_role_baca on ref_role for select to authenticated using (app_guru_id() is not null);
create policy ref_role_tulis on ref_role for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_tahap_kelayakan: rujukan_super
create policy ref_tahap_kelayakan_baca on ref_tahap_kelayakan for select to authenticated using (app_guru_id() is not null);
create policy ref_tahap_kelayakan_tulis on ref_tahap_kelayakan for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_jenis_opsyen: rujukan_super
create policy ref_jenis_opsyen_baca on ref_jenis_opsyen for select to authenticated using (app_guru_id() is not null);
create policy ref_jenis_opsyen_tulis on ref_jenis_opsyen for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_peringkat_kursus: rujukan_super
create policy ref_peringkat_kursus_baca on ref_peringkat_kursus for select to authenticated using (app_guru_id() is not null);
create policy ref_peringkat_kursus_tulis on ref_peringkat_kursus for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_kategori_subjek: rujukan_super
create policy ref_kategori_subjek_baca on ref_kategori_subjek for select to authenticated using (app_guru_id() is not null);
create policy ref_kategori_subjek_tulis on ref_kategori_subjek for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_jenis_tugasan: rujukan_super
create policy ref_jenis_tugasan_baca on ref_jenis_tugasan for select to authenticated using (app_guru_id() is not null);
create policy ref_jenis_tugasan_tulis on ref_jenis_tugasan for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_kumpulan_tugasan: rujukan_super
create policy ref_kumpulan_tugasan_baca on ref_kumpulan_tugasan for select to authenticated using (app_guru_id() is not null);
create policy ref_kumpulan_tugasan_tulis on ref_kumpulan_tugasan for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_jabatan: rujukan_super
create policy ref_jabatan_baca on ref_jabatan for select to authenticated using (app_guru_id() is not null);
create policy ref_jabatan_tulis on ref_jabatan for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_hari: rujukan_super
create policy ref_hari_baca on ref_hari for select to authenticated using (app_guru_id() is not null);
create policy ref_hari_tulis on ref_hari for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_sumber_slot: rujukan_super
create policy ref_sumber_slot_baca on ref_sumber_slot for select to authenticated using (app_guru_id() is not null);
create policy ref_sumber_slot_tulis on ref_sumber_slot for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_jenis_ketidakhadiran: rujukan_super
create policy ref_jenis_ketidakhadiran_baca on ref_jenis_ketidakhadiran for select to authenticated using (app_guru_id() is not null);
create policy ref_jenis_ketidakhadiran_tulis on ref_jenis_ketidakhadiran for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_jenis_unit: rujukan_super
create policy ref_jenis_unit_baca on ref_jenis_unit for select to authenticated using (app_guru_id() is not null);
create policy ref_jenis_unit_tulis on ref_jenis_unit for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_jawatan_unit: rujukan_super
create policy ref_jawatan_unit_baca on ref_jawatan_unit for select to authenticated using (app_guru_id() is not null);
create policy ref_jawatan_unit_tulis on ref_jawatan_unit for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_peringkat_pertandingan: rujukan_super
create policy ref_peringkat_pertandingan_baca on ref_peringkat_pertandingan for select to authenticated using (app_guru_id() is not null);
create policy ref_peringkat_pertandingan_tulis on ref_peringkat_pertandingan for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_peranan_pertandingan: rujukan_super
create policy ref_peranan_pertandingan_baca on ref_peranan_pertandingan for select to authenticated using (app_guru_id() is not null);
create policy ref_peranan_pertandingan_tulis on ref_peranan_pertandingan for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- ref_jenis_peranan_hem: rujukan_super
create policy ref_jenis_peranan_hem_baca on ref_jenis_peranan_hem for select to authenticated using (app_guru_id() is not null);
create policy ref_jenis_peranan_hem_tulis on ref_jenis_peranan_hem for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');
-- kelayakan: milik_guru
create policy kelayakan_semua on kelayakan for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- subjek: rujukan_admin
create policy subjek_baca on subjek for select to authenticated using (app_guru_id() is not null);
create policy subjek_tulis on subjek for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- opsyen_guru: milik_guru
create policy opsyen_guru_semua on opsyen_guru for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- kursus: milik_guru
create policy kursus_semua on kursus for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- cerapan: milik_guru
create policy cerapan_semua on cerapan for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- kelas: rujukan_admin
create policy kelas_baca on kelas for select to authenticated using (app_guru_id() is not null);
create policy kelas_tulis on kelas for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- tugasan_guru: baca_sendiri
create policy tugasan_guru_baca on tugasan_guru for select to authenticated using (guru_id = app_guru_id() or app_is_admin());
create policy tugasan_guru_tulis on tugasan_guru for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- jadual_slot: milik_guru
create policy jadual_slot_semua on jadual_slot for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- warna_jadual: milik_guru
create policy warna_jadual_semua on warna_jadual for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- ketidakhadiran_guru: baca_sendiri
create policy ketidakhadiran_guru_baca on ketidakhadiran_guru for select to authenticated using (guru_id = app_guru_id() or app_is_admin());
create policy ketidakhadiran_guru_tulis on ketidakhadiran_guru for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- waktu: rujukan_admin
create policy waktu_baca on waktu for select to authenticated using (app_guru_id() is not null);
create policy waktu_tulis on waktu for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- had_jam_kredit: rujukan_admin
create policy had_jam_kredit_baca on had_jam_kredit for select to authenticated using (app_guru_id() is not null);
create policy had_jam_kredit_tulis on had_jam_kredit for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- unit_kokurikulum: rujukan_admin
create policy unit_kokurikulum_baca on unit_kokurikulum for select to authenticated using (app_guru_id() is not null);
create policy unit_kokurikulum_tulis on unit_kokurikulum for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- keahlian_unit: milik_guru
create policy keahlian_unit_semua on keahlian_unit for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- rumah_sukan: rujukan_admin
create policy rumah_sukan_baca on rumah_sukan for select to authenticated using (app_guru_id() is not null);
create policy rumah_sukan_tulis on rumah_sukan for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- guru_rumah: baca_sendiri
create policy guru_rumah_baca on guru_rumah for select to authenticated using (guru_id = app_guru_id() or app_is_admin());
create policy guru_rumah_tulis on guru_rumah for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- juara_rumah_sukan: rujukan_admin
create policy juara_rumah_sukan_baca on juara_rumah_sukan for select to authenticated using (app_guru_id() is not null);
create policy juara_rumah_sukan_tulis on juara_rumah_sukan for all to authenticated using (app_is_admin()) with check (app_is_admin());
-- kumpulan_usrah_pelajar: milik_guru
create policy kumpulan_usrah_pelajar_semua on kumpulan_usrah_pelajar for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- peranan_hem: milik_guru
create policy peranan_hem_semua on peranan_hem for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());
-- guru: guru membaca rekod sendiri; pentadbir semua. Guru lain dilihat melalui view guru_awam (tanpa telefon/emel).
-- Lajur sensitif (aktif, akaun_sistem, status disahkan) diubah melalui fungsi pelayan (RPC) sahaja: lihat MIGRASI-SUPABASE.md.
create policy guru_baca on guru for select to authenticated using (id = app_guru_id() or app_is_admin());
create policy guru_ubah on guru for update to authenticated using (id = app_guru_id() or app_is_admin()) with check (id = app_guru_id() or app_is_admin());
create policy guru_tambah on guru for insert to authenticated with check (app_role() = 'superadmin');
create policy guru_padam on guru for delete to authenticated using (app_role() = 'superadmin');
-- View pemilik (bukan security_invoker) supaya guru boleh melihat NAMA rakan sekerja sahaja, bila ada akaun aktif.
create view guru_awam as
  select id, guru_kod, nama_penuh, nama_panggilan, status_lantikan, jawatan, akaun_sistem, aktif from guru
  where app_guru_id() is not null;
revoke all on guru_awam from anon;

-- akaun: baca sendiri; superadmin urus semua.
create policy akaun_baca on akaun for select to authenticated using (guru_id = app_guru_id() or app_is_admin());
create policy akaun_tulis on akaun for all to authenticated using (app_role() = 'superadmin') with check (app_role() = 'superadmin');

-- audit_log: hanya superadmin membaca; tulisan oleh fungsi pelayan (service role) sahaja.
create policy audit_baca on audit_log for select to authenticated using (app_role() = 'superadmin');

-- jadual_slot_kelas: ikut pemilik slot.
create policy slot_kelas_semua on jadual_slot_kelas for all to authenticated
  using (exists (select 1 from jadual_slot s where s.id = slot_id and (s.guru_id = app_guru_id() or app_is_admin())))
  with check (exists (select 1 from jadual_slot s where s.id = slot_id and (s.guru_id = app_guru_id() or app_is_admin())));

-- guru_ganti: pentadbir menulis; guru melihat rekod di mana dia pengganti atau yang tidak hadir.
create policy ganti_baca on guru_ganti for select to authenticated using (app_is_admin() or guru_ganti_id = app_guru_id()
  or exists (select 1 from ketidakhadiran_guru k where k.id = ketidakhadiran_id and k.guru_id = app_guru_id()));
create policy ganti_tulis on guru_ganti for all to authenticated using (app_is_admin()) with check (app_is_admin());

-- Usrah guru: pentadbir urus kumpulan/ahli; murabbi dan ahli boleh melihat; murabbi menulis sesi dan kehadiran.
create policy usrah_baca on usrah_guru for select to authenticated using (app_is_admin() or murabbi_guru_id = app_guru_id()
  or exists (select 1 from keahlian_usrah_guru a where a.usrah_guru_id = usrah_guru.id and a.guru_id = app_guru_id()));
create policy usrah_tulis on usrah_guru for all to authenticated using (app_is_admin()) with check (app_is_admin());
create policy usrah_ahli_baca on keahlian_usrah_guru for select to authenticated using (app_is_admin() or guru_id = app_guru_id()
  or exists (select 1 from usrah_guru u where u.id = usrah_guru_id and u.murabbi_guru_id = app_guru_id()));
create policy usrah_ahli_tulis on keahlian_usrah_guru for all to authenticated using (app_is_admin()) with check (app_is_admin());
create policy usrah_sesi_baca on sesi_usrah_guru for select to authenticated using (app_is_admin()
  or exists (select 1 from usrah_guru u where u.id = usrah_guru_id and u.murabbi_guru_id = app_guru_id())
  or exists (select 1 from keahlian_usrah_guru a where a.usrah_guru_id = sesi_usrah_guru.usrah_guru_id and a.guru_id = app_guru_id()));
create policy usrah_sesi_tulis on sesi_usrah_guru for all to authenticated
  using (exists (select 1 from usrah_guru u where u.id = usrah_guru_id and u.murabbi_guru_id = app_guru_id()))
  with check (exists (select 1 from usrah_guru u where u.id = usrah_guru_id and u.murabbi_guru_id = app_guru_id()));
create policy hadir_baca on kehadiran_usrah_guru for select to authenticated using (app_is_admin() or guru_id = app_guru_id()
  or exists (select 1 from sesi_usrah_guru s join usrah_guru u on u.id = s.usrah_guru_id where s.id = sesi_id and u.murabbi_guru_id = app_guru_id()));
create policy hadir_tulis on kehadiran_usrah_guru for all to authenticated
  using (exists (select 1 from sesi_usrah_guru s join usrah_guru u on u.id = s.usrah_guru_id where s.id = sesi_id and u.murabbi_guru_id = app_guru_id()))
  with check (exists (select 1 from sesi_usrah_guru s join usrah_guru u on u.id = s.usrah_guru_id where s.id = sesi_id and u.murabbi_guru_id = app_guru_id()));

-- Pertandingan: semua boleh baca dan menambah; pentadbir mengubah/memadam. Penyertaan: milik guru.
create policy pertandingan_baca on pertandingan for select to authenticated using (app_guru_id() is not null);
create policy pertandingan_tambah on pertandingan for insert to authenticated with check (app_guru_id() is not null);
create policy pertandingan_ubah on pertandingan for update to authenticated using (app_is_admin()) with check (app_is_admin());
create policy pertandingan_padam on pertandingan for delete to authenticated using (app_is_admin());
create policy penyertaan_semua on penyertaan_pertandingan for all to authenticated
  using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());

