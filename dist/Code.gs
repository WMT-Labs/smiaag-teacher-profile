// DIJANA AUTOMATIK oleh scripts/bundle-gas.js. Jangan edit di sini; edit fail dalam backend/.

// ======================================================================
// Config.gs
// ======================================================================
/**
 * Config.gs — pemalar dan akses kepada Spreadsheet.
 *
 * Tiada rahsia di sini. Semua rahsia (pepper, ID Sheet, API key) disimpan dalam
 * PropertiesService (Project Settings > Script Properties) dan TIDAK masuk repo.
 */

var APP_NAME = 'SMIAAG Teacher Profiling';
var APP_VERSION = '0.1.0-fasa0';
var TZ = 'Asia/Kuala_Lumpur';

/** Nama kunci dalam PropertiesService. */
var PROP = {
  SS_ID: 'SS_ID',     // ID Google Sheet (diisi automatik oleh setupTemplate)
  PEPPER: 'PEPPER'    // rahsia tambahan untuk hash kata laluan (dijana oleh setupTemplate)
};

/** Had saiz badan permintaan (aksara). Dinaikkan nanti untuk import PDF. */
var MAX_REQUEST_CHARS = 60000;

/**
 * Dapatkan Spreadsheet pangkalan data.
 * Guna ID dalam Script Properties; jika tiada, cuba spreadsheet yang script ini terikat padanya.
 */
function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP.SS_ID);
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new AppError('SETUP_BELUM_SIAP', 'Pangkalan data belum disediakan. Jalankan setupTemplate() dahulu.');
  }
  return ss;
}

// ======================================================================
// Util.gs
// ======================================================================
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

// ======================================================================
// Schema.gs
// ======================================================================
/**
 * Schema.gs — definisi semua jadual (tab Sheets) dalam satu tempat.
 *
 * Ini "sumber kebenaran" untuk: pembinaan template Sheets, pengesahan data dalam
 * lapisan repository, ujian automatik, dan (Fasa 7) skrip SQL Supabase.
 *
 * Format setiap lajur: "nama:jenis[julat]!=lalai"
 *   jenis   : text | uuid | int | num | bool | date | time | datetime | year
 *             | fk(jadual)      -> kunci asing, mesti wujud dalam jadual itu
 *             | enum(ref_xxx)   -> nilai mesti ada (lajur `kod`) dalam jadual ref_xxx
 *   [a..b]  : julat dibenarkan untuk int/num
 *   !       : wajib diisi
 *   =lalai  : nilai lalai jika tidak diberi semasa insert (true/false/nombor/teks)
 *
 * Tarikh disimpan sebagai ISO (YYYY-MM-DD), masa sebagai HH:MM, tahun_akademik sebagai "2026".
 * Nama jadual dan lajur: snake_case, tanpa ruang.
 */

var SYSTEM_COLS = ['created_at', 'updated_at', 'updated_by'];

/** Perkataan yang tidak dibenarkan menjadi nama lajur (data yang tidak boleh disimpan). */
var FORBIDDEN_COLUMN_WORDS = ['gaji', 'salary', 'ic', 'no_ic', 'no_kp', 'kad_pengenalan', 'mykad', 'passport', 'pasport'];

