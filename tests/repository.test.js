'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBackend, loadReady } = require('./helpers/load-gas');

const GURU = { guru_kod: 'SM999', nama_penuh: 'Guru Contoh Satu', status_lantikan: 'tetap' };
const throwsVal = (fn, re) => assert.throws(fn, (e) => e.code === 'VALIDASI' && (!re || re.test(e.message)));

test('setupTemplate mencipta semua tab, mengisi ref dan boleh dijalankan berulang', () => {
  const { ctx, env } = loadBackend();
  ctx.setupTemplate();
  ctx.TABLE_ORDER.forEach((n) => assert.ok(env.ss.getSheetByName(n), n));
  assert.equal(env.ss.getSheetByName('Sheet1'), null, 'Sheet1 kosong dibuang');
  assert.ok(env.props.PEPPER && env.props.PEPPER.length >= 64);
  const pepper = env.props.PEPPER;
  const rows = ctx.query('ref_hari', {}).length;
  ctx.setupTemplate();
  assert.equal(ctx.query('ref_hari', {}).length, rows, 'tiada duplikat');
  assert.equal(env.props.PEPPER, pepper, 'pepper tidak berubah');
  assert.equal(ctx.verifySetup().length, 0);
  const had = ctx.query('had_jam_kredit', {});
  assert.equal(had.length, 1);
  assert.deepEqual([had[0].tahun_akademik, had[0].had_berjadual, had[0].had_tidak_berjadual], ['2026', 22, 10]);
});

test('setupTemplate berhenti jika tab sedia ada mempunyai lajur salah', () => {
  const { ctx, env } = loadBackend();
  const sh = env.ss.insertSheet('guru');
  sh.getRange(1, 1, 1, 2).setValues([['salah', 'lajur']]);
  assert.throws(() => ctx.setupTemplate(), /lajur 1 bukan "id"/);
});

test('insert -> getById -> query -> update -> remove', () => {
  const { ctx } = loadReady();
  const g = ctx.insert('guru', GURU, { actorId: 'admin-1' });
  assert.match(g.id, /^[0-9a-f-]{36}$/);
  assert.equal(g.aktif, true, 'nilai lalai');
  assert.equal(g.updated_by, 'admin-1');
  assert.match(g.created_at, /^2026-11-06T18:30:00\+08:00$/, 'masa Asia/Kuala_Lumpur');

  const read = ctx.getById('guru', g.id);
  assert.equal(read.nama_penuh, 'Guru Contoh Satu');
  assert.equal(read.jawatan, null);
  assert.equal(read.aktif, true);
  assert.equal(read.__row, undefined);

  ctx.insert('guru', { ...GURU, guru_kod: 'SM998', nama_penuh: 'Guru Contoh Dua', status_lantikan: 'kontrak' });
  assert.equal(ctx.query('guru', {}).length, 2);
  assert.equal(ctx.query('guru', { status_lantikan: 'kontrak' }).length, 1);
  assert.equal(ctx.query('guru', { status_lantikan: ['kontrak', 'tetap'] }, { orderBy: 'guru_kod' })[0].guru_kod, 'SM998');
  assert.equal(ctx.query('guru', {}, { orderBy: 'guru_kod', desc: true, limit: 1 })[0].guru_kod, 'SM999');
  assert.equal(ctx.query('guru', { jawatan: null }).length, 2);

  const u = ctx.update('guru', g.id, { jawatan: 'Guru Biasa', tarikh_lantikan: '2020-01-15' }, { actorId: 'admin-2' });
  assert.equal(u.jawatan, 'Guru Biasa');
  assert.equal(u.created_by, undefined);
  assert.equal(ctx.getById('guru', g.id).tarikh_lantikan, '2020-01-15');
  assert.equal(ctx.getById('guru', g.id).updated_by, 'admin-2');

  assert.equal(ctx.remove('guru', g.id), true);
  assert.equal(ctx.getById('guru', g.id), null);
  assert.equal(ctx.remove('guru', g.id), false);
});

test('pengesahan: lajur tidak dikenali, lajur sistem, wajib, enum, jenis, julat, tarikh', () => {
  const { ctx } = loadReady();
  throwsVal(() => ctx.insert('guru', { ...GURU, gaji: 5000 }), /tidak wujud/);
  throwsVal(() => ctx.insert('guru', { ...GURU, created_at: '2020-01-01T00:00:00+08:00' }), /diurus oleh sistem/);
  throwsVal(() => ctx.insert('guru', { nama_penuh: 'X', status_lantikan: 'tetap' }), /guru_kod/);
  throwsVal(() => ctx.insert('guru', { ...GURU, status_lantikan: 'ceo' }), /tidak dibenarkan/);
  throwsVal(() => ctx.insert('guru', { ...GURU, tarikh_lantikan: '2026-02-30' }), /Tarikh/);
  throwsVal(() => ctx.insert('guru', { ...GURU, nama_penuh: 'x'.repeat(201) }), /terlalu panjang/);
  throwsVal(() => ctx.insert('guru', { ...GURU, aktif: 'mungkin' }), /benar atau palsu/);
  throwsVal(() => ctx.update('guru', ctx.insert('guru', GURU).id, { id: '00000000-0000-4000-8000-000000000000' }), /ID tidak boleh/);
  assert.throws(() => ctx.query('guru', { tiada: 1 }), /tidak wujud/);
  assert.throws(() => ctx.insert('tiada_jadual', {}), (e) => e.code === 'JADUAL_TIDAK_WUJUD');
});

