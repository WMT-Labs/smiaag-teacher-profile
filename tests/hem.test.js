'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadReady } = require('./helpers/load-gas');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

test('kiraKehadiran: peratus, sesi tanpa rekod dikira tidak hadir, tiada sesi = null', () => {
  const { ctx } = loadReady();
  const sesi = [{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' }];
  const k = [{ sesi_id: 's1', guru_id: 'g', hadir: true }, { sesi_id: 's2', guru_id: 'g', hadir: false }, { sesi_id: 's3', guru_id: 'g', hadir: true }, { sesi_id: 's1', guru_id: 'h', hadir: true }];
  assert.deepEqual({ ...ctx.kiraKehadiran(sesi, k, 'g') }, { hadir: 2, jumlah: 4, peratus: 50 });
  assert.deepEqual({ ...ctx.kiraKehadiran([], k, 'g') }, { hadir: 0, jumlah: 0, peratus: null });
});

function dunia() {
  const w = setupWithSuperadmin();
  const M = w.ciptaGuru('SMH01'), A = w.ciptaGuru('SMH02'), B = w.ciptaGuru('SMH03'), C = w.ciptaGuru('SMH04'), ADM = w.ciptaGuru('ADH01', 'pentadbir');
  const gid = (kod) => w.ctx.query('guru', { guru_kod: kod })[0].id;
  w.call('KELAS_PUKAL', { teks: '1 Abu Bakar\n2 Ali' }, w.superToken);
  const kelas = Object.fromEntries(w.ctx.query('kelas', {}).map((k) => [k.nama, k.id]));
  const g = { M: gid('SMH01'), A: gid('SMH02'), B: gid('SMH03'), C: gid('SMH04') };
  // Pentadbir bina satu kumpulan: murabbi M, ahli A dan B
  const u = w.call('USRAH_GURU_SIMPAN', { nama_kumpulan: 'Usrah Contoh 1', murabbi_guru_id: g.M, hari: 'khamis' }, ADM.token).data;
  w.call('USRAH_AHLI_SIMPAN', { usrah_guru_id: u.id, guru_ids: [g.A, g.B] }, ADM.token);
  return { ...w, M, A, B, C, ADM, g, u, kelas };
}

test('usrah murabbi pelajar dan peranan HEM: guru isi sendiri, disimpan berasingan', () => {
  const { ctx, call, A, kelas } = dunia();
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kumpulan_usrah_pelajar', data: { tahun_akademik: '2026', nama_kumpulan: 'Kumpulan Al-Fajr', tingkatan: 2, hari: 'rabu', bilangan_murid: 12 } }, A.token).ok, true);
  assert.equal(call('REKOD_SIMPAN', { jadual: 'peranan_hem', data: { tahun_akademik: '2026', jenis: 'guru_tarbiah' } }, A.token).ok, true);
  assert.equal(call('REKOD_SIMPAN', { jadual: 'peranan_hem', data: { tahun_akademik: '2026', jenis: 'guru_tarbiah' } }, A.token).code, 'DUPLIKAT');
  assert.match(call('REKOD_SIMPAN', { jadual: 'peranan_hem', data: { tahun_akademik: '2026', jenis: 'guru_kelas' } }, A.token).message, /Pilih kelas/);
  const gk = call('REKOD_SIMPAN', { jadual: 'peranan_hem', data: { tahun_akademik: '2026', jenis: 'guru_kelas', kelas_id: kelas['2 Ali'] } }, A.token).data;
  const bd = call('REKOD_SIMPAN', { jadual: 'peranan_hem', data: { tahun_akademik: '2026', jenis: 'bidang_disiplin', kelas_id: kelas['2 Ali'], butiran: 'Pengawas' } }, A.token).data;
  assert.equal(bd.kelas_id, null, 'kelas diabaikan untuk bukan guru kelas');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'peranan_hem', id: gk.id, data: { jenis: 'bidang_disiplin' } }, A.token).code, 'DUPLIKAT', 'satu bidang disiplin setahun');
  call('REKOD_PADAM', { jadual: 'peranan_hem', id: bd.id }, A.token);
  assert.equal(call('REKOD_SIMPAN', { jadual: 'peranan_hem', id: gk.id, data: { jenis: 'bidang_disiplin', butiran: 'Lembaga disiplin' } }, A.token).ok, true);
  assert.equal(ctx.getById('peranan_hem', gk.id).kelas_id, null, 'tukar daripada guru kelas: kelas dikosongkan');
  const h = call('HEM_LIHAT', {}, A.token).data;
  assert.equal(h.usrah_pelajar[0].bilangan_murid, 12);
  assert.deepEqual([...h.peranan].map((p) => p.jenis).sort(), ['bidang_disiplin', 'guru_tarbiah']);
  assert.equal(ctx.query('kumpulan_usrah_pelajar', {}).length, 1);
  assert.equal(ctx.query('peranan_hem', {}).length, 2, 'Guru Tarbiah dan usrah pelajar dalam jadual berasingan');
});

