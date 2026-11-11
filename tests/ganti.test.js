'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../frontend/js/hebahan');
const { loadReady } = require('./helpers/load-gas');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

// ---------------------------------------------------------------- hebahan (tulen)
test('hebahan WhatsApp mengikut templat sekolah', () => {
  const s = (masa_mula, masa_akhir, subjek, kelas, pengganti) => ({ masa_mula, masa_akhir, subjek, kelas, ganti: pengganti ? { guru: { panggilan: pengganti } } : null });
  const data = { tarikh: '2026-11-05', tidak_hadir: [
    { guru: { panggilan: 'Irfan' }, sebab: 'Tamrin WAFA', slot: [s('07:30', '08:30', 'DQH', '3 Suyuthi', 'Nuaimah')] },
    { guru: { panggilan: 'Nisya' }, sebab: 'CT', slot: [s('09:00', '10:00', 'BI', '3 Hanafi', 'Farah Aliya'), s('11:00', '11:30', 'BI', '3 Razi', null)] },
    { guru: { panggilan: 'Tiada Ganti' }, sebab: 'CT', slot: [s('08:00', '09:00', 'MAT', '1 A', null)] },
    { guru: { panggilan: 'Farah Hanani' }, sebab: null, slot: [s('11:15', '12:05', 'RBT', '3 Razi', 'Nurul Ain'), s('13:20', '13:45', 'Perhimpunan', '', 'Adibah')] }
  ] };
  const jangka = [
    'Assalamualaikum ',
    'Relief Khamis 5 Nov 2026',
    '',
    '',
    '1. Irfan (Tamrin WAFA)',
    '▫️*7.30-8.30* (DQH, 3 Suyuthi): Cg Nuaimah',
    '',
    '2. Nisya (CT)',
    '▫️*9.00-10.00* (BI, 3 Hanafi): Cg Farah Aliya',
    '',
    '3. Farah Hanani',
    '▫️*11.15-12.05* (RBT, 3 Razi): Cg Nurul Ain',
    '▫️*1.20-1.45* (Perhimpunan): Cg Adibah',
    '',
    'Terima Kasih'
  ].join('\n');
  assert.equal(H.jana(data), jangka);
  assert.equal(H.belumAda(data), 2);
  assert.equal(H.jana({ tarikh: '2026-11-05', tidak_hadir: [] }), '', 'tiada pengganti = tiada teks');
  assert.equal(H.tarikhPanjang('2026-08-31'), 'Isnin 31 Ogo 2026');
});

test('hariDaripadaTarikh', () => {
  const { ctx } = loadReady();
  assert.equal(ctx.hariDaripadaTarikh('2026-11-05'), 'khamis');
  assert.equal(ctx.hariDaripadaTarikh('2026-11-08'), 'ahad');
});

// ---------------------------------------------------------------- API
function dunia() {
  const w = setupWithSuperadmin();
  const { ctx, call, superToken } = w;
  const A = w.ciptaGuru('SMG01'), B = w.ciptaGuru('SMG02'), C = w.ciptaGuru('SMG03'), D = w.ciptaGuru('SMG04'), ADM = w.ciptaGuru('ADG01', 'pentadbir');
  const gid = (kod) => ctx.query('guru', { guru_kod: kod })[0].id;
  call('SUBJEK_PUKAL', { teks: 'DQH - Dirasat Al-Quran Hafazan\nBI - Bahasa Inggeris' }, superToken);
  call('KELAS_PUKAL', { teks: '3 Suyuthi\n3 Hanafi' }, superToken);
  const subj = Object.fromEntries(ctx.query('subjek', {}).map((s) => [s.kod, s.id]));
  const kelas = Object.fromEntries(ctx.query('kelas', {}).map((k) => [k.nama, k.id]));
  // 2026-11-05 ialah Khamis
  const sA1 = call('SLOT_SIMPAN', { hari: 'khamis', masa_mula: '07:30', masa_akhir: '08:30', subjek_id: subj.DQH, kelas_ids: [kelas['3 Suyuthi']] }, A.token).data.id;
  const sA2 = call('SLOT_SIMPAN', { hari: 'khamis', masa_mula: '09:00', masa_akhir: '10:00', subjek_id: subj.BI, kelas_ids: [kelas['3 Hanafi']] }, A.token).data.id;
  call('SLOT_SIMPAN', { hari: 'jumaat', masa_mula: '07:30', masa_akhir: '08:30', subjek_id: subj.BI }, A.token);
  call('SLOT_SIMPAN', { hari: 'khamis', masa_mula: '07:30', masa_akhir: '08:00', label: 'Kelas B' }, B.token); // B sibuk 7.30
  call('PROFIL_SIMPAN_TERAS', { nama_penuh: 'Nuaimah binti Contoh', nama_panggilan: 'Nuaimah', status_lantikan: 'tetap' }, C.token);
  return { ...w, A, B, C, D, ADM, g: { A: gid('SMG01'), B: gid('SMG02'), C: gid('SMG03'), D: gid('SMG04') }, sA1, sA2 };
}