var _TABLE_DEFS = {
  // ---- Teras ----
  guru: {
    cols: ['id:uuid!', 'guru_kod:text!', 'nama_penuh:text!', 'status_lantikan:enum(ref_status_lantikan)!',
      'jawatan:text', 'tarikh_lantikan:date', 'no_telefon:text', 'gambar_ref:text', 'aktif:bool!=true'],
    unique: [['guru_kod']]
  },
  akaun: {
    // persetujuan_pdpa_pada ialah tambahan kepada dokumen asal: rekod bila guru bersetuju (Seksyen 9).
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'salt:text!', 'password_hash:text!', 'role:enum(ref_role)!',
      'wajib_tukar_password:bool!=true', 'percubaan_gagal:int[0..1000]!=0', 'persetujuan_pdpa_pada:datetime', 'aktif:bool!=true'],
    unique: [['guru_id']]
  },
  sessions: {
    pk: 'token', audit: false,
    cols: ['token:uuid!', 'akaun_id:fk(akaun)!', 'role:enum(ref_role)!', 'expiry:datetime!']
  },
  kelayakan: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahap:enum(ref_tahap_kelayakan)!', 'bidang:text', 'institusi:text', 'tahun_tamat:year']
  },
  opsyen_guru: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'jenis:enum(ref_jenis_opsyen)!', 'subjek_id:fk(subjek)!'],
    unique: [['guru_id', 'jenis', 'subjek_id']]
  },
  kursus: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tajuk:text!', 'penganjur:text', 'tarikh_mula:date', 'tarikh_tamat:date',
      'jam:num[0..1000]', 'tahap:enum(ref_peringkat_kursus)!']
  },
  cerapan: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'tarikh_dirancang:date', 'tarikh_sebenar:date',
      'pencerap:text', 'subjek_id:fk(subjek)', 'kelas_id:fk(kelas)', 'skor_atau_gred:text', 'ulasan_ringkas:text',
      'status:enum(ref_status_cerapan)!=dirancang']
  },
  sasaran_cerapan: {
    // guru_id kosong = nilai lalai sekolah; ada guru_id = sasaran khusus guru itu.
    cols: ['id:uuid!', 'tahun_akademik:year!', 'guru_id:fk(guru)', 'bilangan_sasaran_setahun:int[0..20]!'],
    unique: [['tahun_akademik', 'guru_id']]
  },
  audit_log: {
    audit: false,
    cols: ['id:uuid!', 'masa:datetime!', 'akaun_id:fk(akaun)', 'tindakan:text!', 'sasaran:text', 'butiran:text']
  },

  // ---- Kurikulum ----
  subjek: {
    cols: ['id:uuid!', 'nama:text!', 'kod:text', 'kategori:enum(ref_kategori_subjek)!=subjek'],
    unique: [['nama']]
  },
  kelas: {
    cols: ['id:uuid!', 'nama:text!', 'tingkatan:int[1..6]!', 'tahun_akademik:year!'],
    unique: [['nama', 'tahun_akademik']]
  },
  tugasan_guru: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'jenis_tugasan:enum(ref_jenis_tugasan)!',
      'kumpulan:enum(ref_kumpulan_tugasan)!', 'nama_tugasan:text!', 'subjek_id:fk(subjek)', 'bilangan_kelas:int[0..50]',
      'jabatan:enum(ref_jabatan)', 'jam_kredit:num[0..40]!']
  },
  jadual_slot: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'hari:enum(ref_hari)!', 'masa_mula:time!', 'masa_akhir:time!',
      'subjek_id:fk(subjek)', 'kelas_id:fk(kelas)', 'tempoh:int[1..20]', 'sumber:enum(ref_sumber_slot)!=manual', 'disahkan:bool!=false']
  },
  had_jam_kredit: {
    cols: ['id:uuid!', 'tahun_akademik:year!', 'had_berjadual:num[0..80]!=22', 'had_tidak_berjadual:num[0..80]!=10'],
    unique: [['tahun_akademik']]
  },

  // ---- Kokurikulum ----
  unit_kokurikulum: {
    cols: ['id:uuid!', 'nama:text!', 'jenis:enum(ref_jenis_unit)!', 'tahun_akademik:year!'],
    unique: [['nama', 'tahun_akademik']]
  },
  keahlian_unit: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'unit_id:fk(unit_kokurikulum)!', 'tahun_akademik:year!', 'jawatan:enum(ref_jawatan_unit)!'],
    unique: [['guru_id', 'unit_id', 'tahun_akademik']]
  },
  rumah_sukan: {
    cols: ['id:uuid!', 'nama:text!', 'warna:text'],
    unique: [['nama']]
  },
  guru_rumah: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'rumah_sukan_id:fk(rumah_sukan)!', 'tahun_akademik:year!', 'jawatan:text'],
    unique: [['guru_id', 'tahun_akademik']]
  },
  juara_rumah_sukan: {
    cols: ['id:uuid!', 'tahun_akademik:year!', 'rumah_sukan_id:fk(rumah_sukan)!', 'kedudukan:int[1..4]!', 'catatan:text'],
    unique: [['tahun_akademik', 'rumah_sukan_id'], ['tahun_akademik', 'kedudukan']]
  },
  pertandingan: {
    cols: ['id:uuid!', 'nama_acara:text!', 'peringkat:enum(ref_peringkat_pertandingan)!', 'tarikh:date', 'bilangan_murid:int[0..2000]',
      'pencapaian:text', 'unit_id:fk(unit_kokurikulum)', 'tahun_akademik:year!']
  },
  penyertaan_pertandingan: {
    cols: ['id:uuid!', 'pertandingan_id:fk(pertandingan)!', 'guru_id:fk(guru)!', 'peranan:enum(ref_peranan_pertandingan)!'],
    unique: [['pertandingan_id', 'guru_id']]
  },

  // ---- HEM ----
  kumpulan_usrah_pelajar: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'nama_kumpulan:text!', 'tingkatan:int[1..6]',
      'hari:enum(ref_hari)', 'bilangan_murid:int[0..500]']
  },
  usrah_guru: {
    cols: ['id:uuid!', 'tahun_akademik:year!', 'murabbi_guru_id:fk(guru)!', 'nama_kumpulan:text!', 'hari:enum(ref_hari)']
  },
  keahlian_usrah_guru: {
    cols: ['id:uuid!', 'usrah_guru_id:fk(usrah_guru)!', 'guru_id:fk(guru)!'],
    unique: [['usrah_guru_id', 'guru_id']]
  },
  kehadiran_usrah_guru: {
    cols: ['id:uuid!', 'usrah_guru_id:fk(usrah_guru)!', 'guru_id:fk(guru)!', 'tarikh:date!', 'hadir:bool!', 'catatan:text'],
    unique: [['usrah_guru_id', 'guru_id', 'tarikh']]
  },
  peranan_hem: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'jenis:enum(ref_jenis_peranan_hem)!', 'kelas_id:fk(kelas)', 'butiran:text']
  }
};