test('kunci asing, kekangan unik dan julat nombor', () => {
  const { ctx } = loadReady();
  const g = ctx.insert('guru', GURU);
  const subj = ctx.insert('subjek', { nama: 'Pendidikan Islam' });
  throwsVal(() => ctx.insert('opsyen_guru', { guru_id: '11111111-1111-4111-8111-111111111111', jenis: 'major', subjek_id: subj.id }), /rujukan/);
  ctx.insert('opsyen_guru', { guru_id: g.id, jenis: 'major', subjek_id: subj.id });
  assert.throws(() => ctx.insert('opsyen_guru', { guru_id: g.id, jenis: 'major', subjek_id: subj.id }), (e) => e.code === 'DUPLIKAT');
  assert.throws(() => ctx.insert('guru', GURU), (e) => e.code === 'DUPLIKAT', 'guru_kod unik');
  throwsVal(() => ctx.insert('kelas', { nama: '2 Ibnu Sina', tingkatan: 9, tahun_akademik: '2026' }), /antara 1 dan 6/);
  throwsVal(() => ctx.insert('tugasan_guru', { guru_id: g.id, tahun_akademik: '2026', jenis_tugasan: 'berjadual', kumpulan: 'subjek', nama_tugasan: 'X', jam_kredit: 'banyak' }), /nombor/);
  const t = ctx.insert('tugasan_guru', { guru_id: g.id, tahun_akademik: '2026', jenis_tugasan: 'berjadual', kumpulan: 'subjek', nama_tugasan: 'PI T2', jam_kredit: '1.5' });
  assert.strictEqual(t.jam_kredit, 1.5);
  // cerapan: satu baris setiap guru setiap tahun
  const c = ctx.insert('cerapan', { guru_id: g.id, tahun_akademik: '2026', bilangan_dicerap: 2, pencerap: 'Pencerap Contoh' });
  assert.equal(c.bilangan_dicerap, 2);
  assert.throws(() => ctx.insert('cerapan', { guru_id: g.id, tahun_akademik: '2026' }), (e) => e.code === 'DUPLIKAT');
  assert.equal(ctx.insert('cerapan', { guru_id: g.id, tahun_akademik: '2025' }).bilangan_dicerap, 0, 'lalai 0');
});

test('sanitasi formula injection: awalan \' ditambah semasa simpan, dibuang semasa baca', () => {
  const { ctx, env } = loadReady();
  const cases = ['=1+1', '+60123', '-cmd', '@SUM(A1)', '=HYPERLINK("http://x","klik")'];
  cases.forEach((payload, i) => {
    const g = ctx.insert('guru', { ...GURU, guru_kod: 'SM' + i, jawatan: payload });
    const cell = env.ss.getSheetByName('guru').grid.at(-1)[ctx.SCHEMA.guru.columns.indexOf('jawatan')];
    assert.equal(cell, "'" + payload, 'dalam Sheet mesti berawalan \'');
    assert.equal(ctx.getById('guru', g.id).jawatan, payload, 'bacaan pulang nilai asal');
  });
  assert.equal(ctx.sanitizeForSheet('biasa'), 'biasa');
  assert.equal(ctx.sanitizeForSheet(-5), -5, 'nombor tidak disentuh');
  assert.equal(ctx.sanitizeForSheet(true), true);
  assert.equal(ctx.unsanitizeFromSheet("'=1+1"), '=1+1');
  assert.equal(ctx.unsanitizeFromSheet("'biasa"), "'biasa");
});

test('nombor IC dalam teks bebas dibuang, nombor telefon tidak terjejas', () => {
  const { ctx } = loadReady();
  const g = ctx.insert('guru', { ...GURU, no_telefon: '012-3456789', jawatan: 'Guru 900101-14-5678 Kanan' });
  assert.equal(ctx.getById('guru', g.id).jawatan, 'Guru Kanan');
  assert.equal(ctx.getById('guru', g.id).no_telefon, '012-3456789');
  assert.equal(ctx.stripIdentityNumbers('IC 900101145678'), 'IC');
  assert.equal(ctx.stripIdentityNumbers('tel 0123456789'), 'tel 0123456789');
  const c = ctx.insert('cerapan', { guru_id: g.id, tahun_akademik: '2026', catatan: 'Baik.\nIC: 900101-14-5678' });
  assert.equal(ctx.getById('cerapan', c.id).catatan, 'Baik.\nIC:');
});