test('guru ganti: rekod tidak hadir, slot hari itu, calon lapang, tetapkan, hebahan', () => {
  const { ctx, call, ADM, g, sA1, sA2 } = dunia();
  const T = '2026-11-05';
  const th = call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.A, sebab: 'Tamrin WAFA' }, ADM.token).data;
  assert.equal(call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.A }, ADM.token).code, 'DUPLIKAT');
  call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.D, sebab: 'CT' }, ADM.token); // D juga tidak hadir
  const h = call('GANTI_HARI', { tarikh: T }, ADM.token).data;
  assert.equal(h.hari, 'khamis');
  const a = h.tidak_hadir.find((x) => x.guru.id === g.A);
  assert.deepEqual([...a.slot].map((s) => s.masa_mula + ' ' + s.subjek + ' ' + s.kelas), ['07:30 DQH 3 Suyuthi', '09:00 BI 3 Hanafi'], 'slot Khamis sahaja, tersusun');
  const c1 = call('GANTI_CALON', { tarikh: T, ketidakhadiran_id: th.id, slot_id: sA1 }, ADM.token).data;
  const ids = c1.calon.map((x) => x.id);
  assert.ok(!ids.includes(g.A), 'guru tidak hadir sendiri');
  assert.ok(!ids.includes(g.B), 'B ada kelas 7.30');
  assert.ok(!ids.includes(g.D), 'D juga tidak hadir');
  assert.ok(ids.includes(g.C));
  assert.equal(call('GANTI_TETAP', { tarikh: T, ketidakhadiran_id: th.id, slot_id: sA1, guru_ganti_id: g.B }, ADM.token).code, 'VALIDASI', 'B tidak lapang');
  assert.equal(call('GANTI_TETAP', { tarikh: T, ketidakhadiran_id: th.id, slot_id: sA1, guru_ganti_id: g.C }, ADM.token).ok, true);
  // C kini sibuk 7.30-8.30 (ganti) -> bukan calon untuk slot bertindih, tetapi lapang untuk 9.00
  const c2 = call('GANTI_CALON', { tarikh: T, ketidakhadiran_id: th.id, slot_id: sA2 }, ADM.token).data;
  assert.equal(c2.calon.find((x) => x.id === g.C).ganti_bulan_ini, 1, 'kiraan ganti bulan ini');
  assert.equal(c2.calon[c2.calon.length - 1].id === g.C || c2.calon.findIndex((x) => x.id === g.C) > 0, true, 'guru yang sudah banyak ganti diletak kemudian');
  // tukar pengganti slot pertama kepada guru lain dibenarkan (C dikecualikan daripada sibuk untuk slot sendiri)
  const c1b = call('GANTI_CALON', { tarikh: T, ketidakhadiran_id: th.id, slot_id: sA1 }, ADM.token).data;
  assert.ok(c1b.calon.some((x) => x.id === g.C), 'pengganti semasa masih tersenarai');
  assert.equal(c1b.semasa, g.C);
  const h2 = call('GANTI_HARI', { tarikh: T }, ADM.token).data;
  const teks = H.jana(h2);
  assert.match(teks, /^Assalamualaikum \nRelief Khamis 5 Nov 2026\n\n\n1\. Guru Contoh \(Tamrin WAFA\)\n▫️\*7\.30-8\.30\* \(DQH, 3 Suyuthi\): Cg Nuaimah\n\nTerima Kasih$/);
  // batal dan padam
  const gid1 = h2.tidak_hadir.find((x) => x.guru.id === g.A).slot[0].ganti.id;
  assert.equal(call('GANTI_BATAL', { id: gid1 }, ADM.token).ok, true);
  assert.equal(call('GANTI_TIDAK_HADIR_PADAM', { id: th.id }, ADM.token).ok, true);
  assert.equal(ctx.query('guru_ganti', {}).length, 0);
});

test('guru ganti: pentadbir sahaja; akaun sistem dan guru tidak aktif tidak boleh dipilih', () => {
  const { call, A, ADM, g, sA1, superToken } = dunia();
  const T = '2026-11-05';
  assert.equal(call('GANTI_HARI', { tarikh: T }, A.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.B }, A.token).code, 'TIADA_KEBENARAN');
  const sys = call('AKAUN_CIPTA', { guru_kod: 'ADMIN01', nama_penuh: 'Pentadbir Sistem', status_lantikan: 'lain_lain', role: 'superadmin', akaun_sistem: true }, superToken).data;
  const th = call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.A }, ADM.token).data;
  const calon = call('GANTI_CALON', { tarikh: T, ketidakhadiran_id: th.id, slot_id: sA1 }, ADM.token).data.calon;
  assert.ok(!calon.some((x) => x.guru_kod === 'ADMIN01'));
  assert.equal(call('GANTI_TETAP', { tarikh: T, ketidakhadiran_id: th.id, slot_id: sA1, guru_ganti_id: sys.akaun.guru_id }, ADM.token).code, 'VALIDASI');
  assert.equal(call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: 'semalam', guru_id: g.B }, ADM.token).code, 'VALIDASI');
  assert.equal(call('GANTI_CALON', { tarikh: '2026-11-06', ketidakhadiran_id: th.id, slot_id: sA1 }, ADM.token).code, 'TIDAK_JUMPA', 'tarikh berbeza');
});

