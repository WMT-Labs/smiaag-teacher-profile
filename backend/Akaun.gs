/**
 * Akaun.gs — pengurusan akaun oleh superadmin (dan buka kunci oleh pentadbir).
 *
 * - Cipta akaun: sistem jana kata laluan sementara, dipaparkan SEKALI kepada superadmin.
 * - Reset kata laluan: kata laluan sementara baharu, guru wajib tukar semasa log masuk.
 * - Nyahaktif: rekod kekal, guru tidak boleh log masuk. Semua sesinya dipadam.
 * - Tiada fungsi "lupa kata laluan" melalui emel pada fasa ini.
 */

var SEMUA_ROLE = ['guru', 'pentadbir', 'superadmin'];

function _akaunDanGuru(akaunId) {
  var akaun = getById('akaun', akaunId);
  if (!akaun) throw new AppError('TIDAK_JUMPA', 'Akaun tidak dijumpai.');
  return { akaun: akaun, guru: getById('guru', akaun.guru_id) };
}

function _bukanDiriSendiri(ctx, akaunId, msg) {
  if (ctx.akaunId === akaunId) throw new AppError('TIDAK_DIBENARKAN', msg);
}

/** Pastikan sentiasa ada sekurang-kurangnya seorang superadmin aktif. */
function _pastikanAdaSuperadminLain(akaunId) {
  var lain = query('akaun', { role: 'superadmin', aktif: true }).filter(function (a) { return a.id !== akaunId; });
  if (!lain.length) throw new AppError('TIDAK_DIBENARKAN', 'Mesti ada sekurang-kurangnya seorang superadmin aktif.');
}

function _barisAkaun(akaun, guru) {
  return {
    akaun_id: akaun.id, guru_id: guru ? guru.id : null,
    guru_kod: guru ? guru.guru_kod : '', nama_penuh: guru ? guru.nama_penuh : '',
    status_lantikan: guru ? guru.status_lantikan : null, email: guru ? guru.email : null,
    akaun_sistem: !!(guru && guru.akaun_sistem),
    role: akaun.role, aktif: !!akaun.aktif,
    wajib_tukar_password: !!akaun.wajib_tukar_password,
    persetujuan_pdpa_pada: akaun.persetujuan_pdpa_pada,
    percubaan_gagal: akaun.percubaan_gagal || 0,
    dikunci: guru ? adaKunci(guru.guru_kod) : false,
    dinyahaktif_pada: guru ? guru.dinyahaktif_pada : null,
    tarikh_layak_padam: guru && !akaun.aktif ? tarikhLayakPadam(guru) : null
  };
}

function aksiAkaunSenarai(ctx) {
  var guruById = {};
  query('guru', {}).forEach(function (g) { guruById[g.id] = g; });
  return query('akaun', {})
    .map(function (a) { return _barisAkaun(a, guruById[a.guru_id]); })
    .sort(function (x, y) { return x.guru_kod < y.guru_kod ? -1 : 1; });
}

/** opts: { tarikh_lantikan, email, akaun_sistem } */
function _ciptaAkaunDalaman(kod, nama, status, role, actorId, opts) {
  opts = typeof opts === 'string' ? { tarikh_lantikan: opts } : (opts || {});
  if (query('guru', { guru_kod: kod }).length) throw new AppError('DUPLIKAT', 'ID guru ' + kod + ' sudah wujud.', { field: 'guru_kod' });
  var email = _semakEmel(opts.email, null);
  var guru = insert('guru', { guru_kod: kod, nama_penuh: nama, status_lantikan: status, tarikh_lantikan: opts.tarikh_lantikan || null,
    email: email, akaun_sistem: opts.akaun_sistem === true }, { actorId: actorId });
  var pw = janaPasswordSementara();
  var salt = newSalt();
  var akaun;
  try {
    akaun = insert('akaun', { guru_id: guru.id, salt: salt, password_hash: hashPassword(pw, salt), role: role, wajib_tukar_password: true }, { actorId: actorId });
  } catch (e) {
    remove('guru', guru.id); // jangan tinggalkan guru tanpa akaun
    throw e;
  }
  return { akaun: akaun, guru: guru, password: pw };
}

/**
 * Hantar kata laluan sementara ke emel guru (jika ada).
 * Emel dihantar daripada akaun Google yang men-deploy Web App ("Execute as: Me").
 * Script Properties pilihan: LAMAN_URL (pautan laman sistem), EMEL_BALAS (alamat untuk balasan).
 * Kata laluan TIDAK direkod dalam audit_log.
 */