/**
 * Jadual rujukan (ref_*). Setiap satu: id, kod, label, susunan, aktif (+ lajur audit).
 * Lajur bernilai terhad dalam jadual lain menyimpan `kod`. Kod dalam snake_case
 * (contoh "al-quran-tutorial" dalam dokumen ditulis `al_quran_tutorial`).
 * Superadmin boleh menambah/menyahaktifkan nilai (diurus pada Fasa 1+).
 */
var REF_SEEDS = {
  ref_status_lantikan: [['tetap', 'Tetap'], ['kontrak', 'Kontrak'], ['lain_lain', 'Lain-lain']],
  ref_role: [['guru', 'Guru'], ['pentadbir', 'Pentadbir'], ['superadmin', 'Superadmin']],
  ref_tahap_kelayakan: [['sijil', 'Sijil'], ['diploma', 'Diploma'], ['ijazah_sarjana_muda', 'Ijazah Sarjana Muda'],
    ['ijazah_sarjana', 'Ijazah Sarjana'], ['doktor_falsafah', 'Doktor Falsafah'], ['lain_lain', 'Lain-lain']],
  ref_jenis_opsyen: [['major', 'Major'], ['minor', 'Minor']],
  ref_peringkat_kursus: [['sekolah', 'Sekolah'], ['daerah', 'Daerah'], ['negeri', 'Negeri'], ['kebangsaan', 'Kebangsaan'], ['lain_lain', 'Lain-lain']],
  ref_status_cerapan: [['dirancang', 'Dirancang'], ['selesai', 'Selesai'], ['ditunda', 'Ditunda']],
  ref_kategori_subjek: [['subjek', 'Subjek'], ['al_quran_tutorial', 'Al-Quran / Tutorial'], ['lain', 'Lain']],
  ref_jenis_tugasan: [['berjadual', 'Berjadual'], ['tidak_berjadual', 'Tidak berjadual']],
  ref_kumpulan_tugasan: [['subjek', 'Subjek'], ['al_quran_tutorial', 'Al-Quran / Tutorial'], ['aktiviti_lain', 'Aktiviti lain'],
    ['tugasan_tidak_berjadual', 'Tugasan tidak berjadual']],
  ref_jabatan: [['KURI', 'Kurikulum'], ['HEM', 'Hal Ehwal Murid'], ['KOKU', 'Kokurikulum'], ['lain_lain', 'Lain-lain']],
  ref_hari: [['isnin', 'Isnin'], ['selasa', 'Selasa'], ['rabu', 'Rabu'], ['khamis', 'Khamis'], ['jumaat', 'Jumaat'], ['sabtu', 'Sabtu'], ['ahad', 'Ahad']],
  ref_sumber_slot: [['pdf', 'Import PDF'], ['manual', 'Manual']],
  ref_jenis_unit: [['badan_beruniform', 'Badan beruniform'], ['kelab_persatuan', 'Kelab / persatuan'], ['pasukan_sekolah', 'Pasukan sekolah']],
  ref_jawatan_unit: [['penasihat', 'Penasihat'], ['penyelaras', 'Penyelaras'], ['ajk', 'AJK'], ['lain_lain', 'Lain-lain']],
  ref_peringkat_pertandingan: [['sekolah', 'Sekolah'], ['daerah', 'Daerah'], ['negeri', 'Negeri'], ['kebangsaan', 'Kebangsaan']],
  ref_peranan_pertandingan: [['pengurus', 'Pengurus'], ['jurulatih', 'Jurulatih'], ['pengiring', 'Pengiring'], ['lain_lain', 'Lain-lain']],
  ref_jenis_peranan_hem: [['guru_tarbiah', 'Guru Tarbiah'], ['guru_kelas', 'Guru Kelas'], ['bidang_disiplin', 'Bidang Disiplin']]
};

var REF_COLS = ['id:uuid!', 'kod:text!', 'label:text!', 'susunan:int[0..1000]!=0', 'aktif:bool!=true'];

/** Jenis lajur teks yang dianggap "medan bebas" dan dihadkan lebih panjang. */
var LONG_TEXT_COLS = ['ulasan_ringkas', 'butiran', 'catatan', 'pencapaian'];
var MAX_TEXT = 200;
var MAX_LONG_TEXT = 1000;