test('murabbi sahaja boleh rekod sesi; ahli lihat kehadiran sendiri; pentadbir lihat semua', () => {
  const { call, M, A, B, C, ADM, g, u } = dunia();
  const sesi = (tarikh, hadirA, hadirB, token = M.token, x = {}) => call('USRAH_SESI_SIMPAN', { usrah_guru_id: u.id, tarikh, tajuk: 'Tazkirah', kehadiran: [{ guru_id: g.A, hadir: hadirA }, { guru_id: g.B, hadir: hadirB, catatan: hadirB ? null : 'Kursus luar' }], ...x }, token);
  assert.equal(sesi('2026-10-01', true, true).data.hadir, 2);
  assert.equal(sesi('2026-10-15', true, false).ok, true);
  assert.equal(sesi('2026-10-29', false, false).ok, true, 'tarikh bebas, bukan mingguan');
  assert.equal(sesi('2026-11-02', true, true, A.token).code, 'TIADA_KEBENARAN', 'ahli tidak boleh merekod');
  assert.equal(sesi('2026-11-02', true, true, ADM.token).code, 'TIADA_KEBENARAN', 'pentadbir pun tidak merekod; murabbi sahaja');
  assert.equal(sesi('2026-12-01', true, true).code, 'VALIDASI', 'masa depan ditolak');
  assert.equal(sesi('2025-12-01', true, true).code, 'VALIDASI', 'luar tahun kumpulan');
  assert.equal(sesi('2026-10-01', true, true).code, 'DUPLIKAT', 'satu sesi setiap tarikh');
  assert.equal(call('USRAH_SESI_SIMPAN', { usrah_guru_id: u.id, tarikh: '2026-11-03', kehadiran: [{ guru_id: g.C, hadir: true }] }, M.token).code, 'VALIDASI', 'bukan ahli');

  const ha = call('HEM_LIHAT', {}, A.token).data.usrah_guru;
  assert.equal(ha.murabbi, 'Guru Contoh SMH01');
  assert.deepEqual({ ...ha.kehadiran }, { hadir: 2, jumlah: 3, peratus: 67 });
  const hb = call('HEM_LIHAT', {}, B.token).data.usrah_guru;
  assert.equal(hb.kehadiran.peratus, 33);
  assert.equal(hb.sesi.find((s) => s.tarikh === '2026-10-15').catatan, 'Kursus luar');

  const va = call('USRAH_SESI_LIHAT', { usrah_guru_id: u.id }, A.token).data;
  assert.equal(va.boleh_rekod, false);
  assert.equal(va.ahli.length, 1, 'ahli hanya nampak diri sendiri');
  assert.ok(va.kehadiran.every((k) => k.guru_id === g.A));
  assert.equal(call('USRAH_SESI_LIHAT', { usrah_guru_id: u.id }, C.token).code, 'TIADA_KEBENARAN', 'bukan ahli');
  const vm = call('USRAH_SESI_LIHAT', { usrah_guru_id: u.id }, M.token).data;
  assert.equal(vm.boleh_rekod, true);
  assert.equal(vm.ahli.length, 2);
  assert.equal(vm.peratus_kumpulan, 50);
  assert.equal(call('USRAH_SESI_LIHAT', { usrah_guru_id: u.id }, ADM.token).data.ahli.length, 2);
  assert.equal(call('HEM_LIHAT', {}, M.token).data.usrah_dibimbing[0].bilangan_sesi, 3);
});

