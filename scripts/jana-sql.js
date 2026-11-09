#!/usr/bin/env node
'use strict';
// Jana docs/supabase/schema.sql daripada backend/Schema.gs (npm run sql). Jangan edit fail SQL secara manual.
// Kandungan: CREATE TABLE (jenis, wajib, julat, unik, FK), nilai rujukan, fungsi peranan dan dasar RLS.
const fs = require('node:fs');
const path = require('node:path');
const { loadBackend } = require('../tests/helpers/load-gas');

// Supabase Auth menggantikan kata laluan dan sesi buatan sendiri.
const LANGKAU_JADUAL = ['sessions'];
const LANGKAU_LAJUR = { akaun: ['salt', 'password_hash', 'percubaan_gagal'] };

// Dasar RLS setiap jadual. Ujian (tests/generated.test.js) gagal jika jadual baharu tiada dasar.
//   rujukan_super : semua pengguna log masuk boleh baca; superadmin sahaja menulis
//   rujukan_admin : semua boleh baca; pentadbir/superadmin menulis
//   milik_guru    : guru membaca/menulis baris sendiri (guru_id); pentadbir semua
//   baca_sendiri  : guru membaca baris sendiri; pentadbir menulis (contoh tugasan diimport pentadbir)
//   khas          : dasar ditulis tangan di bawah
const DASAR = {
  guru: 'khas', akaun: 'khas', audit_log: 'khas', jadual_slot_kelas: 'khas', guru_ganti: 'khas',
  usrah_guru: 'khas', keahlian_usrah_guru: 'khas', sesi_usrah_guru: 'khas', kehadiran_usrah_guru: 'khas',
  pertandingan: 'khas', penyertaan_pertandingan: 'khas',
  subjek: 'rujukan_admin', kelas: 'rujukan_admin', waktu: 'rujukan_admin', had_jam_kredit: 'rujukan_admin',
  unit_kokurikulum: 'rujukan_admin', rumah_sukan: 'rujukan_admin', juara_rumah_sukan: 'rujukan_admin',
  kelayakan: 'milik_guru', opsyen_guru: 'milik_guru', kursus: 'milik_guru', cerapan: 'milik_guru',
  jadual_slot: 'milik_guru', warna_jadual: 'milik_guru', keahlian_unit: 'milik_guru',
  kumpulan_usrah_pelajar: 'milik_guru', peranan_hem: 'milik_guru',
  tugasan_guru: 'baca_sendiri', guru_rumah: 'baca_sendiri', ketidakhadiran_guru: 'baca_sendiri'
};

const KHAS = `
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
`;

function sqlJenis(d) {
  switch (d.type) {
    case 'uuid': return 'uuid';
    case 'int': return 'integer';
    case 'num': return 'numeric';
    case 'bool': return 'boolean';
    case 'date': return 'date';
    case 'time': return 'time';
    case 'datetime': return 'timestamptz';
    default: return 'text';
  }
}