/** Hasil parse: SCHEMA[jadual] = {name, pk, audit, isRef, columns[], defs{}, unique[]} */
var SCHEMA = (function () {
  function parseCol(spec, table) {
    var m = /^([a-z0-9_]+):([^!=]+?)(!)?(?:=(.*))?$/.exec(spec);
    if (!m) throw new Error('Spesifikasi lajur tidak sah: ' + table + '.' + spec);
    var def = { name: m[1], type: 'text', required: !!m[3], fk: null, ref: null, min: null, max: null, def: undefined };
    var t = m[2], r;
    if ((r = /^fk\(([a-z0-9_]+)\)$/.exec(t))) { def.type = 'uuid'; def.fk = r[1]; }
    else if ((r = /^enum\(([a-z0-9_]+)\)$/.exec(t))) { def.type = 'text'; def.ref = r[1]; }
    else if ((r = /^(int|num)\[(-?[\d.]+)\.\.(-?[\d.]+)\]$/.exec(t))) { def.type = r[1]; def.min = +r[2]; def.max = +r[3]; }
    else def.type = t;
    if (m[4] !== undefined) {
      var d = m[4];
      def.def = d === 'true' ? true : d === 'false' ? false : (/^-?\d+(\.\d+)?$/.test(d) ? +d : d);
    }
    if (def.name === 'id' || def.name === 'token') def.required = true;
    return def;
  }
  function build(name, d, isRef) {
    var cols = d.cols.slice();
    var audit = d.audit !== false;
    var defs = {}, names = [];
    function add(spec) { var c = parseCol(spec, name); defs[c.name] = c; names.push(c.name); }
    cols.forEach(add);
    if (audit) { add('created_at:datetime'); add('updated_at:datetime'); add('updated_by:text'); }
    return { name: name, pk: d.pk || 'id', audit: audit, isRef: !!isRef, columns: names, defs: defs, unique: d.unique || [] };
  }
  var out = {};
  Object.keys(REF_SEEDS).forEach(function (n) { out[n] = build(n, { cols: REF_COLS, unique: [['kod']] }, true); });
  Object.keys(_TABLE_DEFS).forEach(function (n) { out[n] = build(n, _TABLE_DEFS[n], false); });
  return out;
})();

/** Urutan tab dalam Sheets: ref_* dahulu, kemudian jadual data. */
var TABLE_ORDER = Object.keys(SCHEMA);

function getTableSchema(table) {
  var s = SCHEMA[table];
  if (!s) throw new AppError('JADUAL_TIDAK_WUJUD', 'Jadual tidak dikenali: ' + table);
  return s;
}

// ======================================================================
// Repository.gs
// ======================================================================
/**
 * Repository.gs — satu-satunya tempat yang menyentuh Google Sheets.
 *
 * Semua modul lain (auth, guru, kurikulum, ...) MESTI guna fungsi ini sahaja:
 *   getById(table, id)            -> objek atau null
 *   query(table, filter, opts)    -> senarai objek
 *   insert(table, row, ctx)       -> objek yang disimpan
 *   update(table, id, patch, ctx) -> objek selepas kemas kini
 *   remove(table, id, ctx)        -> true/false
 *
 * Kenapa begini: apabila pindah ke Supabase, hanya fail ini yang diganti.
 * Modul lain tidak perlu tahu data disimpan di mana.
 *
 * ctx (pilihan) = { actorId: 'id akaun yang membuat perubahan', skipFk: true (untuk import pukal) }
 *
 * Perkara yang fail ini lakukan untuk setiap penulisan:
 *   - semak lajur dikenali, jenis data, julat, nilai enum (ref_*), kunci asing, nilai unik
 *   - tolak lajur yang meniru data terlarang (gaji, IC) dan buang nombor IC daripada teks bebas
 *   - pertahankan daripada formula injection
 *   - isi id, created_at, updated_at, updated_by
 *   - guna kunci (lock) supaya dua penulisan serentak tidak bertembung
 */

var _REF_CACHE = {};

function _withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function _isDate(v) { return Object.prototype.toString.call(v) === '[object Date]'; }

// ---------------------------------------------------------------------------
// Membaca jadual
// ---------------------------------------------------------------------------

function _sheetOf(schema) {
  var sh = getSpreadsheet().getSheetByName(schema.name);
  if (!sh) throw new AppError('TAB_TIADA', 'Tab "' + schema.name + '" tiada dalam Sheet. Jalankan setupTemplate().');
  return sh;
}

function _checkHeaders(schema, headerRow) {
  for (var i = 0; i < schema.columns.length; i++) {
    if (String(headerRow[i]) !== schema.columns[i]) {
      throw new AppError('SKEMA_TIDAK_SEPADAN',
        'Lajur tab "' + schema.name + '" tidak sepadan dengan skema (lajur ' + (i + 1) + ' sepatutnya "' + schema.columns[i] + '").');
    }
  }
}

/** Tukar nilai sel kepada nilai JS mengikut jenis lajur. Sel kosong -> null. */
function _fromCell(def, v) {
  if (v === '' || v === null || v === undefined) return null;
  switch (def.type) {
    case 'bool': return v === true || String(v).toUpperCase() === 'TRUE';
    case 'int': case 'num': return Number(v);
    case 'date': return _isDate(v) ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v);
    case 'time': return _isDate(v) ? Utilities.formatDate(v, TZ, 'HH:mm') : String(v);
    case 'datetime': return _isDate(v) ? Utilities.formatDate(v, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX") : String(v);
    default: return unsanitizeFromSheet(String(v));
  }
}