test('kemas kini sesi menggantikan kehadiran; padam sesi (murabbi sahaja)', () => {
  const { ctx, call, M, A, g, u } = dunia();
  const s = call('USRAH_SESI_SIMPAN', { usrah_guru_id: u.id, tarikh: '2026-10-01', kehadiran: [{ guru_id: g.A, hadir: false }, { guru_id: g.B, hadir: false }] }, M.token).data;
  call('USRAH_SESI_SIMPAN', { usrah_guru_id: u.id, id: s.id, tarikh: '2026-10-01', tajuk: 'Dibetulkan', kehadiran: [{ guru_id: g.A, hadir: true }, { guru_id: g.B, hadir: true }] }, M.token);
  assert.equal(ctx.query('kehadiran_usrah_guru', { sesi_id: s.id }).length, 2);
  assert.ok(ctx.query('kehadiran_usrah_guru', { sesi_id: s.id }).every((k) => k.hadir));
  assert.equal(call('USRAH_SESI_PADAM', { id: s.id }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('USRAH_SESI_PADAM', { id: s.id }, M.token).ok, true);
  assert.equal(ctx.query('kehadiran_usrah_guru', {}).length, 0);
});

test('urus usrah guru (pentadbir): satu kumpulan setahun, murabbi bukan ahli, padam dilindungi', () => {
  const { call, A, M, ADM, g, u } = dunia();
  const u2 = call('USRAH_GURU_SIMPAN', { nama_kumpulan: 'Usrah Contoh 2', murabbi_guru_id: g.C }, ADM.token).data;
  assert.match(call('USRAH_AHLI_SIMPAN', { usrah_guru_id: u2.id, guru_ids: [g.A] }, ADM.token).message, /sudah dalam kumpulan Usrah Contoh 1/);
  assert.match(call('USRAH_AHLI_SIMPAN', { usrah_guru_id: u2.id, guru_ids: [g.C] }, ADM.token).message, /Murabbi/);
  assert.equal(call('USRAH_GURU_SIMPAN', { nama_kumpulan: 'Usrah Contoh 1', murabbi_guru_id: g.C }, ADM.token).code, 'DUPLIKAT');
  assert.equal(call('USRAH_GURU_SIMPAN', { nama_kumpulan: 'X', murabbi_guru_id: g.A }, A.token).code, 'TIADA_KEBENARAN');
  const ur = call('HEM_URUS', {}, ADM.token).data;
  assert.equal(ur.usrah_guru.length, 2);
  assert.equal(ur.usrah_guru.find((x) => x.id === u.id).ahli.length, 2);
  assert.ok(!ur.guru_tanpa_usrah.some((x) => [g.M, g.A, g.B, g.C].includes(x.id)));
  call('USRAH_SESI_SIMPAN', { usrah_guru_id: u.id, tarikh: '2026-10-01', kehadiran: [{ guru_id: g.A, hadir: true }] }, M.token);
  assert.equal(call('USRAH_GURU_PADAM', { id: u.id }, ADM.token).code, 'TIDAK_DIBENARKAN', 'sejarah kehadiran dilindungi');
  assert.equal(call('USRAH_GURU_PADAM', { id: u2.id }, ADM.token).ok, true);
  assert.equal(call('HEM_URUS', {}, A.token).code, 'TIADA_KEBENARAN');
});

test('akses: guru A tidak boleh lihat atau ubah HEM guru B', () => {
  const { ctx, call, A, B, g } = dunia();
  const r = call('REKOD_SIMPAN', { jadual: 'kumpulan_usrah_pelajar', data: { tahun_akademik: '2026', nama_kumpulan: 'Milik B', bilangan_murid: 10 } }, B.token).data;
  assert.equal(call('HEM_LIHAT', { guru_id: g.B }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('REKOD_SIMPAN', { jadual: 'kumpulan_usrah_pelajar', id: r.id, data: { bilangan_murid: 99 } }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('REKOD_PADAM', { jadual: 'peranan_hem', id: r.id }, A.token).code, 'TIDAK_JUMPA');
  assert.equal(ctx.getById('kumpulan_usrah_pelajar', r.id).bilangan_murid, 10);
});
