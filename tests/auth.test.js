'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadReady } = require('./helpers/load-gas');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

// ---------------------------------------------------------------- hash
test('hash: tiada plaintext, salt unik, pepper mempengaruhi hasil, format berversi', () => {
  const { ctx, env } = loadReady();
  const s1 = ctx.newSalt(), s2 = ctx.newSalt();
  assert.match(s1, /^[0-9a-f]{64}$/);
  assert.notEqual(s1, s2);
  const h1 = ctx.hashPassword('Rahsia123', s1);
  assert.match(h1, /^v1\$1000\$[0-9a-f]{64}$/);
  assert.doesNotMatch(h1, /Rahsia123/);
  assert.notEqual(h1, ctx.hashPassword('Rahsia123', s2), 'salt berbeza -> hash berbeza');
  assert.ok(ctx.verifyPassword('Rahsia123', s1, h1));
  assert.ok(!ctx.verifyPassword('rahsia123', s1, h1));
  assert.ok(!ctx.verifyPassword('Rahsia123', s1, 'v1$1000$' + '0'.repeat(64)));
  assert.ok(!ctx.verifyPassword('Rahsia123', s1, 'rosak'));
  assert.ok(ctx.verifyPassword('x', s1, ctx.hashPassword('x', s1, 5)), 'bilangan ulangan dibaca daripada hash');
  env.props.PEPPER = 'pepper-lain';
  assert.ok(!ctx.verifyPassword('Rahsia123', s1, h1), 'pepper berubah -> hash lama tidak sah');
});

test('kata laluan sementara: 10 aksara, tiada aksara mengelirukan, berbeza setiap kali', () => {
  const { ctx } = loadReady();
  const set = new Set();
  for (let i = 0; i < 50; i++) {
    const p = ctx.janaPasswordSementara();
    assert.match(p, /^[A-HJ-NP-Za-km-z2-9]{10}$/);
    set.add(p);
  }
  assert.equal(set.size, 50);
});

test('polisi kata laluan: minimum 8, tidak sama dengan ID guru', () => {
  const { ctx } = loadReady();
  assert.match(ctx.semakPolisiPassword('pendek', 'SM1'), /8 aksara/);
  assert.match(ctx.semakPolisiPassword('sm216abc', 'SM216ABC'), /sama dengan ID/);
  assert.equal(ctx.semakPolisiPassword('cukuplapan', 'SM216'), null);
  assert.match(ctx.semakPolisiPassword('x'.repeat(101), 'SM1'), /terlalu panjang/);
});