function _toCell(def, v) {
  if (v === null || v === undefined) return '';
  return sanitizeForSheet(v);
}

function _readAll(schema) {
  var sh = _sheetOf(schema);
  var last = sh.getLastRow();
  var n = schema.columns.length;
  if (last < 1) throw new AppError('TAB_KOSONG', 'Tab "' + schema.name + '" tiada baris tajuk. Jalankan setupTemplate().');
  var values = sh.getRange(1, 1, last, n).getValues();
  _checkHeaders(schema, values[0]);
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var pkIdx = schema.columns.indexOf(schema.pk);
    if (values[r][pkIdx] === '' || values[r][pkIdx] === null) continue; // abaikan baris kosong
    var obj = { __row: r + 1 };
    for (var c = 0; c < n; c++) obj[schema.columns[c]] = _fromCell(schema.defs[schema.columns[c]], values[r][c]);
    rows.push(obj);
  }
  return { sheet: sh, rows: rows };
}

function _clean(obj) {
  if (!obj) return null;
  var o = {};
  Object.keys(obj).forEach(function (k) { if (k !== '__row') o[k] = obj[k]; });
  return o;
}

// ---------------------------------------------------------------------------
// API awam
// ---------------------------------------------------------------------------

function getById(table, id) {
  var s = getTableSchema(table);
  if (id === null || id === undefined || id === '') return null;
  var rows = _readAll(s).rows;
  for (var i = 0; i < rows.length; i++) if (rows[i][s.pk] === id) return _clean(rows[i]);
  return null;
}

/**
 * filter: { kolum: nilai }               sama dengan
 *         { kolum: [a, b] }              salah satu daripada
 *         { kolum: null }                kosong
 *         { kolum: { ne, gt, gte, lt, lte, in } }
 * opts  : { orderBy: 'kolum', desc: true, limit: 50, offset: 0 }
 */
function query(table, filter, opts) {
  var s = getTableSchema(table);
  filter = filter || {}; opts = opts || {};
  Object.keys(filter).forEach(function (k) {
    if (!s.defs[k]) throw new AppError('VALIDASI', 'Penapis menggunakan lajur yang tidak wujud: ' + k);
  });
  var rows = _readAll(s).rows.filter(function (row) {
    return Object.keys(filter).every(function (k) { return _matches(row[k], filter[k]); });
  });
  if (opts.orderBy) {
    if (!s.defs[opts.orderBy]) throw new AppError('VALIDASI', 'orderBy menggunakan lajur yang tidak wujud: ' + opts.orderBy);
    var dir = opts.desc ? -1 : 1, key = opts.orderBy;
    rows.sort(function (a, b) {
      var x = a[key], y = b[key];
      if (x === y) return 0;
      if (x === null) return 1;      // null sentiasa di hujung
      if (y === null) return -1;
      return (x < y ? -1 : 1) * dir;
    });
  }
  var off = opts.offset || 0;
  if (off || opts.limit) rows = rows.slice(off, opts.limit ? off + opts.limit : undefined);
  return rows.map(_clean);
}

function _matches(actual, cond) {
  if (cond === null) return actual === null;
  if (Array.isArray(cond)) return cond.indexOf(actual) !== -1;
  if (typeof cond === 'object') {
    if ('in' in cond && cond['in'].indexOf(actual) === -1) return false;
    if ('ne' in cond && actual === cond.ne) return false;
    if ('gt' in cond && !(actual !== null && actual > cond.gt)) return false;
    if ('gte' in cond && !(actual !== null && actual >= cond.gte)) return false;
    if ('lt' in cond && !(actual !== null && actual < cond.lt)) return false;
    if ('lte' in cond && !(actual !== null && actual <= cond.lte)) return false;
    return true;
  }
  return actual === cond;
}

function insert(table, row, ctx) {
  var s = getTableSchema(table);
  ctx = ctx || {};
  return _withLock(function () {
    var clean = _validate(s, row, true, ctx);
    if (!clean[s.pk]) clean[s.pk] = uuid();
    if (s.audit) {
      var now = nowIso();
      clean.created_at = now; clean.updated_at = now; clean.updated_by = ctx.actorId || null;
    }
    var data = _readAll(s);
    if (data.rows.some(function (r) { return r[s.pk] === clean[s.pk]; })) {
      throw new AppError('DUPLIKAT', 'Rekod dengan id ini sudah wujud.');
    }
    _checkUnique(s, clean, null, data.rows);
    var line = s.columns.map(function (c) { return _toCell(s.defs[c], clean[c]); });
    data.sheet.getRange(data.sheet.getLastRow() + 1, 1, 1, s.columns.length).setValues([line]);
    if (s.isRef) delete _REF_CACHE[s.name];
    return clean;
  });
}

