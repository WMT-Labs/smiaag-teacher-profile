'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Asc = require('../frontend/js/asc');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

const XML = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'contoh', 'asc-contoh.xml'), 'utf8');

// ---------------------------------------------------------------- pembaca aSc (tulen)
test('aSc: baca fail contoh, gabung kad bersebelahan menjadi slot', () => {
  const d = Asc.baca(XML);
  assert.equal(Object.keys(d.periods).length, 18);
  assert.deepEqual(d.periods[4], { nombor: 4, masa_mula: '08:40', masa_akhir: '09:00' });
  const slots = Asc.keSlot(d);
  assert.equal(slots.length, 22, '48 kad -> 22 slot');
  const dqt = slots.find((s) => s.guru_nama === 'Guru Contoh Satu' && s.hari === 'isnin' && s.subjek.short === 'DQT/J');
  assert.equal(dqt.masa_mula, '08:40');
  assert.equal(dqt.masa_akhir, '09:40', 'waktu 4 dan 5 digabungkan');
  assert.deepEqual(dqt.kelas.map((k) => k.nama), ['1 Abu Bakar', '1 Umar']);
  assert.equal(Asc.guruDalamFail(slots).length, 4);
});

test('aSc: kad tidak bersebelahan menjadi slot berasingan; satu kad beberapa hari; elak duplikat', () => {
  const xml = `<timetable><period period="1" starttime="7:30" endtime="8:00"/><period period="2" starttime="8:00" endtime="8:30"/><period period="3" starttime="8:30" endtime="9:00"/>
  <subject id="s" name="Sains" short="SNS"/><teacher id="t" name="Guru X"/><class id="c" name="1 A"/>
  <lesson id="l" subjectid="s" classids="c" teacherids="t"/>
  <card lessonid="l" period="1" days="10100"/><card lessonid="l" period="3" days="10000"/><card lessonid="l" period="1" days="10000"/></timetable>`;
  const s = Asc.keSlot(Asc.baca(xml));
  assert.deepEqual(s.map((x) => x.hari + ' ' + x.masa_mula + '-' + x.masa_akhir), ['isnin 07:30-08:00', 'isnin 08:30-09:00', 'rabu 07:30-08:00']);
});

test('aSc: fail bukan aSc ditolak dengan mesej jelas', () => {
  assert.throws(() => Asc.baca('<html></html>'), /bukan eksport XML aSc/);
  assert.throws(() => Asc.baca(null), /bukan eksport/);
});

test('aSc: padanan guru, subjek, kelas, dan isu yang meragukan ditandakan', () => {
  const slots = Asc.keSlot(Asc.baca(XML));
  const guru = [{ id: 'g1', guru_kod: 'SM901', nama_penuh: 'Guru Contoh Satu' }, { id: 'g2', guru_kod: 'AD901', nama_penuh: 'Nama Lain Pentadbir' }, { id: 'g3', guru_kod: 'SM902', nama_penuh: 'guru contoh  DUA' }];
  const peta = Asc.padanGuru(Asc.guruDalamFail(slots), guru);
  assert.equal(peta.T1, 'g1', 'nama penuh');
  assert.equal(peta.T2, 'g2', 'ID guru = short');
  assert.equal(peta.T3, 'g3', 'nama tidak sensitif huruf/ruang');
  assert.equal(peta.T4, null, 'guru tiada dalam sistem');
  const rujukan = { subjek: [{ id: 'pi', kod: 'PI', nama: 'Pendidikan Islam' }, { id: 'dqt', kod: 'DQT/J', nama: 'Dirasat' }, { id: 'sns', kod: null, nama: 'Sains' }],
    kelas: [{ id: 'k1', nama: '1 Abu Bakar' }, { id: 'k2', nama: '1 Umar' }] };
  const rows = Asc.padankan(slots, rujukan, peta);
  const dqt = rows.find((r) => r.guru_id === 'g1' && r.hari === 'isnin' && r.subjek_id === 'dqt');
  assert.deepEqual(dqt.kelas_ids, ['k1', 'k2']);
  assert.equal(dqt.isu.length, 0);
  const phm = rows.find((r) => r.guru_id === 'g1' && r.label === 'Perhimpunan');
  assert.match(phm.isu[0], /disimpan sebagai aktiviti/);
  assert.ok(rows.find((r) => r.guru_id === 'g3' && r.subjek_id === 'sns'), 'subjek dipadan melalui nama jika tiada kod');
  assert.ok(rows.some((r) => r.isu.some((x) => /6 Rekaan/.test(x))));
  assert.ok(rows.filter((r) => !r.guru_id).every((r) => r.isu.some((x) => /belum dipadankan/.test(x))));
  assert.deepEqual(Asc.isuMenghalang({ guru_id: 'g', hari: 'isnin', masa_mula: '09:00', masa_akhir: '08:00', label: 'x' }), ['masa tamat sebelum mula']);
  assert.deepEqual(Asc.isuMenghalang({ guru_id: null, hari: 'isnin', masa_mula: '08:00', masa_akhir: '09:00' }), ['tiada guru', 'tiada subjek atau aktiviti']);
});

