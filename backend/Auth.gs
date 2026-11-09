/**
 * Auth.gs — log masuk, sesi, kata laluan dan persetujuan PDPA.
 *
 * Ringkasan cara ia berfungsi (bahasa mudah):
 *  - Kata laluan tidak pernah disimpan. Yang disimpan ialah "cap jari" (hash) daripada:
 *      pepper (rahsia dalam Script Properties) + salt (rawak, unik setiap guru) + kata laluan,
 *    dikira dengan SHA-256 berulang kali (HASH_ITERATIONS) supaya meneka secara pukal jadi lambat.
 *  - Bila log masuk berjaya, server cipta token rawak dan simpan dalam tab `sessions`
 *    bersama masa luput. Frontend hantar token ini setiap kali. Server semak setiap kali.
 *  - Log keluar memadam token di server. Token lama terus tidak berguna.
 *  - Maksimum 8 percubaan gagal setiap 5 minit bagi setiap ID guru (CacheService).
 */

var HASH_VERSION = 'v1';
var HASH_ITERATIONS = 1000;      // naikkan jika mahu lebih kuat; turunkan jika log masuk terlalu lambat
var SESSION_TTL_DAYS = 30;          // sesi kekal 30 hari; dilanjutkan automatik bila guru aktif
var SESSION_RENEW_AFTER_HOURS = 24; // lanjutkan paling kerap sekali sehari (kurangkan tulisan ke Sheet)
var LOGIN_MAX_CUBA = 8;
var LOGIN_TETINGKAP_SAAT = 300;  // 5 minit
var PASSWORD_MIN = 8;
var PASSWORD_MAX = 100;
var GURU_KOD_RE = /^[A-Z0-9][A-Z0-9_-]{1,19}$/;

// ---------------------------------------------------------------------------
// Hash kata laluan
// ---------------------------------------------------------------------------

function _sha256Hex(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function _pepper() {
  var p = PropertiesService.getScriptProperties().getProperty(PROP.PEPPER);
  if (!p) throw new AppError('SETUP_BELUM_SIAP', 'Sistem belum disediakan. Jalankan setupTemplate() dahulu.');
  return p;
}

/** Pulangkan rentetan "v1$<ulangan>$<hex>" supaya bilangan ulangan boleh diubah kemudian tanpa rosakkan hash lama. */
function hashPassword(password, salt, iterations) {
  var n = iterations || HASH_ITERATIONS;
  var h = _sha256Hex(_pepper() + '|' + salt + '|' + password);
  for (var i = 1; i < n; i++) h = _sha256Hex(h + salt);
  return HASH_VERSION + '$' + n + '$' + h;
}

/** Bandingkan tanpa berhenti awal, supaya masa jawapan tidak membocorkan berapa aksara yang betul. */
function _samaMasaTetap(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function verifyPassword(password, salt, stored) {
  var parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== HASH_VERSION) return false;
  var n = parseInt(parts[1], 10);
  if (!(n >= 1 && n <= 100000)) return false;
  return _samaMasaTetap(hashPassword(password, salt, n), stored);
}

function newSalt() {
  return (uuid() + uuid()).replace(/-/g, '');
}

/** Kata laluan sementara 10 aksara, tanpa aksara yang mengelirukan (0/O, 1/l/I). */
function janaPasswordSementara() {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // 56 aksara
  var out = '';
  while (out.length < 10) {
    var hex = uuid().replace(/-/g, '');
    for (var i = 0; i + 1 < hex.length && out.length < 10; i += 2) {
      var b = parseInt(hex.substr(i, 2), 16);
      if (b < 224) out += abc.charAt(b % 56); // tolak 224..255 supaya tiada berat sebelah
    }
  }
  return out;
}

/** Peraturan kata laluan. Pulangkan mesej ralat, atau null jika lulus. */
function semakPolisiPassword(pw, guruKod) {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) return 'Kata laluan mesti sekurang-kurangnya ' + PASSWORD_MIN + ' aksara.';
  if (pw.length > PASSWORD_MAX) return 'Kata laluan terlalu panjang (maksimum ' + PASSWORD_MAX + ' aksara).';
  if (guruKod && pw.trim().toUpperCase() === String(guruKod).toUpperCase()) return 'Kata laluan tidak boleh sama dengan ID guru.';
  return null;
}