function update(table, id, patch, ctx) {
  var s = getTableSchema(table);
  ctx = ctx || {};
  return _withLock(function () {
    var data = _readAll(s);
    var current = null;
    for (var i = 0; i < data.rows.length; i++) if (data.rows[i][s.pk] === id) current = data.rows[i];
    if (!current) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
    var clean = _validate(s, patch, false, ctx);
    var merged = {};
    s.columns.forEach(function (c) { merged[c] = (c in clean) ? clean[c] : current[c]; });
    if (s.audit) { merged.updated_at = nowIso(); merged.updated_by = ctx.actorId || null; }
    _checkUnique(s, merged, id, data.rows);
    var line = s.columns.map(function (c) { return _toCell(s.defs[c], merged[c]); });
    data.sheet.getRange(current.__row, 1, 1, s.columns.length).setValues([line]);
    if (s.isRef) delete _REF_CACHE[s.name];
    return merged;
  });
}

function remove(table, id, ctx) {
  var s = getTableSchema(table);
  return _withLock(function () {
    var data = _readAll(s);
    for (var i = 0; i < data.rows.length; i++) {
      if (data.rows[i][s.pk] === id) {
        data.sheet.deleteRow(data.rows[i].__row);
        if (s.isRef) delete _REF_CACHE[s.name];
        return true;
      }
    }
    return false;
  });
}

// ---------------------------------------------------------------------------
// Pengesahan
// ---------------------------------------------------------------------------

function _refKods(refTable) {
  if (!_REF_CACHE[refTable]) {
    _REF_CACHE[refTable] = _readAll(getTableSchema(refTable)).rows.map(function (r) { return r.kod; });
  }
  return _REF_CACHE[refTable];
}

function _bad(field, msg) { throw new AppError('VALIDASI', msg, { field: field }); }

/** Sahkan satu nilai mengikut definisi lajur dan pulangkan nilai kanonik (atau null). */
function _normalize(s, def, v, ctx) {
  var f = def.name;
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    return null;
  }
  switch (def.type) {
    case 'uuid':
      if (typeof v !== 'string' || !UUID_RE.test(v)) _bad(f, 'Medan "' + f + '" mesti ID yang sah.');
      break;
    case 'bool':
      if (v === true || v === 'TRUE' || v === 'true') v = true;
      else if (v === false || v === 'FALSE' || v === 'false') v = false;
      else _bad(f, 'Medan "' + f + '" mesti benar atau palsu.');
      break;
    case 'int': case 'num':
      if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) v = Number(v);
      if (typeof v !== 'number' || !isFinite(v)) _bad(f, 'Medan "' + f + '" mesti nombor.');
      if (def.type === 'int' && Math.floor(v) !== v) _bad(f, 'Medan "' + f + '" mesti nombor bulat.');
      if (def.min !== null && (v < def.min || v > def.max)) _bad(f, 'Medan "' + f + '" mesti antara ' + def.min + ' dan ' + def.max + '.');
      break;
    case 'date':
      if (!isIsoDate(v)) _bad(f, 'Tarikh "' + f + '" tidak sah. Guna format TTTT-BB-HH.');
      break;
    case 'time':
      if (typeof v !== 'string' || !TIME_RE.test(v)) _bad(f, 'Masa "' + f + '" tidak sah. Guna format JJ:MM.');
      break;
    case 'year':
      v = String(v);
      if (!YEAR_RE.test(v)) _bad(f, 'Medan "' + f + '" mesti tahun 4 digit, contoh 2026.');
      break;
    case 'datetime':
      if (typeof v !== 'string' || !DATETIME_RE.test(v)) _bad(f, 'Medan "' + f + '" mesti tarikh dan masa ISO.');
      break;
    default: { // text
      if (typeof v !== 'string') _bad(f, 'Medan "' + f + '" mesti teks.');
      var long = LONG_TEXT_COLS.indexOf(f) !== -1;
      var isIdLike = f === 'salt' || f === 'password_hash' || /_ref$/.test(f);
      v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
      if (!long) v = v.replace(/[\r\n\t]+/g, ' ');
      if (!isIdLike) v = stripIdentityNumbers(v);
      v = v.trim();
      if (v === '') return null;
      var max = isIdLike ? 500 : (long ? MAX_LONG_TEXT : MAX_TEXT);
      if (v.length > max) _bad(f, 'Medan "' + f + '" terlalu panjang (maksimum ' + max + ' aksara).');
    }
  }
  if (def.ref && _refKods(def.ref).indexOf(v) === -1) {
    _bad(f, 'Nilai "' + v + '" tidak dibenarkan untuk "' + f + '".');
  }
  if (def.fk && !ctx.skipFk && !getById(def.fk, v)) {
    _bad(f, 'Rekod rujukan untuk "' + f + '" tidak wujud.');
  }
  return v;
}

