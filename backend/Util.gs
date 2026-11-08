/**
 * Util.gs — fungsi bantuan kecil yang tidak bergantung pada modul lain.
 * Fungsi "tulen" (tanpa akses Sheets) diletakkan di sini supaya mudah diuji di Node.
 */

/** Ralat yang selamat dipaparkan kepada pengguna (mesej Bahasa Melayu). */
function AppError(code, message, details) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.details = details || null;
}
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

function uuid() {
  return Utilities.getUuid();
}

/** Masa semasa dalam ISO 8601 zon Asia/Kuala_Lumpur, contoh 2026-11-06T18:30:00+08:00 */
function nowIso() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
var YEAR_RE = /^\d{4}$/;
var DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

function isIsoDate(s) {
  var m = DATE_RE.exec(String(s));
  if (!m) return false;
  var y = +m[1], mo = +m[2], d = +m[3];
  var dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// ---------------------------------------------------------------------------
// Keselamatan data masuk
// ---------------------------------------------------------------------------

/**
 * Pertahankan daripada formula injection. Nilai teks yang bermula dengan = + - @
 * (atau tab / carriage return) diawali dengan ' supaya Sheets menganggapnya teks.
 * Hanya string disentuh; nombor dan boolean dibiarkan.
 */
function sanitizeForSheet(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

/** Songsangan sanitizeForSheet semasa membaca. */
function unsanitizeFromSheet(v) {
  if (typeof v !== 'string') return v;
  return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v;
}

/**
 * Format IC Malaysia: 6 digit tarikh lahir, 2 digit tempat lahir, 4 digit akhir.
 * Buang nombor yang menyerupai IC daripada teks bebas. Sistem ini tidak boleh
 * menyimpan IC langsung, jadi bahagian itu diabaikan (dibuang), bukan disimpan.
 */
function stripIdentityNumbers(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/(^|[^0-9])(\d{6}-?\d{2}-?\d{4})(?![0-9])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Respons JSON
// ---------------------------------------------------------------------------

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Tarikh JS -> ISO 8601 zon Asia/Kuala_Lumpur. */
function toIso(date) {
  return Utilities.formatDate(date, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// ---------------------------------------------------------------------------
// Pengesahan parameter daripada frontend (semua disemak di server)
// ---------------------------------------------------------------------------

/** Ambil teks. opt: { label, min, max, re, upper, optional } */
function pStr(params, key, opt) {
  opt = opt || {};
  var label = opt.label || key;
  var v = params[key];
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    if (opt.optional) return null;
    throw new AppError('VALIDASI', label + ' wajib diisi.', { field: key });
  }
  if (typeof v !== 'string') throw new AppError('VALIDASI', label + ' tidak sah.', { field: key });
  v = v.trim();
  if (opt.upper) v = v.toUpperCase();
  if (opt.min && v.length < opt.min) throw new AppError('VALIDASI', label + ' terlalu pendek (minimum ' + opt.min + ' aksara).', { field: key });
  if (v.length > (opt.max || 200)) throw new AppError('VALIDASI', label + ' terlalu panjang.', { field: key });
  if (opt.re && !opt.re.test(v)) throw new AppError('VALIDASI', opt.reMsg || (label + ' tidak sah.'), { field: key });
  return v;
}

function pUuid(params, key, label) {
  var v = params[key];
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new AppError('VALIDASI', (label || key) + ' tidak sah.', { field: key });
  return v;
}

function pBool(params, key, label) {
  var v = params[key];
  if (v !== true && v !== false) throw new AppError('VALIDASI', (label || key) + ' mesti ya atau tidak.', { field: key });
  return v;
}

function pOneOf(params, key, allowed, label) {
  var v = params[key];
  if (allowed.indexOf(v) === -1) throw new AppError('VALIDASI', (label || key) + ' tidak sah.', { field: key });
  return v;
}

// ---------------------------------------------------------------------------
// Log audit
// ---------------------------------------------------------------------------

/** Rekod tindakan penting. Kegagalan menulis log tidak menggagalkan tindakan utama, tetapi dicatat. */
function logAudit(akaunId, tindakan, sasaran, butiran) {
  try {
    appendLog('audit_log', {
      masa: nowIso(), akaun_id: akaunId || null, tindakan: tindakan,
      sasaran: sasaran ? String(sasaran).slice(0, 200) : null,
      butiran: butiran ? String(butiran).slice(0, 1000) : null
    });
  } catch (e) {
    Logger.log('Gagal menulis audit_log: ' + e.message);
  }
}

/** Tahun akademik semasa, contoh "2026". */
function tahunSemasa() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy');
}

// ---------------------------------------------------------------------------
// Nombor telefon
// ---------------------------------------------------------------------------

/** Terima "012-345 6789", "+6012...", "6012..." -> "0123456789". Pulangkan null jika tidak sah. */
function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  var d = input.replace(/[\s\-().]/g, '');
  if (/^\+60\d+$/.test(d)) d = '0' + d.slice(3);
  else if (/^60\d{9,10}$/.test(d)) d = '0' + d.slice(2);
  return /^0\d{8,10}$/.test(d) ? d : null;
}

/** "0123456789" -> "012-3456789" */
function formatPhone(d) {
  if (!d) return null;
  return d.slice(0, 3) + '-' + d.slice(3);
}

/** "0123456789" -> "012-***-**89". Tiga digit awal dan dua digit akhir sahaja kelihatan. */
function maskPhone(d) {
  if (!d) return null;
  d = String(d).replace(/\D/g, '');
  if (d.length < 7) return '***';
  return d.slice(0, 3) + '-' + new Array(d.length - 7 + 1).join('*') + '-**' + d.slice(-2);
}
