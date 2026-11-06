/**
 * Api.gs — satu pintu masuk untuk semua permintaan daripada frontend.
 *
 * Bentuk permintaan (POST, badan JSON):  { "action": "NAMA_AKSI", "token": "...", "params": { ... } }
 * Bentuk jawapan:  { "ok": true, "data": ... }  atau  { "ok": false, "code": "KOD", "message": "..." }
 *
 * Peraturan:
 *   - Hanya LOGIN tidak memerlukan token. Setiap aksi lain melalui requireAuth() dahulu.
 *   - Aksi yang tidak dikenali tanpa token mendapat jawapan yang sama seperti aksi sebenar
 *     (TIDAK_LOG_MASUK), supaya orang luar tidak dapat meneka senarai aksi.
 *   - Guru yang belum tukar kata laluan sementara atau belum bersetuju dengan notis privasi
 *     hanya boleh memanggil aksi bertanda `allowPending`.
 *   - Ralat tidak dijangka tidak membocorkan butiran dalaman kepada pelayar.
 */

var R_SEMUA = ['guru', 'pentadbir', 'superadmin'];
var R_ADMIN = ['pentadbir', 'superadmin'];
var R_SUPER = ['superadmin'];

var _ACTIONS = null;

/**
 * SENARAI SEMUA AKSI DAN SIAPA BOLEH MEMANGGILNYA.
 * Semak di sini dahulu ketika audit keselamatan.
 */
function getActions() {
  if (_ACTIONS) return _ACTIONS;
  _ACTIONS = {
    // ---- Auth (Fasa 1) ----
    LOGIN:                { public: true, handler: aksiLogin },
    LOGOUT:               { roles: R_SEMUA, allowPending: true, handler: aksiLogout },
    SESI_SAYA:            { roles: R_SEMUA, allowPending: true, handler: aksiSesiSaya },
    TUKAR_PASSWORD:       { roles: R_SEMUA, allowPending: true, handler: aksiTukarPassword },
    SETUJU_PDPA:          { roles: R_SEMUA, allowPending: true, handler: aksiSetujuPdpa },
    // ---- Urus akaun ----
    AKAUN_SENARAI:        { roles: R_ADMIN, handler: aksiAkaunSenarai },
    AKAUN_BUKA_KUNCI:     { roles: R_ADMIN, handler: aksiAkaunBukaKunci },
    AKAUN_CIPTA:          { roles: R_SUPER, handler: aksiAkaunCipta },
    AKAUN_RESET_PASSWORD: { roles: R_SUPER, handler: aksiAkaunResetPassword },
    AKAUN_SET_AKTIF:      { roles: R_SUPER, handler: aksiAkaunSetAktif },
    AKAUN_TUKAR_ROLE:     { roles: R_SUPER, handler: aksiAkaunTukarRole },
    // ---- Profil guru (Fasa 2) — pemilikan disemak dalam _sasaranGuru() ----
    PROFIL_LIHAT:         { roles: R_SEMUA, handler: aksiProfilLihat },
    PROFIL_SIMPAN_TERAS:  { roles: R_SEMUA, handler: aksiProfilSimpanTeras },
    REKOD_SIMPAN:         { roles: R_SEMUA, handler: aksiRekodSimpan },
    REKOD_PADAM:          { roles: R_SEMUA, handler: aksiRekodPadam },
    GAMBAR_SIMPAN:        { roles: R_SEMUA, handler: aksiGambarSimpan },
    GAMBAR_PADAM:         { roles: R_SEMUA, handler: aksiGambarPadam },
    CERAPAN_SIMPAN:       { roles: R_ADMIN, handler: aksiCerapanSimpan },
    GURU_SENARAI:         { roles: R_ADMIN, handler: aksiGuruSenarai },
    SUBJEK_SENARAI:       { roles: R_SEMUA, handler: aksiSubjekSenarai },
    SUBJEK_SIMPAN:        { roles: R_SUPER, handler: aksiSubjekSimpan }
  };
  Object.keys(_ACTIONS).forEach(function (k) {
    var d = _ACTIONS[k];
    if (!d.public && !(Array.isArray(d.roles) && d.roles.length)) throw new Error('Aksi ' + k + ' tiada senarai peranan.');
    if (typeof d.handler !== 'function') throw new Error('Aksi ' + k + ' tiada handler.');
  });
  return _ACTIONS;
}

function handleRequest(raw) {
  try {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_REQUEST_CHARS) {
      throw new AppError('PERMINTAAN_TIDAK_SAH', 'Permintaan tidak sah.');
    }
    var req;
    try { req = JSON.parse(raw); } catch (e) { throw new AppError('PERMINTAAN_TIDAK_SAH', 'Permintaan tidak sah.'); }
    if (!req || typeof req !== 'object' || typeof req.action !== 'string' || !/^[A-Z][A-Z0-9_]{1,39}$/.test(req.action)) {
      throw new AppError('PERMINTAAN_TIDAK_SAH', 'Permintaan tidak sah.');
    }
    var params = (req.params && typeof req.params === 'object' && !Array.isArray(req.params)) ? req.params : {};
    var actions = getActions();
    var def = Object.prototype.hasOwnProperty.call(actions, req.action) ? actions[req.action] : null;

    if (def && def.public === true) {
      return { ok: true, data: def.handler(null, params) };
    }
    var ctx = requireAuth(req.token, def ? def.roles : null);   // langkah pertama untuk semua aksi lain
    if (!def) throw new AppError('AKSI_TIDAK_DIKENALI', 'Aksi tidak dikenali.');
    if (ctx.pending && !def.allowPending) {
      throw new AppError('PERLU_TINDAKAN', 'Sila setuju dengan notis privasi dan tukar kata laluan sementara dahulu.');
    }
    return { ok: true, data: def.handler(ctx, params) };
  } catch (err) {
    if (err instanceof AppError || (err && err.name === 'AppError')) {
      return { ok: false, code: err.code, message: err.message, details: err.details || undefined };
    }
    Logger.log('RALAT: ' + (err && err.stack ? err.stack : err));
    return { ok: false, code: 'RALAT_SERVER', message: 'Ralat tidak dijangka berlaku. Cuba lagi sebentar.' };
  }
}

function doPost(e) {
  return jsonOut(handleRequest(e && e.postData ? e.postData.contents : ''));
}

function doGet() {
  return jsonOut({ ok: false, code: 'KAEDAH_TIDAK_DIBENARKAN', message: 'Gunakan POST.' });
}