test('Sheets yang menukar tarikh/masa/boolean kepada jenis asalnya tetap dibaca betul', () => {
  const { ctx, env } = loadReady();
  const g = ctx.insert('guru', GURU);
  const subj = ctx.insert('subjek', { nama: 'Fiqh' });
  const kls = ctx.insert('kelas', { nama: '1 Abu Bakar', tingkatan: 1, tahun_akademik: '2026' });
  const sl = ctx.insert('jadual_slot', { guru_id: g.id, tahun_akademik: '2026', hari: 'isnin', masa_mula: '07:40', masa_akhir: '08:10', subjek_id: subj.id, tempoh: 1 });
  ctx.insert('jadual_slot_kelas', { slot_id: sl.id, kelas_id: kls.id });
  assert.equal(sl.disahkan, false);
  assert.equal(sl.sumber, 'manual');
  // Simulasi Sheets menukar kepada objek Date dan teks "TRUE"
  const sh = env.ss.getSheetByName('jadual_slot');
  const cols = ctx.SCHEMA.jadual_slot.columns;
  sh.grid.at(-1)[cols.indexOf('disahkan')] = 'TRUE';
  sh.grid.at(-1)[cols.indexOf('masa_mula')] = new Date(Date.UTC(1899, 11, 29, 23, 40)); // 07:40 +08:00
  const g2 = ctx.insert('guru', { ...GURU, guru_kod: 'SM1', tarikh_lantikan: '2019-03-04' });
  env.ss.getSheetByName('guru').grid.at(-1)[ctx.SCHEMA.guru.columns.indexOf('tarikh_lantikan')] = new Date(Date.UTC(2019, 2, 3, 16, 0));
  const r = ctx.getById('jadual_slot', sl.id);
  assert.equal(r.disahkan, true);
  assert.equal(r.masa_mula, '07:40');
  assert.equal(ctx.getById('guru', g2.id).tarikh_lantikan, '2019-03-04');
});

test('tajuk lajur yang salah menghentikan bacaan dengan mesej jelas', () => {
  const { ctx, env } = loadReady();
  env.ss.getSheetByName('guru').grid[0][1] = 'kod_guru';
  assert.throws(() => ctx.query('guru', {}), (e) => e.code === 'SKEMA_TIDAK_SEPADAN');
});

test('insertMany dan removeWhere: satu tulisan, pengesahan setiap baris, FK, unik', () => {
  const { ctx } = loadReady();
  const g = ctx.insert('guru', GURU);
  const subj = ctx.insert('subjek', { nama: 'Fiqh' });
  const rows = Array.from({ length: 50 }, (_, i) => ({ guru_id: g.id, tahun_akademik: '2026', hari: 'isnin', masa_mula: '08:00', masa_akhir: '08:30', subjek_id: subj.id, label: '=X' + i }));
  const out = ctx.insertMany('jadual_slot', rows, { actorId: 'imp' });
  assert.equal(out.length, 50);
  assert.equal(ctx.query('jadual_slot', {}).length, 50);
  assert.equal(ctx.query('jadual_slot', {})[0].label, '=X0', 'sanitasi tetap berlaku');
  assert.throws(() => ctx.insertMany('jadual_slot', [rows[0], { ...rows[0], subjek_id: '11111111-1111-4111-8111-111111111111' }]), /Baris 2: .*rujukan/);
  assert.equal(ctx.query('jadual_slot', {}).length, 50, 'tiada separa simpan jika satu baris gagal');
  assert.throws(() => ctx.insertMany('kelas', [{ nama: '1 A', tingkatan: 1, tahun_akademik: '2026' }, { nama: '1 A', tingkatan: 1, tahun_akademik: '2026' }]), (e) => e.code === 'DUPLIKAT');
  const g2 = ctx.insert('guru', { ...GURU, guru_kod: 'SM2' });
  ctx.insertMany('jadual_slot', [{ ...rows[0], guru_id: g2.id }]);
  assert.equal(ctx.removeWhere('jadual_slot', { guru_id: g.id }), 50);
  const sisa = ctx.query('jadual_slot', {});
  assert.equal(sisa.length, 1);
  assert.equal(sisa[0].guru_id, g2.id);
  assert.equal(ctx.removeWhere('jadual_slot', { guru_id: g.id }), 0);
  assert.throws(() => ctx.removeWhere('jadual_slot', {}), /Penapis diperlukan/);
  ctx.insert('jadual_slot', { ...rows[0] });
  assert.equal(ctx.query('jadual_slot', {}).length, 2, 'insert selepas removeWhere menulis pada baris betul');
});