test('aSc: pertindihan dalam data import (sama seperti server)', () => {
  const r = (n, guru_id, hari, masa_mula, masa_akhir, kelas_ids = []) => ({ n, guru_id, hari, masa_mula, masa_akhir, kelas_ids });
  assert.deepEqual(Asc.kesanPertindihan([r(1, 'g', 'isnin', '08:00', '09:00'), r(2, 'g', 'isnin', '08:30', '09:30'), r(3, 'g', 'isnin', '09:30', '10:00')]).map((p) => p.jenis + p.a + p.b), ['guru12']);
  assert.deepEqual(Asc.kesanPertindihan([r(1, 'g', 'isnin', '08:00', '09:00', ['k']), r(2, 'h', 'isnin', '08:30', '09:30', ['k'])]).map((p) => p.jenis), ['kelas']);
});

// ---------------------------------------------------------------- import di server
function dunia() {
  const w = setupWithSuperadmin();
  const A = w.ciptaGuru('SMI01'), B = w.ciptaGuru('SMI02'), ADM = w.ciptaGuru('ADI01', 'pentadbir');
  const gid = (kod) => w.ctx.query('guru', { guru_kod: kod })[0].id;
  w.call('SUBJEK_PUKAL', { teks: 'PI - Pendidikan Islam\nSNS - Sains' }, w.superToken);
  w.call('KELAS_PUKAL', { teks: '1 Abu Bakar\n1 Umar' }, w.superToken);
  const subjek = Object.fromEntries(w.ctx.query('subjek', {}).map((s) => [s.kod, s.id]));
  const kelas = Object.fromEntries(w.ctx.query('kelas', {}).map((k) => [k.nama, k.id]));
  return { ...w, A, B, ADM, gidA: gid('SMI01'), gidB: gid('SMI02'), subjek, kelas };
}

test('JADUAL_IMPORT: ganti jadual guru dalam kumpulan, kekalkan guru lain, sumber asc', () => {
  const { ctx, call, A, B, ADM, gidA, gidB, subjek, kelas } = dunia();
  call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '07:30', masa_akhir: '08:10', label: 'Lama A', kelas_ids: [kelas['1 Umar']] }, A.token);
  call('SLOT_SIMPAN', { hari: 'isnin', masa_mula: '07:30', masa_akhir: '08:10', label: 'Kekal B' }, B.token);
  const r = call('JADUAL_IMPORT', { guru_ids: [gidA], slot: [
    { guru_id: gidA, hari: 'isnin', masa_mula: '08:40', masa_akhir: '09:40', subjek_id: subjek.PI, kelas_ids: [kelas['1 Abu Bakar'], kelas['1 Umar']] },
    { guru_id: gidA, hari: 'selasa', masa_mula: '07:30', masa_akhir: '08:40', label: 'Perhimpunan' }
  ] }, ADM.token);
  assert.equal(r.ok, true, r.message);
  assert.deepEqual([r.data.slot, r.data.diganti], [2, 1]);
  const a = ctx.query('jadual_slot', { guru_id: gidA });
  assert.equal(a.length, 2);
  assert.ok(a.every((s) => s.sumber === 'asc' && s.disahkan === true));
  assert.equal(a.find((s) => s.hari === 'isnin').tempoh, 2);
  assert.equal(ctx.query('jadual_slot', { guru_id: gidB }).length, 1, 'guru lain tidak disentuh');
  assert.equal(ctx.query('jadual_slot_kelas', {}).length, 2, 'pautan kelas lama dipadam, 2 baharu');
  assert.equal(call('KURIKULUM_LIHAT', {}, A.token).data.slot.length, 2);
});

