-- Ujian asap RLS (pilihan) untuk docs/supabase/schema.sql pada PostgreSQL TEMPATAN (bukan Supabase sebenar).
-- Langkah: (1) jalankan bahagian STUB, (2) schema.sql, (3) bahagian UJIAN. Data di sini palsu.
-- Jangkaan: guru A hanya nampak data sendiri; cubaan menulis tugasan/ref ditolak RLS; Auth tanpa akaun nampak 0.

-- ===== STUB (Supabase sudah ada auth.users, auth.uid(), peranan anon/authenticated) =====
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;

-- ===== UJIAN =====
\set ON_ERROR_STOP 1
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated; insert into auth.users values ('00000000-0000-4000-8000-0000000000ff');
insert into auth.users values ('00000000-0000-4000-8000-0000000000a1'), ('00000000-0000-4000-8000-0000000000b1'), ('00000000-0000-4000-8000-0000000000c1');
insert into guru (id, guru_kod, nama_penuh, status_lantikan) values
 ('00000000-0000-4000-8000-00000000000a', 'SMA01', 'Guru A', 'tetap'),
 ('00000000-0000-4000-8000-00000000000b', 'SMB01', 'Guru B', 'tetap'),
 ('00000000-0000-4000-8000-00000000000c', 'ADM01', 'Pentadbir', 'tetap');
insert into akaun (guru_id, role, auth_user_id) values
 ('00000000-0000-4000-8000-00000000000a', 'guru', '00000000-0000-4000-8000-0000000000a1'),
 ('00000000-0000-4000-8000-00000000000b', 'guru', '00000000-0000-4000-8000-0000000000b1'),
 ('00000000-0000-4000-8000-00000000000c', 'pentadbir', '00000000-0000-4000-8000-0000000000c1');
insert into kursus (guru_id, tajuk, tahap) values ('00000000-0000-4000-8000-00000000000a', 'Kursus A', 'sekolah'), ('00000000-0000-4000-8000-00000000000b', 'Kursus B', 'sekolah');
insert into tugasan_guru (guru_id, tahun_akademik, jenis_tugasan, kumpulan, nama_tugasan, jam_kredit) values ('00000000-0000-4000-8000-00000000000a', '2026', 'berjadual', 'subjek', 'Tugas A', 1);
set role authenticated;
select set_config('app.uid', '00000000-0000-4000-8000-0000000000a1', false);
select 'A nampak kursus: ' || string_agg(tajuk, ',') from kursus;
select 'A nampak akaun: ' || count(*) from akaun;
update kursus set tajuk = 'Digodam' where guru_id = '00000000-0000-4000-8000-00000000000b';
select 'Kursus B selepas cubaan A: ' || (select count(*) from kursus where tajuk = 'Digodam');
\set ON_ERROR_STOP 0
insert into tugasan_guru (guru_id, tahun_akademik, jenis_tugasan, kumpulan, nama_tugasan, jam_kredit) values ('00000000-0000-4000-8000-00000000000a', '2026', 'berjadual', 'subjek', 'Tambah sendiri', 1);
insert into ref_role (kod, label) values ('raja', 'Raja');
\set ON_ERROR_STOP 1
select set_config('app.uid', '00000000-0000-4000-8000-0000000000c1', false);
select 'Pentadbir nampak kursus: ' || count(*) from kursus;
select set_config('app.uid', '', false);
select 'Tanpa log masuk nampak guru: ' || count(*) from guru;
reset role;
set role authenticated;
select set_config('app.uid', '00000000-0000-4000-8000-0000000000a1', false);
select 'A nampak guru (jadual): ' || count(*) from guru;
select 'A nampak guru_awam: ' || count(*) from guru_awam;
select set_config('app.uid', '00000000-0000-4000-8000-0000000000ff', false);
select 'Auth tanpa akaun nampak guru_awam/ref: ' || (select count(*) from guru_awam) || '/' || (select count(*) from ref_role);
reset role;