function _hantarEmelKataLaluan(guru, pw, jenis) {
  if (!guru || !guru.email) return { dihantar: false, sebab: 'tiada_emel' };
  var props = PropertiesService.getScriptProperties();
  var laman = props.getProperty('LAMAN_URL') || '';
  var baris = [
    'Assalamualaikum ' + (guru.nama_penuh || '') + ',',
    '',
    jenis === 'reset' ? 'Kata laluan akaun Profil Guru SMIAAG anda telah diset semula.' : 'Akaun Profil Guru SMIAAG telah dicipta untuk anda.',
    '',
    'ID guru: ' + guru.guru_kod,
    'Kata laluan sementara: ' + pw,
    ''
  ];
  if (laman) baris.push('Log masuk di: ' + laman, '');
  baris.push(
    'Anda akan diminta menukar kata laluan ini semasa log masuk pertama. Jangan kongsi kata laluan ini dengan sesiapa.',
    '',
    'Jika anda tidak menjangka emel ini, sila maklumkan kepada pentadbir sistem.',
    '',
    'Sistem Profil Guru SMIAAG (emel automatik)'
  );
  var opts = { to: guru.email, subject: jenis === 'reset' ? 'Kata laluan sementara baharu: Profil Guru SMIAAG' : 'Akaun Profil Guru SMIAAG anda', body: baris.join('\n'), name: 'Profil Guru SMIAAG' };
  var balas = props.getProperty('EMEL_BALAS');
  if (balas) opts.replyTo = balas;
  try {
    MailApp.sendEmail(opts);
    return { dihantar: true, ke: guru.email };
  } catch (e) {
    Logger.log('Emel gagal: ' + e.message);
    return { dihantar: false, ke: guru.email, ralat: 'Kuota emel harian mungkin sudah habis, atau alamat ditolak.' };
  }
}

function aksiAkaunCipta(ctx, params) {
  var kod = pStr(params, 'guru_kod', { label: 'ID guru', upper: true, max: 20, re: GURU_KOD_RE, reMsg: 'ID guru hanya huruf, nombor, - atau _ (contoh SM216).' });
  var nama = pStr(params, 'nama_penuh', { label: 'Nama penuh', min: 3, max: 150 });
  var status = pStr(params, 'status_lantikan', { label: 'Status lantikan', max: 30 });
  var role = pOneOf(params, 'role', SEMUA_ROLE, 'Peranan');
  var tarikh = pStr(params, 'tarikh_lantikan', { label: 'Tarikh lantikan', max: 10, optional: true });
  if (tarikh && tarikh > hariIni()) throw new AppError('VALIDASI', 'Tarikh lantikan tidak boleh pada masa depan.', { field: 'tarikh_lantikan' });
  var sistem = params.akaun_sistem === true;
  if (sistem && role === 'guru') throw new AppError('VALIDASI', 'Akaun sistem mesti berperanan Pentadbir atau Superadmin.', { field: 'role' });
  var r = _ciptaAkaunDalaman(kod, nama, status, role, ctx.akaunId, {
    tarikh_lantikan: tarikh, akaun_sistem: sistem,
    email: pStr(params, 'email', { label: 'Emel', max: 254, optional: true })
  });
  var emel = _hantarEmelKataLaluan(r.guru, r.password, 'cipta');
  logAudit(ctx.akaunId, 'AKAUN_CIPTA', kod, 'peranan=' + role + (emel.dihantar ? '; emel dihantar ke ' + emel.ke : ''));
  return { akaun: _barisAkaun(r.akaun, r.guru), password_sementara: r.password, emel: emel };
}

function aksiAkaunResetPassword(ctx, params) {
  var id = pUuid(params, 'akaun_id', 'Akaun');
  _bukanDiriSendiri(ctx, id, 'Untuk akaun sendiri, guna menu Tukar kata laluan.');
  var x = _akaunDanGuru(id);
  var pw = janaPasswordSementara();
  var salt = newSalt();
  var akaun = update('akaun', id, { salt: salt, password_hash: hashPassword(pw, salt), wajib_tukar_password: true, percubaan_gagal: 0 }, { actorId: ctx.akaunId });
  _padamSesiAkaun(id, null);
  if (x.guru) bukaKunci(x.guru.guru_kod);
  var emel = _hantarEmelKataLaluan(x.guru, pw, 'reset');
  logAudit(ctx.akaunId, 'AKAUN_RESET_PASSWORD', x.guru ? x.guru.guru_kod : id, emel.dihantar ? 'emel dihantar ke ' + emel.ke : null);
  return { akaun: _barisAkaun(akaun, x.guru), password_sementara: pw, emel: emel };
}