test('JADUAL_IMPORT: tolak data tidak sah tanpa menyimpan apa-apa', () => {
  const { ctx, call, ADM, gidA, gidB, kelas } = dunia();
  const ok = { guru_id: gidA, hari: 'isnin', masa_mula: '08:00', masa_akhir: '09:00', label: 'X' };
  const t = (slot, guru_ids = [gidA]) => call('JADUAL_IMPORT', { guru_ids, slot }, ADM.token);
  assert.match(t([ok, { ...ok, guru_id: gidB }]).message, /Slot 2: guru tiada dalam senarai/);
  assert.match(t([{ ...ok, masa_akhir: '07:00' }]).message, /masa tidak sah/);
  assert.match(t([{ ...ok, label: null }]).message, /subjek atau nama aktiviti/);
  assert.match(t([{ ...ok, kelas_ids: ['11111111-1111-4111-8111-111111111111'] }]).message, /kelas tidak wujud/);
  call('SLOT_SIMPAN', { guru_id: gidA, hari: 'rabu', masa_mula: '07:30', masa_akhir: '08:00', label: 'Sedia ada' }, ADM.token);
  assert.equal(t([ok, { ...ok, hari: 'hariraya' }]).code, 'VALIDASI');
  assert.equal(ctx.query('jadual_slot', { guru_id: gidA }).length, 1, 'import gagal: jadual lama KEKAL');
  ctx.removeWhere('jadual_slot', { guru_id: gidA });
  assert.equal(t([ok], []).code, 'VALIDASI');
  assert.equal(ctx.query('jadual_slot', {}).length, 0);
  assert.ok(kelas);
});