// ---------------------------------------------------------------- B7: jenis ketidakhadiran
test('jenis ketidakhadiran: lalai lain-lain, boleh ditetapkan dan ditukar, nilai tidak sah ditolak', () => {
  const { call, ctx, ADM, g } = dunia();
  const T = '2026-11-05';
  const a = call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.A }, ADM.token).data;
  assert.equal(ctx.getById('ketidakhadiran_guru', a.id).jenis, 'lain_lain');
  const d = call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.D, jenis: 'cuti_sakit' }, ADM.token).data;
  assert.equal(call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.B, jenis: 'bercuti_sakan' }, ADM.token).code, 'VALIDASI');
  const hari = call('GANTI_HARI', { tarikh: T }, ADM.token).data;
  assert.deepEqual([...hari.ref.jenis_ketidakhadiran.map((j) => j.kod)], ['cuti_tahunan', 'cuti_sakit', 'kursus', 'program', 'cuti_tanpa_gaji', 'cuti_ehsan', 'lain_lain']);
  const baris = (id) => hari.tidak_hadir.find((t) => t.id === id);
  assert.equal(baris(d.id).jenis_label, 'MC (cuti sakit)');
  assert.equal(baris(d.id).sebab_hebahan, 'MC');
  // tukar jenis dan catatan; catatan sahaja mengekalkan jenis
  call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, id: a.id, jenis: 'kursus', sebab: 'Tamrin WAFA' }, ADM.token);
  call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, id: a.id, sebab: 'Tamrin WAFA 2' }, ADM.token);
  const r = ctx.getById('ketidakhadiran_guru', a.id);
  assert.equal(r.jenis, 'kursus'); assert.equal(r.sebab, 'Tamrin WAFA 2');
});

test('hebahan: catatan diutamakan; tanpa catatan guna jenis dengan singkatan CT, MC, CTG dan CE', () => {
  const { ctx } = dunia();
  const L = Object.fromEntries(ctx.REF_SEEDS.ref_jenis_ketidakhadiran.map((p) => [p[0], p[1]]));
  assert.equal(ctx.sebabHebahan('kursus', 'Tamrin WAFA', L), 'Tamrin WAFA');
  assert.equal(ctx.sebabHebahan('cuti_sakit', 'Demam', L), 'Demam', 'catatan mengatasi singkatan');
  assert.equal(ctx.sebabHebahan('kursus', null, L), 'Kursus');
  assert.equal(ctx.sebabHebahan('program', null, L), 'Program');
  assert.equal(ctx.sebabHebahan('cuti_tahunan', '', L), 'CT');
  assert.equal(ctx.sebabHebahan('cuti_sakit', null, L), 'MC');
  assert.equal(ctx.sebabHebahan('cuti_tanpa_gaji', null, L), 'CTG');
  assert.equal(ctx.sebabHebahan('cuti_ehsan', null, L), 'CE');
  assert.equal(ctx.sebabHebahan('lain_lain', null, L), '');
  assert.equal(ctx.sebabHebahan(undefined, null, L), '', 'rekod lama tanpa jenis');
  // modul hebahan frontend menggunakan sebab_hebahan daripada server
  const teks = H.jana({ tarikh: '2026-11-05', tidak_hadir: [{ guru: { panggilan: 'Irfan' }, sebab: null, sebab_hebahan: 'MC', slot: [{ masa_mula: '07:30', masa_akhir: '08:30', subjek: 'DQH', kelas: '3 Suyuthi', ganti: { guru: { panggilan: 'Nuaimah' } } }] }] });
  assert.ok(teks.includes('1. Irfan (MC)'));
});

test('rekod lama tanpa lajur jenis (sebelum kemas kini) masih dibaca dan boleh dikemas kini', () => {
  const { call, ctx, env, ADM, g } = dunia();
  const T = '2026-11-05';
  const a = call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, guru_id: g.A, sebab: 'CT' }, ADM.token).data;
  const sh = env.ss.getSheetByName('ketidakhadiran_guru');
  const col = sh.grid[0].indexOf('jenis'), row = sh.grid.findIndex((x) => x[0] === a.id);
  sh.grid[row][col] = '';   // seperti baris yang wujud sebelum lajur ditambah
  ctx.segarkanCache();
  const t = call('GANTI_HARI', { tarikh: T }, ADM.token).data.tidak_hadir[0];
  assert.equal(t.jenis, 'lain_lain'); assert.equal(t.sebab_hebahan, 'CT');
  assert.equal(call('GANTI_TIDAK_HADIR_SIMPAN', { tarikh: T, id: a.id, sebab: 'CT 2' }, ADM.token).ok, true);
  assert.equal(ctx.getById('ketidakhadiran_guru', a.id).jenis, 'lain_lain');
});