// ---------------------------------------------------------------------------
// Had percubaan log masuk
// ---------------------------------------------------------------------------

function _kunciKey(kod) { return 'login:' + kod; }

function _bacaCubaan(kod) {
  var v = CacheService.getScriptCache().get(_kunciKey(kod));
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

function semakHadCubaan(kod) {
  var c = _bacaCubaan(kod);
  if (c && c.n >= LOGIN_MAX_CUBA && c.until > Date.now()) {
    var minit = Math.max(1, Math.ceil((c.until - Date.now()) / 60000));
    throw new AppError('TERLALU_BANYAK_CUBAAN', 'Terlalu banyak percubaan log masuk. Cuba lagi dalam ' + minit + ' minit, atau minta pentadbir buka kunci.');
  }
}

function catatCubaanGagal(kod) {
  var c = _bacaCubaan(kod);
  if (!c || c.until <= Date.now()) c = { n: 0, until: Date.now() + LOGIN_TETINGKAP_SAAT * 1000 };
  c.n++;
  var ttl = Math.max(1, Math.ceil((c.until - Date.now()) / 1000));
  CacheService.getScriptCache().put(_kunciKey(kod), JSON.stringify(c), ttl);
}

function bukaKunci(kod) { CacheService.getScriptCache().remove(_kunciKey(kod)); }

function adaKunci(kod) {
  var c = _bacaCubaan(kod);
  return !!(c && c.n >= LOGIN_MAX_CUBA && c.until > Date.now());
}

// ---------------------------------------------------------------------------
// Sesi
// ---------------------------------------------------------------------------

/*
 * Cache sesi (kelajuan): selepas token disahkan daripada Sheet, akaun dan guru disimpan dalam CacheService
 * selama SESI_CACHE_SAAT. Keselamatan dijaga dengan pembatalan SERTA-MERTA:
 *  - token dipadam/diubah dalam tab `sessions` (log keluar, reset, nyahaktif, tukar peranan, tamat) -> entri dibuang
 *  - akaun atau guru dikemas kini (peranan, aktif, PDPA, kata laluan) -> nombor versi berubah, entri tidak sah
 */
var SESI_CACHE_SAAT = 300;

function _versi(c, key) { return c[key] || '0'; }

/** Dipanggil oleh Repository selepas setiap tulisan. */
function onTulisJadual(name, row) {
  var c = CacheService.getScriptCache();
  if (name === 'sessions' && row.token) c.remove('sesi:' + row.token);
  else if (name === 'akaun' && row.id) c.put('av:' + row.id, uuid(), 21600);
  else if (name === 'guru' && row.id) c.put('gv:' + row.id, uuid(), 21600);
}

function _sesiDariCache(token) {
  var c = CacheService.getScriptCache();
  var v = c.get('sesi:' + token);
  if (!v) return null;
  var o;
  try { o = JSON.parse(v); } catch (e) { return null; }
  var ver = c.getAll(['av:' + o.akaun.id, 'gv:' + o.guru.id]);
  if (_versi(ver, 'av:' + o.akaun.id) !== o.av || _versi(ver, 'gv:' + o.guru.id) !== o.gv) { c.remove('sesi:' + token); return null; }
  return o;
}

function _simpanSesiCache(token, expiry, akaun, guru) {
  var c = CacheService.getScriptCache();
  var ver = c.getAll(['av:' + akaun.id, 'gv:' + guru.id]);
  c.put('sesi:' + token, JSON.stringify({ expiry: expiry, akaun: akaun, guru: guru, av: _versi(ver, 'av:' + akaun.id), gv: _versi(ver, 'gv:' + guru.id) }), SESI_CACHE_SAAT);
}

function _tolakSesi(msg) {
  throw new AppError('TIDAK_LOG_MASUK', msg || 'Sesi tidak sah atau telah tamat. Sila log masuk semula.');
}

/**
 * Langkah pertama setiap aksi selain LOGIN.
 * roles: senarai peranan dibenarkan (null = mana-mana peranan yang sah).
 * Peranan dibaca daripada akaun SEMASA, bukan daripada sesi, jadi perubahan peranan berkuat kuasa serta-merta.
 */
function requireAuth(token, roles) {
  if (typeof token !== 'string' || !UUID_RE.test(token)) _tolakSesi();
  var s, akaun, guru;
  var cached = _sesiDariCache(token);
  if (cached) {
    s = { token: token, expiry: cached.expiry }; akaun = cached.akaun; guru = cached.guru;
  } else {
    s = getById('sessions', token);
    if (!s) _tolakSesi();
  }
  if (!(Date.parse(s.expiry) > Date.now())) {
    remove('sessions', token);
    _tolakSesi('Sesi anda telah tamat. Sila log masuk semula.');
  }
  if (!cached) {
    akaun = getById('akaun', s.akaun_id);
    guru = akaun ? getById('guru', akaun.guru_id) : null;
  }
  if (!akaun || !akaun.aktif || !guru || !guru.aktif) {
    remove('sessions', token);
    _tolakSesi();
  }
  if (!cached) _simpanSesiCache(token, s.expiry, akaun, guru);
  if (roles && roles.indexOf(akaun.role) === -1) {
    throw new AppError('TIADA_KEBENARAN', 'Anda tiada kebenaran untuk tindakan ini.');
  }
  // Sesi bergerak: jika sudah lebih sehari sejak dilanjutkan, mulakan semula kiraan 30 hari.
  var expiry = s.expiry;
  var penuh = SESSION_TTL_DAYS * 86400000;
  if (Date.parse(s.expiry) - Date.now() < penuh - SESSION_RENEW_AFTER_HOURS * 3600000) {
    expiry = _expiryBaharu();
    update('sessions', token, { expiry: expiry });
  }
  return {
    token: token, expiry: expiry, akaunId: akaun.id, guruId: guru.id, guruKod: guru.guru_kod, role: akaun.role,
    pending: !!akaun.wajib_tukar_password || !akaun.persetujuan_pdpa_pada,
    akaun: akaun, guru: guru
  };
}

function _expiryBaharu() {
  return toIso(new Date(Date.now() + SESSION_TTL_DAYS * 86400000));
}

function bersihkanSesiTamat() {
  var now = Date.now();
  query('sessions', {}).forEach(function (s) {
    if (!(Date.parse(s.expiry) > now)) remove('sessions', s.token);
  });
}

function _padamSesiAkaun(akaunId, kecualiToken) {
  query('sessions', { akaun_id: akaunId }).forEach(function (s) {
    if (s.token !== kecualiToken) remove('sessions', s.token);
  });
}

function _ringkasanSesi(akaun, guru) {
  return {
    akaun_id: akaun.id, guru_id: guru.id, guru_kod: guru.guru_kod, nama_penuh: guru.nama_penuh, role: akaun.role,
    akaun_sistem: !!guru.akaun_sistem,
    wajib_tukar_password: !!akaun.wajib_tukar_password,
    perlu_persetujuan_pdpa: !akaun.persetujuan_pdpa_pada
  };
}

// ---------------------------------------------------------------------------
// Aksi
// ---------------------------------------------------------------------------

function aksiLogin(ctx, params) {
  var kod = pStr(params, 'guru_kod', { label: 'ID guru', max: 20, upper: true, re: GURU_KOD_RE, reMsg: 'ID guru tidak sah. Contoh: SM216.' });
  var pw = params.password;
  if (typeof pw !== 'string' || pw.length === 0) throw new AppError('VALIDASI', 'Masukkan kata laluan.', { field: 'password' });
  if (pw.length > PASSWORD_MAX) pw = pw.slice(0, PASSWORD_MAX + 1); // tetap gagal, tanpa kos hash besar

  semakHadCubaan(kod);

  var guru = query('guru', { guru_kod: kod })[0] || null;
  var akaun = guru ? (query('akaun', { guru_id: guru.id })[0] || null) : null;
  var ok;
  if (akaun) ok = verifyPassword(pw, akaun.salt, akaun.password_hash);
  else { hashPassword(pw, 'tiada-akaun'); ok = false; } // masa jawapan sama sama ada ID wujud atau tidak

  if (!ok) {
    catatCubaanGagal(kod);
    if (akaun) update('akaun', akaun.id, { percubaan_gagal: Math.min(1000, (akaun.percubaan_gagal || 0) + 1) }, { actorId: 'sistem' });
    logAudit(akaun ? akaun.id : null, 'LOGIN_GAGAL', kod);
    throw new AppError('LOGIN_GAGAL', 'ID guru atau kata laluan salah.');
  }
  if (!akaun.aktif || !guru.aktif) {
    logAudit(akaun.id, 'LOGIN_DITOLAK_TIDAK_AKTIF', kod);
    throw new AppError('AKAUN_TIDAK_AKTIF', 'Akaun anda tidak aktif. Hubungi pentadbir sistem.');
  }

  bukaKunci(kod);
  bersihkanSesiTamat();
  if (akaun.percubaan_gagal) update('akaun', akaun.id, { percubaan_gagal: 0 }, { actorId: 'sistem' });

  var token = uuid();
  var expiry = _expiryBaharu();
  insert('sessions', { token: token, akaun_id: akaun.id, role: akaun.role, expiry: expiry });
  logAudit(akaun.id, 'LOGIN_BERJAYA', kod);
  return { token: token, expiry: expiry, sesi: _ringkasanSesi(akaun, guru) };
}

function aksiLogout(ctx) {
  remove('sessions', ctx.token);
  logAudit(ctx.akaunId, 'LOGOUT', ctx.guruKod);
  return { selesai: true };
}

function aksiSesiSaya(ctx) {
  var r = _ringkasanSesi(ctx.akaun, ctx.guru);
  r.expiry = ctx.expiry;
  return r;
}

function aksiTukarPassword(ctx, params) {
  var lama = params.password_lama, baru = params.password_baru;
  if (typeof lama !== 'string' || !lama) throw new AppError('VALIDASI', 'Masukkan kata laluan semasa.', { field: 'password_lama' });
  semakHadCubaan(ctx.guruKod);
  if (!verifyPassword(lama.slice(0, PASSWORD_MAX + 1), ctx.akaun.salt, ctx.akaun.password_hash)) {
    catatCubaanGagal(ctx.guruKod);
    throw new AppError('PASSWORD_LAMA_SALAH', 'Kata laluan semasa tidak betul.', { field: 'password_lama' });
  }
  var err = semakPolisiPassword(baru, ctx.guruKod);
  if (err) throw new AppError('VALIDASI', err, { field: 'password_baru' });
  if (baru === lama) throw new AppError('VALIDASI', 'Kata laluan baharu mesti berbeza daripada yang lama.', { field: 'password_baru' });

  var salt = newSalt();
  update('akaun', ctx.akaunId, {
    salt: salt, password_hash: hashPassword(baru, salt), wajib_tukar_password: false, percubaan_gagal: 0
  }, { actorId: ctx.akaunId });
  _padamSesiAkaun(ctx.akaunId, ctx.token); // log keluar peranti lain
  logAudit(ctx.akaunId, 'TUKAR_PASSWORD', ctx.guruKod);
  return _ringkasanSesi(getById('akaun', ctx.akaunId), ctx.guru);
}

function aksiSetujuPdpa(ctx, params) {
  if (params.setuju !== true) throw new AppError('VALIDASI', 'Sila tandakan persetujuan untuk meneruskan.', { field: 'setuju' });
  var akaun = ctx.akaun;
  if (!akaun.persetujuan_pdpa_pada) {
    akaun = update('akaun', ctx.akaunId, { persetujuan_pdpa_pada: nowIso() }, { actorId: ctx.akaunId });
    logAudit(ctx.akaunId, 'SETUJU_PDPA', ctx.guruKod, 'Versi notis ' + PDPA_VERSI);
  }
  return _ringkasanSesi(akaun, ctx.guru);
}

/** Naikkan nombor ini jika isi notis privasi berubah dengan ketara (rekod dalam audit_log). */
var PDPA_VERSI = '1.2'; // 1.1: emel ditambah; 1.2: tempoh simpanan 2 tahun + muat turun data sendiri