test('import: guru biasa ditolak', () => {
  const { call, A, gidA } = dunia();
  assert.equal(call('JADUAL_IMPORT', { guru_ids: [gidA], slot: [] }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('TUGASAN_IMPORT', { tugasan: [] }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('IMPORT_RUJUKAN', {}, A.token).code, 'TIADA_KEBENARAN');
});

test('TUGASAN_IMPORT: pukal, pilihan ganti, pengesahan setiap baris', () => {
  const { ctx, call, ADM, gidA, gidB, subjek } = dunia();
  const t = (guru_id, nama_tugasan, jam_kredit, x = {}) => ({ guru_id, jenis_tugasan: 'berjadual', kumpulan: 'subjek', nama_tugasan, jam_kredit, ...x });
  const r1 = call('TUGASAN_IMPORT', { tugasan: [t(gidA, 'PI T2', 6, { subjek_id: subjek.PI, bilangan_kelas: 2 }), t(gidA, 'Sains T1', 4), t(gidB, 'PI T1', 3),
    { guru_id: gidB, jenis_tugasan: 'tidak_berjadual', kumpulan: 'tugasan_tidak_berjadual', nama_tugasan: 'Guru UPP', jabatan: 'KURI', jam_kredit: 1 }] }, ADM.token);
  assert.equal(r1.ok, true, r1.message);
  assert.deepEqual([r1.data.guru, r1.data.tugasan, r1.data.diganti], [2, 4, 0]);
  const r2 = call('TUGASAN_IMPORT', { ganti: true, tugasan: [t(gidA, 'PI T2', 6)] }, ADM.token);
  assert.equal(r2.data.diganti, 2);
  assert.equal(ctx.query('tugasan_guru', { guru_id: gidA }).length, 1);
  assert.equal(ctx.query('tugasan_guru', { guru_id: gidB }).length, 2, 'guru tiada dalam fail tidak disentuh');
  assert.match(call('TUGASAN_IMPORT', { tugasan: [t(gidA, 'OK', 1), { guru_id: gidA, jenis_tugasan: 'tidak_berjadual', kumpulan: 'tugasan_tidak_berjadual', nama_tugasan: 'Tiada jabatan', jam_kredit: 1 }] }, ADM.token).message, /Baris 2: .*jabatan/);
  assert.match(call('TUGASAN_IMPORT', { tugasan: [t('11111111-1111-4111-8111-111111111111', 'X', 1)] }, ADM.token).message, /Baris 1: guru tidak dijumpai/);
  assert.match(call('TUGASAN_IMPORT', { tugasan: [t(gidA, 'X', 99)] }, ADM.token).message, /Baris 1: .*antara 0 dan 40/);
  assert.equal(ctx.query('tugasan_guru', { guru_id: gidA }).length, 1, 'tiada separa simpan');
  assert.match(call('TUGASAN_IMPORT', { ganti: true, tugasan: [t(gidA, 'Baru', 2), t(gidA, 'Rosak', 99)] }, ADM.token).message, /Baris 2/);
  assert.equal(ctx.query('tugasan_guru', { guru_id: gidA })[0].nama_tugasan, 'PI T2', 'ganti gagal: tugasan lama KEKAL');
});

// ---------------------------------------------------------------- pembaca tugasan (tulen)
const TI = require('../frontend/js/tugasan-import');
const RUJ = { guru: [{ id: 'g216', guru_kod: 'SM216', nama_penuh: 'Guru Contoh' }], subjek: [{ id: 'pi', kod: 'PI', nama: 'Pendidikan Islam' }, { id: 'dqt', kod: 'DQT/J', nama: 'Dirasat' }] };

test('tugasan import: templat contoh dibaca tanpa isu, jumlah dikira', () => {
  const r = TI.baca(TI.TEMPLAT, RUJ);
  assert.equal(r.baris.length, 5);
  assert.deepEqual(r.baris.flatMap((b) => b.isu), []);
  assert.deepEqual(r.baris[1].data, { guru_id: 'g216', jenis_tugasan: 'berjadual', nama_tugasan: 'Dirasat Al-Quran T1', subjek_id: 'dqt', kumpulan: 'al_quran_tutorial', bilangan_kelas: 1, jam_kredit: 1.5 });
  assert.equal(r.baris[3].data.kumpulan, 'tugasan_tidak_berjadual');
  assert.deepEqual(TI.jumlah(r.baris).map((x) => [x.berjadual, x.tidak_berjadual]), [[8.5, 6]]);
});

test('tugasan import: tampal dari Excel (tab), tajuk alias, koma perpuluhan, petikan', () => {
  const teks = 'ID Guru\tJenis Tugasan\tNama Tugasan\tJam\tJabatan\nsm216\tTidak Berjadual\t"Ketua Panitia, Tilawah"\t1,5\tkuri\n';
  const r = TI.baca(teks, RUJ);
  assert.deepEqual(r.baris[0].isu, []);
  assert.equal(r.baris[0].data.nama_tugasan, 'Ketua Panitia, Tilawah');
  assert.equal(r.baris[0].data.jam_kredit, 1.5);
  assert.equal(r.baris[0].data.jabatan, 'KURI');
});

test('tugasan import: isu ditandakan setiap baris; lajur wajib tiada', () => {
  const teks = 'guru_kod,jenis,nama_tugasan,subjek_kod,jabatan,jam_kredit\nXX1,berjadual,A,ZZZ,,5\nSM216,lain,B,,,abc\nSM216,tidak berjadual,C,,,2\n';
  const r = TI.baca(teks, RUJ);
  assert.match(r.baris[0].isu.join('|'), /XX1.*tiada dalam sistem\|Subjek "ZZZ"/);
  assert.match(r.baris[1].isu.join('|'), /Jenis mesti.*\|Jam kredit/);
  assert.match(r.baris[2].isu.join('|'), /Jabatan wajib/);
  assert.equal(r.baris[2].n, 4, 'nombor baris ikut fail (tajuk = 1)');
  assert.deepEqual(TI.baca('nama,jam\nX,1', RUJ).lajurTiada, ['guru_kod', 'jenis'], '"nama" ialah alias nama_tugasan');
});