function _validate(s, row, isInsert, ctx) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new AppError('VALIDASI', 'Data tidak sah.');
  var clean = {};
  Object.keys(row).forEach(function (k) {
    var def = s.defs[k];
    if (!def) _bad(k, 'Lajur "' + k + '" tidak wujud dalam "' + s.name + '".');
    if (SYSTEM_COLS.indexOf(k) !== -1) _bad(k, 'Lajur "' + k + '" diurus oleh sistem.');
    if (!isInsert && k === s.pk) _bad(k, 'ID tidak boleh diubah.');
    clean[k] = _normalize(s, def, row[k], ctx);
  });
  s.columns.forEach(function (c) {
    var def = s.defs[c];
    if (SYSTEM_COLS.indexOf(c) !== -1 || c === s.pk) return;
    if (isInsert && clean[c] === undefined && def.def !== undefined) clean[c] = def.def;
    if (isInsert && clean[c] === undefined) clean[c] = null;
    if (def.required && clean[c] === null) _bad(c, 'Medan "' + c + '" wajib diisi.');
    if (!isInsert && c in clean && def.required && clean[c] === null) _bad(c, 'Medan "' + c + '" wajib diisi.');
  });
  return clean;
}

/** Semak kekangan unik. Nilai null dianggap sama (seperti NULLS NOT DISTINCT dalam Postgres). */
function _checkUnique(s, candidate, excludeId, rows) {
  s.unique.forEach(function (cols) {
    var clash = rows.some(function (r) {
      if (excludeId !== null && r[s.pk] === excludeId) return false;
      return cols.every(function (c) { return r[c] === candidate[c]; });
    });
    if (clash) throw new AppError('DUPLIKAT', 'Rekod yang sama sudah wujud (' + cols.join(', ') + ').', { fields: cols });
  });
}

// ======================================================================
// Setup.gs
// ======================================================================
/**
 * Setup.gs — menyediakan Google Sheet kosong menjadi pangkalan data sistem.
 *
 * Cara guna (sekali sahaja, selamat dijalankan berulang kali):
 *   1. Dalam editor Apps Script, pilih fungsi `setupTemplate` pada menu di atas, tekan Run.
 *   2. Benarkan kebenaran yang diminta (hanya akses kepada Sheet ini).
 *   3. Lihat "Execution log" di bawah untuk laporan.
 *
 * Fungsi ini TIDAK memadam data. Jika sesuatu tab sudah ada dan lajurnya salah,
 * ia berhenti dan memberitahu, bukan menimpa.
 */

function setupTemplate() {
  var report = [];
  var props = PropertiesService.getScriptProperties();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var saved = props.getProperty(PROP.SS_ID);
    if (!saved) throw new Error('Tiada Sheet dijumpai. Buka Apps Script melalui Sheet anda (Extensions > Apps Script).');
    ss = SpreadsheetApp.openById(saved);
  }
  props.setProperty(PROP.SS_ID, ss.getId());
  report.push('Sheet: ' + ss.getName());

  if (!props.getProperty(PROP.PEPPER)) {
    props.setProperty(PROP.PEPPER, Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
    report.push('PEPPER baharu dijana dan disimpan dalam Script Properties.');
  }

  TABLE_ORDER.forEach(function (name) {
    report.push(_ensureTab(ss, SCHEMA[name]));
  });
  report.push(_seedRefs(ss));
  report.push(_seedHadJamKredit());

  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('Helaian1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0 && blank.getLastColumn() === 0) {
    ss.deleteSheet(blank);
  }

  report.push('SELESAI. Ingat: JANGAN kongsi Sheet ini dan JANGAN guna "Publish to web".');
  Logger.log(report.join('\n'));
  return report;
}

/** Semak sahaja: adakah semua tab dan tajuk lajur betul? Tidak mengubah apa-apa. */
function verifySetup() {
  var ss = getSpreadsheet();
  var problems = [];
  TABLE_ORDER.forEach(function (name) {
    var s = SCHEMA[name];
    var sh = ss.getSheetByName(name);
    if (!sh) { problems.push('Tab tiada: ' + name); return; }
    var head = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, s.columns.length).getValues()[0] : [];
    s.columns.forEach(function (c, i) {
      if (String(head[i]) !== c) problems.push(name + ': lajur ' + (i + 1) + ' sepatutnya "' + c + '"');
    });
  });
  var msg = problems.length ? 'MASALAH:\n' + problems.join('\n') : 'OK: ' + TABLE_ORDER.length + ' tab, semua lajur betul.';
  Logger.log(msg);
  return problems;
}

