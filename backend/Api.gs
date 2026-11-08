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
    CERAPAN_SIMPAN:       { roles: R_SEMUA, handler: aksiCerapanSimpan },
    PERCUBAAN_SAHKAN:     { roles: R_ADMIN, handler: aksiPercubaanSahkan },
    GURU_SENARAI:         { roles: R_ADMIN, handler: aksiGuruSenarai },
    SUBJEK_SENARAI:       { roles: R_SEMUA, handler: aksiSubjekSenarai },
    SUBJEK_SIMPAN:        { roles: R_SUPER, handler: aksiSubjekSimpan },
    // ---- Kurikulum (Fasa 3) — pemilikan disemak dalam _sasaranGuru() ----
    KURIKULUM_LIHAT:      { roles: R_SEMUA, handler: aksiKurikulumLihat },
    SLOT_SIMPAN:          { roles: R_SEMUA, handler: aksiSlotSimpan },
    SLOT_PADAM:           { roles: R_SEMUA, handler: aksiSlotPadam },
    WARNA_JADUAL_SIMPAN:  { roles: R_SEMUA, handler: aksiWarnaJadualSimpan },
    SLOT_KOSONG:          { roles: R_ADMIN, handler: aksiSlotKosong },
    SLOT_KOSONG_RUJUKAN:  { roles: R_ADMIN, handler: aksiSlotKosongRujukan },
    KURIKULUM_RUJUKAN:    { roles: R_SUPER, handler: aksiKurikulumRujukan },
    KELAS_PUKAL:          { roles: R_SUPER, handler: aksiKelasPukal },
    KELAS_PADAM:          { roles: R_SUPER, handler: aksiKelasPadam },
    SUBJEK_PUKAL:         { roles: R_SUPER, handler: aksiSubjekPukal },
    WAKTU_SIMPAN:         { roles: R_SUPER, handler: aksiWaktuSimpan },
    HAD_SIMPAN:           { roles: R_SUPER, handler: aksiHadSimpan },
    // ---- Import pukal (pentadbir) ----
    IMPORT_RUJUKAN:       { roles: R_ADMIN, handler: aksiImportRujukan },
    JADUAL_IMPORT:        { roles: R_ADMIN, handler: aksiJadualImport },
    TUGASAN_IMPORT:       { roles: R_ADMIN, handler: aksiTugasanImport },
    // ---- Kokurikulum (Fasa 4) — keahlian unit & rumah guna REKOD_SIMPAN/REKOD_PADAM ----
    KOKU_LIHAT:           { roles: R_SEMUA, handler: aksiKokuLihat },
    PERTANDINGAN_SIMPAN:  { roles: R_SEMUA, handler: aksiPertandinganSimpan },
    PENYERTAAN_SIMPAN:    { roles: R_SEMUA, handler: aksiPenyertaanSimpan },
    PENYERTAAN_PADAM:     { roles: R_SEMUA, handler: aksiPenyertaanPadam },
    PERTANDINGAN_PADAM:   { roles: R_ADMIN, handler: aksiPertandinganPadam },
    KOKU_URUS:            { roles: R_ADMIN, handler: aksiKokuUrus },
    UNIT_SIMPAN:          { roles: R_ADMIN, handler: aksiUnitSimpan },
    UNIT_PADAM:           { roles: R_ADMIN, handler: aksiUnitPadam },
    UNIT_SALIN:           { roles: R_ADMIN, handler: aksiUnitSalin },
    RUMAH_SIMPAN:         { roles: R_ADMIN, handler: aksiRumahSimpan },
    JUARA_SIMPAN:         { roles: R_ADMIN, handler: aksiJuaraSimpan },
    JUARA_IMPORT:         { roles: R_ADMIN, handler: aksiJuaraImport },
    // ---- HEM (Fasa 5) — usrah pelajar & peranan HEM guna REKOD_SIMPAN/REKOD_PADAM ----
    HEM_LIHAT:            { roles: R_SEMUA, handler: aksiHemLihat },
    USRAH_SESI_LIHAT:     { roles: R_SEMUA, handler: aksiUsrahSesiLihat },   // murabbi, ahli (diri sendiri) atau pentadbir
    USRAH_SESI_SIMPAN:    { roles: R_SEMUA, handler: aksiUsrahSesiSimpan },  // murabbi kumpulan sahaja
    USRAH_SESI_PADAM:     { roles: R_SEMUA, handler: aksiUsrahSesiPadam },   // murabbi kumpulan sahaja
    HEM_URUS:             { roles: R_ADMIN, handler: aksiHemUrus },
    USRAH_GURU_SIMPAN:    { roles: R_ADMIN, handler: aksiUsrahGuruSimpan },
    USRAH_AHLI_SIMPAN:    { roles: R_ADMIN, handler: aksiUsrahAhliSimpan },
    USRAH_GURU_PADAM:     { roles: R_ADMIN, handler: aksiUsrahGuruPadam },
    // ---- Dashboard (Fasa 6) ----
    DASHBOARD:            { roles: R_ADMIN, handler: aksiDashboard }
  };
  Object.keys(_ACTIONS).forEach(function (k) {
    var d = _ACTIONS[k];
    if (!d.public && !(Array.isArray(d.roles) && d.roles.length)) throw new Error('Aksi ' + k + ' tiada senarai peranan.');
    if (typeof d.handler !== 'function') throw new Error('Aksi ' + k + ' tiada handler.');
  });
  return _ACTIONS;
}

function handleRequest(raw) {
  var t0 = Date.now(), namaAksi = '?';
  mulaPermintaan();
  try {
    return _handleRequest(raw, function (a) { namaAksi = a; });
  } finally {
    // Ukuran masa untuk diagnosis kelajuan (Apps Script > Executions > log)
    Logger.log('[MASA] ' + namaAksi + ': ' + (Date.now() - t0) + ' ms, ' + bilanganBacaan() + ' bacaan tab');
    tamatPermintaan();
  }
}

function _handleRequest(raw, catatAksi) {
  try {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_REQUEST_CHARS) {
      throw new AppError('PERMINTAAN_TIDAK_SAH', 'Permintaan tidak sah.');
    }
    var req;
    try { req = JSON.parse(raw); } catch (e) { throw new AppError('PERMINTAAN_TIDAK_SAH', 'Permintaan tidak sah.'); }
    if (!req || typeof req !== 'object' || typeof req.action !== 'string' || !/^[A-Z][A-Z0-9_]{1,39}$/.test(req.action)) {
      throw new AppError('PERMINTAAN_TIDAK_SAH', 'Permintaan tidak sah.');
    }
    catatAksi(req.action);
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