// ---------------------------------------------------------------- login & sesi
test('log masuk berjaya memulangkan token dan menyimpan sesi dengan tempoh luput 30 hari', () => {
  const { ctx, call, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM100');
  const r = call('SESI_SAYA', {}, g.token);
  assert.equal(r.ok, true);
  assert.equal(r.data.guru_kod, 'SM100');
  assert.equal(r.data.role, 'guru');
  const s = ctx.getById('sessions', g.token);
  assert.equal(s.expiry, '2026-12-06T18:30:00+08:00');
  assert.equal(JSON.stringify(r).includes('password_hash'), false);
  assert.equal(JSON.stringify(r).includes('salt'), false);
});

test('ID tidak wujud dan kata laluan salah memberi mesej yang sama', () => {
  const { login, ciptaGuru } = setupWithSuperadmin();
  ciptaGuru('SM101');
  const a = login('SM101', 'SalahSalah1');
  const b = login('TIADA99', 'SalahSalah1');
  assert.equal(a.code, 'LOGIN_GAGAL');
  assert.equal(b.code, 'LOGIN_GAGAL');
  assert.equal(a.message, b.message);
});

test('ID guru tidak sensitif huruf besar/kecil', () => {
  const { login, ciptaGuru } = setupWithSuperadmin();
  ciptaGuru('SM102');
  assert.equal(login('sm102', 'KataLaluanBaru1').ok, true);
});

test('token tamat tempoh ditolak dan dipadam', () => {
  const { ctx, env, call, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM103');
  env.advance(30 * 86400000 - 1000);
  assert.equal(call('SESI_SAYA', {}, g.token).ok, true, 'masih sah sebelum 30 hari');
  env.advance(30 * 86400000 + 1000);
  const r = call('SESI_SAYA', {}, g.token);
  assert.equal(r.code, 'TIDAK_LOG_MASUK');
  assert.match(r.message, /tamat/);
  assert.equal(ctx.getById('sessions', g.token), null);
});

test('sesi bergerak: guru aktif terus kekal log masuk, lanjutan paling kerap sekali sehari', () => {
  const { ctx, env, call, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM120');
  const e0 = ctx.getById('sessions', g.token).expiry;
  env.advance(3600000);
  call('SESI_SAYA', {}, g.token);
  assert.equal(ctx.getById('sessions', g.token).expiry, e0, 'belum sehari: tiada tulisan');
  for (let i = 0; i < 3; i++) { env.advance(20 * 86400000); assert.equal(call('SESI_SAYA', {}, g.token).ok, true, 'hari ke-' + (i + 1) * 20); }
  const r = call('SESI_SAYA', {}, g.token);
  assert.equal(r.data.expiry, ctx.getById('sessions', g.token).expiry, 'expiry baharu dipulangkan ke frontend');
  env.advance(31 * 86400000);
  assert.equal(call('SESI_SAYA', {}, g.token).code, 'TIDAK_LOG_MASUK', 'tidak aktif 31 hari -> tamat');
});

test('log keluar memadam token di server', () => {
  const { ctx, call, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM104');
  assert.equal(call('LOGOUT', {}, g.token).ok, true);
  assert.equal(ctx.getById('sessions', g.token), null);
  assert.equal(call('SESI_SAYA', {}, g.token).code, 'TIDAK_LOG_MASUK');
});

test('sesi tamat dibersihkan semasa log masuk seterusnya', () => {
  const { ctx, env, login, ciptaGuru } = setupWithSuperadmin();
  ciptaGuru('SM105');
  env.advance(31 * 86400000);
  const before = ctx.query('sessions', {}).length;
  assert.ok(before >= 2);
  assert.equal(login('SM105', 'KataLaluanBaru1').ok, true);
  assert.equal(ctx.query('sessions', {}).length, 1);
});

// ---------------------------------------------------------------- had percubaan
test('had percubaan: 8 gagal dalam 5 minit mengunci ID itu sahaja, kemudian dibuka semula', () => {
  const { env, login, ciptaGuru } = setupWithSuperadmin();
  ciptaGuru('SM106');
  ciptaGuru('SM107');
  for (let i = 0; i < 8; i++) assert.equal(login('SM106', 'Salah' + i + 'xxx').code, 'LOGIN_GAGAL');
  const kunci = login('SM106', 'KataLaluanBaru1');
  assert.equal(kunci.code, 'TERLALU_BANYAK_CUBAAN', 'kata laluan betul pun ditolak ketika dikunci');
  assert.match(kunci.message, /5 minit/);
  assert.equal(login('SM107', 'KataLaluanBaru1').ok, true, 'ID lain tidak terjejas');
  env.advance(5 * 60 * 1000 + 1000);
  assert.equal(login('SM106', 'KataLaluanBaru1').ok, true, 'dibuka selepas 5 minit');
});

test('had percubaan juga terpakai pada ID yang tidak wujud (tiada beza tingkah laku)', () => {
  const { login } = setupWithSuperadmin();
  for (let i = 0; i < 8; i++) login('TIADA1', 'apa-apa-sahaja');
  assert.equal(login('TIADA1', 'apa-apa-sahaja').code, 'TERLALU_BANYAK_CUBAAN');
});

test('log masuk berjaya mengosongkan kiraan gagal', () => {
  const { ctx, login, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM108');
  for (let i = 0; i < 7; i++) login('SM108', 'salah-salah');
  assert.equal(ctx.getById('akaun', g.akaunId).percubaan_gagal, 7);
  assert.equal(login('SM108', 'KataLaluanBaru1').ok, true);
  assert.equal(ctx.getById('akaun', g.akaunId).percubaan_gagal, 0);
  for (let i = 0; i < 7; i++) login('SM108', 'salah-salah');
  assert.equal(login('SM108', 'KataLaluanBaru1').ok, true, 'tetingkap bermula semula');
});

test('pentadbir boleh buka kunci', () => {
  const { call, login, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM109');
  const adm = ciptaGuru('AD001', 'pentadbir');
  for (let i = 0; i < 8; i++) login('SM109', 'salah-salah');
  const senarai = call('AKAUN_SENARAI', {}, adm.token).data;
  assert.equal(senarai.find((x) => x.guru_kod === 'SM109').dikunci, true);
  assert.equal(call('AKAUN_BUKA_KUNCI', { akaun_id: g.akaunId }, adm.token).ok, true);
  assert.equal(login('SM109', 'KataLaluanBaru1').ok, true);
});

// ---------------------------------------------------------------- langkah wajib
test('log masuk pertama: hanya aksi langkah wajib dibenarkan sehingga PDPA dan tukar kata laluan selesai', () => {
  const { call, login, superToken } = setupWithSuperadmin();
  const c = call('AKAUN_CIPTA', { guru_kod: 'AD002', nama_penuh: 'Pentadbir Contoh', status_lantikan: 'tetap', role: 'pentadbir' }, superToken).data;
  const l = login('AD002', c.password_sementara);
  assert.equal(l.data.sesi.wajib_tukar_password, true);
  assert.equal(l.data.sesi.perlu_persetujuan_pdpa, true);
  const t = l.data.token;
  assert.equal(call('AKAUN_SENARAI', {}, t).code, 'PERLU_TINDAKAN');
  assert.equal(call('SETUJU_PDPA', { setuju: false }, t).code, 'VALIDASI');
  assert.equal(call('SETUJU_PDPA', { setuju: true }, t).data.perlu_persetujuan_pdpa, false);
  assert.equal(call('AKAUN_SENARAI', {}, t).code, 'PERLU_TINDAKAN', 'masih perlu tukar kata laluan');
  assert.equal(call('TUKAR_PASSWORD', { password_lama: c.password_sementara, password_baru: 'AD002' }, t).code, 'VALIDASI');
  assert.equal(call('TUKAR_PASSWORD', { password_lama: 'salah', password_baru: 'BaruBaru123' }, t).code, 'PASSWORD_LAMA_SALAH');
  assert.equal(call('TUKAR_PASSWORD', { password_lama: c.password_sementara, password_baru: c.password_sementara }, t).code, 'VALIDASI');
  assert.equal(call('TUKAR_PASSWORD', { password_lama: c.password_sementara, password_baru: 'BaruBaru123' }, t).data.wajib_tukar_password, false);
  assert.equal(call('AKAUN_SENARAI', {}, t).ok, true);
  assert.equal(login('AD002', c.password_sementara).code, 'LOGIN_GAGAL', 'kata laluan sementara tidak sah lagi');
});

test('tukar kata laluan melog keluar peranti lain tetapi kekalkan sesi semasa', () => {
  const { call, login, ciptaGuru } = setupWithSuperadmin();
  ciptaGuru('SM110');
  const t1 = login('SM110', 'KataLaluanBaru1').data.token;
  const t2 = login('SM110', 'KataLaluanBaru1').data.token;
  assert.equal(call('TUKAR_PASSWORD', { password_lama: 'KataLaluanBaru1', password_baru: 'LebihBaru22' }, t1).ok, true);
  assert.equal(call('SESI_SAYA', {}, t1).ok, true);
  assert.equal(call('SESI_SAYA', {}, t2).code, 'TIDAK_LOG_MASUK');
});

// ---------------------------------------------------------------- kebenaran
test('guru dan pentadbir tidak boleh memanggil aksi superadmin melalui API terus', () => {
  const { call, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM111');
  const adm = ciptaGuru('AD003', 'pentadbir');
  const cipta = { guru_kod: 'HACK1', nama_penuh: 'Penggodam', status_lantikan: 'tetap', role: 'superadmin' };
  assert.equal(call('AKAUN_CIPTA', cipta, g.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('AKAUN_CIPTA', cipta, adm.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('AKAUN_SENARAI', {}, g.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('AKAUN_TUKAR_ROLE', { akaun_id: g.akaunId, role: 'superadmin' }, g.token).code, 'TIADA_KEBENARAN');
  assert.equal(call('AKAUN_RESET_PASSWORD', { akaun_id: adm.akaunId }, adm.token).code, 'TIADA_KEBENARAN');
});

test('perubahan peranan berkuat kuasa serta-merta (peranan dibaca daripada akaun, bukan sesi)', () => {
  const { ctx, call, ciptaGuru } = setupWithSuperadmin();
  const adm = ciptaGuru('AD004', 'pentadbir');
  assert.equal(call('AKAUN_SENARAI', {}, adm.token).ok, true);
  ctx.update('akaun', adm.akaunId, { role: 'guru' });
  assert.equal(call('AKAUN_SENARAI', {}, adm.token).code, 'TIADA_KEBENARAN');
});

// ---------------------------------------------------------------- urus akaun
test('superadmin: cipta, reset, nyahaktif, aktifkan, tukar peranan', () => {
  const { ctx, call, login, superToken, ciptaGuru } = setupWithSuperadmin();
  const g = ciptaGuru('SM112');
  assert.equal(call('AKAUN_CIPTA', { guru_kod: 'sm112', nama_penuh: 'Dua', status_lantikan: 'tetap', role: 'guru' }, superToken).code, 'DUPLIKAT');
  assert.equal(call('AKAUN_CIPTA', { guru_kod: 'SM 1', nama_penuh: 'Ruang', status_lantikan: 'tetap', role: 'guru' }, superToken).code, 'VALIDASI');
  assert.equal(call('AKAUN_CIPTA', { guru_kod: 'SM113', nama_penuh: 'Status Salah', status_lantikan: 'ceo', role: 'guru' }, superToken).code, 'VALIDASI');
  assert.equal(ctx.query('guru', { guru_kod: 'SM113' }).length, 0, 'tiada guru separuh jadi');

  const rs = call('AKAUN_RESET_PASSWORD', { akaun_id: g.akaunId }, superToken);
  assert.equal(rs.ok, true);
  assert.equal(call('SESI_SAYA', {}, g.token).code, 'TIDAK_LOG_MASUK', 'sesi lama dipadam');
  assert.equal(login('SM112', 'KataLaluanBaru1').code, 'LOGIN_GAGAL');
  const l = login('SM112', rs.data.password_sementara);
  assert.equal(l.data.sesi.wajib_tukar_password, true);

  assert.equal(call('AKAUN_SET_AKTIF', { akaun_id: g.akaunId, aktif: false }, superToken).data.aktif, false);
  assert.equal(call('SESI_SAYA', {}, l.data.token).code, 'TIDAK_LOG_MASUK');
  assert.equal(login('SM112', rs.data.password_sementara).code, 'AKAUN_TIDAK_AKTIF');
  assert.ok(ctx.getById('akaun', g.akaunId), 'rekod tidak dipadam');
  assert.equal(ctx.query('guru', { guru_kod: 'SM112' })[0].aktif, false);
  call('AKAUN_SET_AKTIF', { akaun_id: g.akaunId, aktif: true }, superToken);
  assert.equal(login('SM112', rs.data.password_sementara).ok, true);

  assert.equal(call('AKAUN_TUKAR_ROLE', { akaun_id: g.akaunId, role: 'raja' }, superToken).code, 'VALIDASI');
  assert.equal(call('AKAUN_TUKAR_ROLE', { akaun_id: g.akaunId, role: 'pentadbir' }, superToken).data.role, 'pentadbir');
});

test('perlindungan superadmin terakhir dan tindakan ke atas diri sendiri', () => {
  const { ctx, call, superToken, ciptaGuru } = setupWithSuperadmin();
  const saId = ctx.query('akaun', { role: 'superadmin' })[0].id;
  assert.equal(call('AKAUN_SET_AKTIF', { akaun_id: saId, aktif: false }, superToken).code, 'TIDAK_DIBENARKAN');
  assert.equal(call('AKAUN_TUKAR_ROLE', { akaun_id: saId, role: 'guru' }, superToken).code, 'TIDAK_DIBENARKAN');
  assert.equal(call('AKAUN_RESET_PASSWORD', { akaun_id: saId }, superToken).code, 'TIDAK_DIBENARKAN');
  const sa2 = ciptaGuru('SA002', 'superadmin');
  // SA002 boleh turunkan SA001 kerana masih ada superadmin lain (SA002)
  assert.equal(call('AKAUN_TUKAR_ROLE', { akaun_id: saId, role: 'pentadbir' }, sa2.token).ok, true);
  // kini SA002 superadmin terakhir: tiada siapa boleh menurunkannya
  assert.equal(ctx.query('akaun', { role: 'superadmin', aktif: true }).length, 1);
});

test('senarai akaun tidak mendedahkan hash atau salt', () => {
  const { call, superToken, ciptaGuru } = setupWithSuperadmin();
  ciptaGuru('SM114');
  const r = call('AKAUN_SENARAI', {}, superToken);
  assert.equal(r.data.length, 2);
  assert.doesNotMatch(JSON.stringify(r), /salt|password_hash|v1\$/);
});

test('audit_log merekod tindakan penting tanpa kata laluan', () => {
  const { ctx, login, ciptaGuru } = setupWithSuperadmin();
  ciptaGuru('SM115');
  login('SM115', 'SalahBetul1');
  const t = ctx.query('audit_log', {}).map((a) => a.tindakan);
  ['AKAUN_CIPTA', 'LOGIN_BERJAYA', 'LOGIN_GAGAL', 'SETUJU_PDPA', 'TUKAR_PASSWORD'].forEach((x) => assert.ok(t.includes(x), x));
  assert.doesNotMatch(JSON.stringify(ctx.query('audit_log', {})), /KataLaluanBaru1|SalahBetul1/);
});

test('ciptaSuperadminPertama: guna Script Properties, sekali sahaja', () => {
  const { ctx, env } = loadReady();
  assert.throws(() => ctx.ciptaSuperadminPertama(), /BOOTSTRAP_GURU_KOD/);
  env.props.BOOTSTRAP_GURU_KOD = 'sm900';
  env.props.BOOTSTRAP_NAMA = 'Pemilik Contoh';
  const r = ctx.ciptaSuperadminPertama();
  assert.equal(r.guru_kod, 'SM900');
  assert.equal(env.props.BOOTSTRAP_GURU_KOD, undefined, 'property dipadam');
  assert.ok(env.logs.some((l) => l.includes(r.password_sementara)));
  assert.throws(() => ctx.ciptaSuperadminPertama(), /sudah wujud/);
  const l = JSON.parse(JSON.stringify(ctx.handleRequest(JSON.stringify({ action: 'LOGIN', params: { guru_kod: 'SM900', password: r.password_sementara } }))));
  assert.equal(l.data.sesi.role, 'superadmin');
});

test('cipta akaun dengan status Percubaan dan tarikh lantikan', () => {
  const { ctx, call, superToken } = setupWithSuperadmin();
  const r = call('AKAUN_CIPTA', { guru_kod: 'SMP01', nama_penuh: 'Guru Percubaan', status_lantikan: 'percubaan', role: 'guru', tarikh_lantikan: '2026-03-01' }, superToken);
  assert.equal(r.ok, true, r.message);
  const g = ctx.query('guru', { guru_kod: 'SMP01' })[0];
  assert.deepEqual([g.status_lantikan, g.tarikh_lantikan], ['percubaan', '2026-03-01']);
  assert.equal(call('AKAUN_CIPTA', { guru_kod: 'SMP02', nama_penuh: 'Guru Praktikal', status_lantikan: 'praktikal', role: 'guru' }, superToken).ok, true);
  assert.equal(call('AKAUN_CIPTA', { guru_kod: 'SMP03', nama_penuh: 'Guru Kontrak', status_lantikan: 'kontrak', role: 'guru' }, superToken).code, 'VALIDASI', 'kontrak tiada lagi');
  assert.equal(call('AKAUN_CIPTA', { guru_kod: 'SMP04', nama_penuh: 'Masa Depan', status_lantikan: 'percubaan', role: 'guru', tarikh_lantikan: '2030-01-01' }, superToken).code, 'VALIDASI');
});

test('akaun sistem (ADMIN01): bukan guru, dikecualikan daripada senarai dan kiraan', () => {
  const { ctx, call, superToken, ciptaGuru } = setupWithSuperadmin();
  const adm = ciptaGuru('ADX01', 'pentadbir');
  assert.equal(call('AKAUN_CIPTA', { guru_kod: 'ADMIN99', nama_penuh: 'Akaun Ujian', status_lantikan: 'lain_lain', role: 'guru', akaun_sistem: true }, superToken).code, 'VALIDASI', 'akaun sistem mesti pentadbir/superadmin');
  const r = call('AKAUN_CIPTA', { guru_kod: 'ADMIN01', nama_penuh: 'Pentadbir Sistem', status_lantikan: 'lain_lain', role: 'superadmin', akaun_sistem: true }, superToken);
  assert.equal(r.ok, true, r.message);
  assert.equal(r.data.akaun.akaun_sistem, true);
  const senarai = call('GURU_SENARAI', {}, adm.token).data.guru.map((g) => g.guru_kod);
  assert.ok(!senarai.includes('ADMIN01'));
  assert.ok(senarai.includes('SA001'), 'akaun bukan sistem kekal dalam senarai guru');
  const d = call('DASHBOARD', {}, adm.token).data.guru.map((g) => g.guru_kod);
  assert.ok(!d.includes('ADMIN01'));
  assert.ok(!call('KOKU_URUS', {}, adm.token).data.ref.guru.some((g) => g.guru_kod === 'ADMIN01'));
  assert.ok(!call('HEM_URUS', {}, adm.token).data.guru_tanpa_usrah.some((g) => g.guru_kod === 'ADMIN01'));
  assert.ok(!call('IMPORT_RUJUKAN', {}, adm.token).data.guru.some((g) => g.guru_kod === 'ADMIN01'));
  assert.ok(call('AKAUN_SENARAI', {}, superToken).data.some((a) => a.guru_kod === 'ADMIN01' && a.akaun_sistem), 'masih dalam Urus akaun');
  assert.ok(ctx);
});

test('ciptaSuperadminPertama mencipta akaun sistem', () => {
  const { ctx, env } = loadReady();
  env.props.BOOTSTRAP_GURU_KOD = 'ADMIN01';
  env.props.BOOTSTRAP_NAMA = 'Pentadbir Sistem';
  ctx.ciptaSuperadminPertama();
  const g = ctx.query('guru', { guru_kod: 'ADMIN01' })[0];
  assert.equal(g.akaun_sistem, true);
  assert.equal(ctx.senaraiGuruMengajar().length, 0);
});

test('setupTemplate mencipta tab paparan lihat_akaun dengan formula (tiada UUID dipaparkan)', () => {
  const { env } = loadReady();
  const sh = env.ss.getSheetByName('lihat_akaun');
  assert.ok(sh);
  assert.deepEqual(sh.grid[0].slice(0, 3), ['ID guru', 'Nama', 'Peranan']);
  assert.match(sh.grid[1][0], /^=ARRAYFORMULA\(IF\(akaun!A2:A="","",XLOOKUP\(akaun!B2:B,guru!A2:A,guru!B2:B,"\?"\)\)\)$/);
  assert.match(sh.grid[1][1], /guru!C2:C/, 'nama_penuh');
});