function _ensureTab(ss, s) {
  var sh = ss.getSheetByName(s.name);
  var created = false;
  if (!sh) { sh = ss.insertSheet(s.name); created = true; }

  var n = s.columns.length;
  var hasData = sh.getLastRow() > 0;
  if (hasData) {
    var head = sh.getRange(1, 1, 1, n).getValues()[0];
    for (var i = 0; i < n; i++) {
      if (String(head[i]) !== s.columns[i]) {
        throw new Error('Tab "' + s.name + '" sudah ada tetapi lajur ' + (i + 1) + ' bukan "' + s.columns[i] +
          '". Padam atau namakan semula tab itu, kemudian jalankan semula.');
      }
    }
  } else {
    sh.getRange(1, 1, 1, n).setValues([s.columns]);
  }

  if (sh.getMaxRows() < 2) sh.insertRowsAfter(1, 1);
  var rows = sh.getMaxRows() - 1;
  s.columns.forEach(function (c, i) {
    var t = s.defs[c].type;
    // Jenis teks/tarikh/masa disimpan sebagai TEKS supaya Sheets tidak menukar "2026-01-05" atau "08:00" menjadi tarikh/masa.
    if (t !== 'int' && t !== 'num' && t !== 'bool') sh.getRange(2, i + 1, rows, 1).setNumberFormat('@');
  });

  sh.getRange(1, 1, 1, n).setBackground('#00548d').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setTabColor(s.isRef ? '#008c21' : '#00548d');
  return (created ? 'Dicipta : ' : 'Sedia ada: ') + s.name;
}

/** Isi jadual ref_* dengan nilai asal. Nilai yang sudah ada tidak diganggu. */
function _seedRefs(ss) {
  var added = 0;
  Object.keys(REF_SEEDS).forEach(function (name) {
    var s = SCHEMA[name];
    var sh = ss.getSheetByName(name);
    var existing = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var now = nowIso();
    var lines = [];
    REF_SEEDS[name].forEach(function (pair, idx) {
      if (existing.indexOf(pair[0]) !== -1) return;
      var row = { id: uuid(), kod: pair[0], label: pair[1], susunan: idx + 1, aktif: true, created_at: now, updated_at: now, updated_by: 'setup' };
      lines.push(s.columns.map(function (c) { return row[c]; }));
    });
    if (lines.length) {
      sh.getRange(sh.getLastRow() + 1, 1, lines.length, s.columns.length).setValues(lines);
      added += lines.length;
    }
  });
  _REF_CACHE = {};
  return 'Nilai rujukan ditambah: ' + added;
}

function _seedHadJamKredit() {
  var year = Utilities.formatDate(new Date(), TZ, 'yyyy');
  if (query('had_jam_kredit', { tahun_akademik: year }).length) return 'Had jam kredit ' + year + ': sedia ada';
  insert('had_jam_kredit', { tahun_akademik: year, had_berjadual: 22, had_tidak_berjadual: 10 }, { actorId: 'setup' });
  return 'Had jam kredit ' + year + ': 22 (berjadual), 10 (tidak berjadual)';
}

// ======================================================================
// Auth.gs
// ======================================================================
/**
 * Auth.gs — pengesahan dan kebenaran akses.
 *
 * FASA 0: hanya kerangka. `requireAuth` sengaja SENTIASA MENOLAK (gagal tutup)
 * sehingga logik sebenar dibina pada Fasa 1. Jadi walaupun Web App sudah
 * di-deploy, tiada data boleh dibaca.
 *
 * Rancangan Fasa 1: sahkan token dalam tab `sessions`, semak tempoh luput,
 * semak role, dan pulangkan { akaunId, guruId, role }.
 */

function requireAuth(token, rolesDibenarkan) {
  throw new AppError('TIDAK_LOG_MASUK', 'Sesi tidak sah atau telah tamat. Sila log masuk semula.');
}

// ======================================================================
// Api.gs
// ======================================================================
/**
 * Api.gs — satu pintu masuk untuk semua permintaan daripada frontend.
 *
 * Bentuk permintaan (POST, badan JSON):  { "action": "NAMA_AKSI", "token": "...", "params": { ... } }
 * Bentuk jawapan:  { "ok": true, "data": ... }  atau  { "ok": false, "code": "KOD", "message": "..." }
 *
 * Peraturan:
 *   - Hanya LOGIN tidak memerlukan token. Setiap aksi lain memanggil requireAuth() dahulu.
 *   - Aksi yang tidak dikenali tanpa token mendapat jawapan yang sama seperti aksi sebenar
 *     (TIDAK_LOG_MASUK), supaya orang luar tidak dapat meneka senarai aksi.
 *   - Ralat tidak dijangka tidak membocorkan butiran dalaman kepada pelayar.
 */

/**
 * Daftar aksi. Setiap modul menambah aksinya di sini pada fasa masing-masing.
 *   public  : true hanya untuk LOGIN
 *   roles   : senarai peranan yang dibenarkan
 *   handler : function (ctx, params) -> data
 */
var ACTIONS = {
  LOGIN: {
    public: true,
    handler: function (ctx, params) {
      throw new AppError('BELUM_SEDIA', 'Log masuk belum diaktifkan. Ia dibina pada Fasa 1.');
    }
  }
};

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
    var def = Object.prototype.hasOwnProperty.call(ACTIONS, req.action) ? ACTIONS[req.action] : null;

    if (def && def.public === true) {
      return { ok: true, data: def.handler(null, params) };
    }
    var ctx = requireAuth(req.token, def ? def.roles : null);   // langkah pertama untuk semua aksi lain
    if (!def) throw new AppError('AKSI_TIDAK_DIKENALI', 'Aksi tidak dikenali.');
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