function aksiAkaunSetAktif(ctx, params) {
  var id = pUuid(params, 'akaun_id', 'Akaun');
  var aktif = pBool(params, 'aktif', 'Status aktif');
  _bukanDiriSendiri(ctx, id, 'Anda tidak boleh menyahaktifkan akaun sendiri.');
  var x = _akaunDanGuru(id);
  if (!aktif && x.akaun.role === 'superadmin') _pastikanAdaSuperadminLain(id);
  var akaun = update('akaun', id, { aktif: aktif }, { actorId: ctx.akaunId });
  if (x.guru) update('guru', x.guru.id, { aktif: aktif, dinyahaktif_pada: aktif ? null : nowIso() }, { actorId: ctx.akaunId });
  if (!aktif) _padamSesiAkaun(id, null);
  logAudit(ctx.akaunId, aktif ? 'AKAUN_AKTIFKAN' : 'AKAUN_NYAHAKTIF', x.guru ? x.guru.guru_kod : id);
  return _barisAkaun(akaun, getById('guru', akaun.guru_id));
}

function aksiAkaunTukarRole(ctx, params) {
  var id = pUuid(params, 'akaun_id', 'Akaun');
  var role = pOneOf(params, 'role', SEMUA_ROLE, 'Peranan');
  _bukanDiriSendiri(ctx, id, 'Anda tidak boleh menukar peranan akaun sendiri.');
  var x = _akaunDanGuru(id);
  if (x.akaun.role === 'superadmin' && role !== 'superadmin') _pastikanAdaSuperadminLain(id);
  var akaun = update('akaun', id, { role: role }, { actorId: ctx.akaunId });
  _padamSesiAkaun(id, null); // paksa log masuk semula supaya menu sepadan dengan peranan baharu
  logAudit(ctx.akaunId, 'AKAUN_TUKAR_ROLE', x.guru ? x.guru.guru_kod : id, x.akaun.role + ' -> ' + role);
  return _barisAkaun(akaun, x.guru);
}

function aksiAkaunBukaKunci(ctx, params) {
  var id = pUuid(params, 'akaun_id', 'Akaun');
  var x = _akaunDanGuru(id);
  if (x.guru) bukaKunci(x.guru.guru_kod);
  var akaun = update('akaun', id, { percubaan_gagal: 0 }, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'AKAUN_BUKA_KUNCI', x.guru ? x.guru.guru_kod : id);
  return _barisAkaun(akaun, x.guru);
}

/**
 * Cipta superadmin pertama (sekali sahaja, dijalankan dari editor Apps Script).
 *  1. Project Settings > Script Properties: tambah BOOTSTRAP_GURU_KOD (contoh ADMIN01) dan BOOTSTRAP_NAMA
 *     (contoh "Pentadbir Sistem"). Akaun ini ialah AKAUN SISTEM (bukan guru) dan tidak dikira sebagai guru.
 *  2. Pilih fungsi ini, tekan Run. Kata laluan sementara dipaparkan dalam Execution log.
 *  3. Log masuk dan tukar kata laluan. Dua property tadi dipadam automatik.
 * Fungsi ini menolak jika superadmin sudah wujud.
 */
function ciptaSuperadminPertama() {
  var props = PropertiesService.getScriptProperties();
  if (query('akaun', { role: 'superadmin' }).length) throw new Error('Superadmin sudah wujud. Guna halaman Urus akaun untuk akaun lain.');
  var kod = String(props.getProperty('BOOTSTRAP_GURU_KOD') || '').trim().toUpperCase();
  var nama = String(props.getProperty('BOOTSTRAP_NAMA') || '').trim();
  if (!GURU_KOD_RE.test(kod) || nama.length < 3) {
    throw new Error('Tetapkan dahulu BOOTSTRAP_GURU_KOD dan BOOTSTRAP_NAMA dalam Project Settings > Script Properties.');
  }
  var r = _ciptaAkaunDalaman(kod, nama, 'lain_lain', 'superadmin', 'setup', { akaun_sistem: true });
  props.deleteProperty('BOOTSTRAP_GURU_KOD');
  props.deleteProperty('BOOTSTRAP_NAMA');
  logAudit(r.akaun.id, 'AKAUN_CIPTA_SUPERADMIN_PERTAMA', kod);
  Logger.log('Superadmin dicipta.\nID guru: ' + kod + '\nKata laluan sementara: ' + r.password + '\nLog masuk sekarang dan tukar kata laluan.');
  return { guru_kod: kod, password_sementara: r.password };
}