function lit(v) { return typeof v === 'string' ? "'" + v.replace(/'/g, "''") + "'" : String(v); }

function build() {
  const { ctx } = loadBackend();
  const S = ctx.SCHEMA;
  const nama = Object.keys(S).filter((n) => !LANGKAU_JADUAL.includes(n));
  // Susun ikut kebergantungan (FK dan ref) supaya setiap rujukan sudah wujud.
  const siap = [], lawat = {};
  const lawati = (n) => {
    if (lawat[n]) return; lawat[n] = true;
    S[n].columns.forEach((c) => { const d = S[n].defs[c]; [d.fk, d.ref].forEach((t) => { if (t && t !== n && nama.includes(t)) lawati(t); }); });
    siap.push(n);
  };
  nama.forEach(lawati);

  const out = ['-- Skema Supabase (PostgreSQL) untuk Sistem Profil Guru SMIAAG.',
    '-- DIJANA daripada backend/Schema.gs oleh `npm run sql`. Jangan edit secara manual.',
    '-- Jalankan dalam Supabase > SQL Editor pada projek BAHARU. Lihat docs/MIGRASI-SUPABASE.md.', '',
    'create extension if not exists pgcrypto;', ''];
  siap.forEach((n) => {
    const s = S[n];
    const lajur = s.columns.filter((c) => !(LANGKAU_LAJUR[n] || []).includes(c));
    const baris = lajur.map((c) => {
      const d = s.defs[c];
      let x = `  ${c} ${sqlJenis(d)}`;
      if (c === s.pk) x += ' primary key' + (d.type === 'uuid' ? ' default gen_random_uuid()' : '');
      else if (d.required) x += ' not null';
      if (d.def !== undefined) x += ' default ' + lit(d.def);
      if (c === 'created_at' || c === 'updated_at') x += ' default now()';
      // FK pilihan: set null bila rekod induk dipadam (contoh audit_log selepas akaun dipadam atas permintaan PDPA)
      if (d.fk && S[d.fk]) x += ` references ${d.fk}(${S[d.fk].pk})` + (d.required ? '' : ' on delete set null');
      if (d.ref) x += ` references ${d.ref}(kod) on update cascade`;
      if (d.min !== null) x += ` check (${c} between ${d.min} and ${d.max})`;
      if (d.type === 'year') x += ` check (${c} ~ '^[0-9]{4}$')`;
      if (sqlJenis(d) === 'text' && d.type !== 'year' && !d.ref) x += ` check (char_length(${c}) <= ${ctx.LONG_TEXT_COLS.includes(c) ? ctx.MAX_LONG_TEXT : ctx.MAX_TEXT})`;
      return x;
    });
    if (n === 'akaun') baris.push('  auth_user_id uuid unique references auth.users(id) on delete set null');
    s.unique.forEach((u) => baris.push(`  unique (${u.join(', ')})`));
    out.push(`create table ${n} (`, baris.join(',\n'), ');', '');
  });
  // Indeks untuk lajur FK (prestasi RLS dan carian)
  siap.forEach((n) => S[n].columns.forEach((c) => { if (S[n].defs[c].fk) out.push(`create index on ${n} (${c});`); }));
  out.push('', '-- Nilai rujukan asal');
  Object.keys(ctx.REF_SEEDS).forEach((n) => {
    const v = ctx.REF_SEEDS[n].map((p, i) => `(${lit(p[0])}, ${lit(p[1])}, ${i + 1})`).join(', ');
    out.push(`insert into ${n} (kod, label, susunan) values ${v};`);
  });
  out.push('', '-- Peranan pengguna semasa (daripada Supabase Auth)',
    'create or replace function app_guru_id() returns uuid language sql stable security definer set search_path = public as',
    "  $$ select a.guru_id from akaun a where a.auth_user_id = auth.uid() and a.aktif $$;",
    'create or replace function app_role() returns text language sql stable security definer set search_path = public as',
    "  $$ select a.role from akaun a where a.auth_user_id = auth.uid() and a.aktif $$;",
    'create or replace function app_is_admin() returns boolean language sql stable security definer set search_path = public as',
    "  $$ select coalesce(app_role() in ('pentadbir', 'superadmin'), false) $$;", '',
    '-- Row Level Security: SEMUA jadual. Tanpa dasar = tiada akses (kunci anon tidak boleh membaca apa-apa).',
    '-- Pengguna Auth tanpa akaun aktif (app_guru_id() null) juga tidak nampak apa-apa.');
  siap.forEach((n) => out.push(`alter table ${n} enable row level security;`));
  out.push('');
  siap.forEach((n) => {
    const jenis = S[n].isRef ? 'rujukan_super' : DASAR[n];
    if (!jenis) throw new Error('Jadual ' + n + ' tiada dasar RLS dalam scripts/jana-sql.js');
    if (jenis === 'khas') return;
    out.push(`-- ${n}: ${jenis}`);
    if (jenis === 'rujukan_super' || jenis === 'rujukan_admin') {
      const siapa = jenis === 'rujukan_super' ? "app_role() = 'superadmin'" : 'app_is_admin()';
      out.push(`create policy ${n}_baca on ${n} for select to authenticated using (app_guru_id() is not null);`,
        `create policy ${n}_tulis on ${n} for all to authenticated using (${siapa}) with check (${siapa});`);
    } else if (jenis === 'milik_guru') {
      out.push(`create policy ${n}_semua on ${n} for all to authenticated using (guru_id = app_guru_id() or app_is_admin()) with check (guru_id = app_guru_id() or app_is_admin());`);
    } else if (jenis === 'baca_sendiri') {
      out.push(`create policy ${n}_baca on ${n} for select to authenticated using (guru_id = app_guru_id() or app_is_admin());`,
        `create policy ${n}_tulis on ${n} for all to authenticated using (app_is_admin()) with check (app_is_admin());`);
    }
  });
  out.push(KHAS.trim(), '');
  return out.join('\n') + '\n';
}

if (require.main === module) {
  const dir = path.join(__dirname, '..', 'docs', 'supabase');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'schema.sql'), build());
  console.log('Siap: docs/supabase/schema.sql');
}
module.exports = { build, DASAR };
