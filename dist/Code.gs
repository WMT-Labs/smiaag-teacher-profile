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
var APP_VERSION = '0.6.0-fasa6';
var TZ = 'Asia/Kuala_Lumpur';

/** Nama kunci dalam PropertiesService. */
var PROP = {
  SS_ID: 'SS_ID',     // ID Google Sheet (diisi automatik oleh setupTemplate)
  PEPPER: 'PEPPER'    // rahsia tambahan untuk hash kata laluan (dijana oleh setupTemplate)
};

/** Had saiz badan permintaan (aksara). Dinaikkan nanti untuk import PDF. */
var MAX_REQUEST_CHARS = 200000; // cukup untuk satu kumpulan import (beberapa guru sekali)

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
    // nama_panggilan: nama ringkas untuk hebahan (contoh "Farah Hanani"). akaun_sistem: akaun pentadbiran sistem
    // (contoh ADMIN01) yang BUKAN guru; dikecualikan daripada semua senarai dan kiraan guru.
    cols: ['id:uuid!', 'guru_kod:text!', 'nama_penuh:text!', 'nama_panggilan:text', 'status_lantikan:enum(ref_status_lantikan)!',
      'jawatan:text', 'tarikh_lantikan:date', 'tarikh_tamat_praktikal:date', 'no_telefon:text', 'email:text', 'tarikh_disahkan:date',
      'akaun_sistem:bool!=false', 'aktif:bool!=true'],
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
    // Ringkas: satu baris bagi setiap guru setiap tahun. Berapa kali dicerap dan siapa pencerapnya.
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'bilangan_dicerap:int[0..50]!=0', 'pencerap:text', 'catatan:text'],
    unique: [['guru_id', 'tahun_akademik']]
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
    // label: untuk slot bukan subjek (contoh Perhimpunan, Usrah, KOKU, Mesyuarat).
    // Kelas disimpan dalam jadual_slot_kelas kerana satu slot boleh ada beberapa kelas (kelas gabungan).
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'hari:enum(ref_hari)!', 'masa_mula:time!', 'masa_akhir:time!',
      'subjek_id:fk(subjek)', 'label:text', 'tempoh:int[1..30]', 'sumber:enum(ref_sumber_slot)!=manual', 'disahkan:bool!=false']
  },
  jadual_slot_kelas: {
    cols: ['id:uuid!', 'slot_id:fk(jadual_slot)!', 'kelas_id:fk(kelas)!'],
    unique: [['slot_id', 'kelas_id']]
  },
  waktu: {
    // Templat waktu persekolahan bagi setiap tahun (waktu 1 = 07:30-07:40, ...). Digunakan untuk borang jadual.
    cols: ['id:uuid!', 'tahun_akademik:year!', 'nombor:int[1..30]!', 'masa_mula:time!', 'masa_akhir:time!'],
    unique: [['tahun_akademik', 'nombor']]
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
    cols: ['id:uuid!', 'tahun_akademik:year!', 'murabbi_guru_id:fk(guru)!', 'nama_kumpulan:text!', 'hari:enum(ref_hari)'],
    unique: [['tahun_akademik', 'nama_kumpulan']]
  },
  keahlian_usrah_guru: {
    cols: ['id:uuid!', 'usrah_guru_id:fk(usrah_guru)!', 'guru_id:fk(guru)!'],
    unique: [['usrah_guru_id', 'guru_id']]
  },
  sesi_usrah_guru: {
    // Satu baris bagi setiap sesi usrah yang dijalankan (tarikh bebas, tidak semestinya mingguan).
    cols: ['id:uuid!', 'usrah_guru_id:fk(usrah_guru)!', 'tarikh:date!', 'tajuk:text', 'catatan:text'],
    unique: [['usrah_guru_id', 'tarikh']]
  },
  kehadiran_usrah_guru: {
    // Dicatat oleh murabbi kumpulan bagi setiap ahli dalam setiap sesi.
    cols: ['id:uuid!', 'sesi_id:fk(sesi_usrah_guru)!', 'guru_id:fk(guru)!', 'hadir:bool!', 'catatan:text'],
    unique: [['sesi_id', 'guru_id']]
  },
  peranan_hem: {
    // Guru Tarbiah, Guru Kelas (dengan kelas), Bidang Disiplin. Berasingan daripada Usrah Murabbi Pelajar.
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'jenis:enum(ref_jenis_peranan_hem)!', 'kelas_id:fk(kelas)', 'butiran:text'],
    unique: [['guru_id', 'tahun_akademik', 'jenis', 'kelas_id']]
  }
};

/**
 * Jadual rujukan (ref_*). Setiap satu: id, kod, label, susunan, aktif (+ lajur audit).
 * Lajur bernilai terhad dalam jadual lain menyimpan `kod`. Kod dalam snake_case
 * (contoh "al-quran-tutorial" dalam dokumen ditulis `al_quran_tutorial`).
 * setupTemplate menyelaraskan Sheet dengan senarai ini: nilai baharu ditambah, label/susunan dikemas kini,
 * dan nilai yang dibuang daripada senarai DINYAHAKTIFKAN (tidak dipadam) supaya rekod lama masih dipaparkan
 * dengan betul. Nilai tidak aktif tidak lagi muncul dalam pilihan borang.
 */
var REF_SEEDS = {
  ref_status_lantikan: [['tetap', 'Tetap'], ['percubaan', 'Percubaan'], ['praktikal', 'Praktikal'], ['lain_lain', 'Lain-lain']],
  ref_role: [['guru', 'Guru'], ['pentadbir', 'Pentadbir'], ['superadmin', 'Superadmin']],
  ref_tahap_kelayakan: [['sijil', 'Sijil'], ['diploma', 'Diploma'], ['ijazah_sarjana_muda', 'Ijazah Sarjana Muda'],
    ['ijazah_sarjana', 'Ijazah Sarjana'], ['doktor_falsafah', 'Doktor Falsafah'], ['lain_lain', 'Lain-lain']],
  ref_jenis_opsyen: [['major', 'Major'], ['minor', 'Minor']],
  ref_peringkat_kursus: [['sekolah', 'Sekolah'], ['daerah', 'Daerah'], ['negeri', 'Negeri'], ['kebangsaan', 'Kebangsaan'], ['lain_lain', 'Lain-lain']],
  ref_kategori_subjek: [['subjek', 'Subjek'], ['al_quran_tutorial', 'Al-Quran / Tutorial'], ['lain', 'Lain']],
  ref_jenis_tugasan: [['berjadual', 'Berjadual'], ['tidak_berjadual', 'Tidak berjadual']],
  ref_kumpulan_tugasan: [['subjek', 'Subjek'], ['al_quran_tutorial', 'Al-Quran / Tutorial'], ['aktiviti_lain', 'Aktiviti lain'],
    ['tugasan_tidak_berjadual', 'Tugasan tidak berjadual']],
  ref_jabatan: [['KURI', 'Kurikulum'], ['HEM', 'Hal Ehwal Murid'], ['KOKU', 'Kokurikulum'], ['lain_lain', 'Lain-lain']],
  ref_hari: [['isnin', 'Isnin'], ['selasa', 'Selasa'], ['rabu', 'Rabu'], ['khamis', 'Khamis'], ['jumaat', 'Jumaat'], ['sabtu', 'Sabtu'], ['ahad', 'Ahad']],
  ref_sumber_slot: [['asc', 'Import aSc'], ['pdf', 'Import PDF'], ['manual', 'Manual']],
  ref_jenis_unit: [['badan_beruniform', 'Badan beruniform (Syabab)'], ['kelab_persatuan', 'Kelab / persatuan'], ['pasukan_sekolah', 'Pasukan sekolah']],
  ref_jawatan_unit: [['penasihat', 'Penasihat'], ['penyelaras', 'Penyelaras'], ['ajk', 'AJK'], ['lain_lain', 'Lain-lain']],
  ref_peringkat_pertandingan: [['sekolah', 'Sekolah'], ['daerah', 'Daerah'], ['negeri', 'Negeri'], ['kebangsaan', 'Kebangsaan']],
  ref_peranan_pertandingan: [['pengurus', 'Pengurus'], ['jurulatih', 'Jurulatih'], ['pengiring', 'Pengiring'], ['lain_lain', 'Lain-lain']],
  ref_jenis_peranan_hem: [['guru_tarbiah', 'Guru Tarbiah'], ['guru_kelas', 'Guru Kelas'], ['bidang_disiplin', 'Bidang Disiplin']]
};

var REF_COLS = ['id:uuid!', 'kod:text!', 'label:text!', 'susunan:int[0..1000]!=0', 'aktif:bool!=true'];

/** Jenis lajur teks yang dianggap "medan bebas" dan dihadkan lebih panjang. */
var LONG_TEXT_COLS = ['butiran', 'catatan', 'pencapaian'];
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
 *   insertMany(table, rows, ctx)  -> senarai objek (satu tulisan ke Sheet; untuk import)
 *   removeWhere(table, filter)    -> bilangan dipadam (satu tulisan ke Sheet; untuk import)
 *   replaceWhere(table, filter, rows, ctx) -> ganti selamat: sahkan semua dahulu, kemudian satu tulisan
 *   appendLog(table, row, ctx)    -> tambah baris TANPA membaca tab (untuk audit_log yang sentiasa bertambah)
 *
 * Kelajuan (cache):
 *   - Dalam satu permintaan, setiap tab dibaca sekali sahaja (memo), kemudian diguna semula.
 *   - Jadual rujukan yang jarang berubah (ref_*, subjek, kelas, waktu, ...) disimpan dalam CacheService
 *     selama CACHE_TTL_SAAT antara permintaan.
 *   - Setiap tulisan membaca data SEGAR dan membatalkan cache tab itu serta-merta.
 *   - Cache hanya aktif dalam handleRequest (mulaPermintaan/tamatPermintaan); ujian di luar tidak terjejas.
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

var CACHE_TTL_SAAT = 300;
var _CACHE = { aktif: false, memo: {}, bacaan: 0 };

function _bolehCacheKekal(name) {
  return /^ref_/.test(name) || ['subjek', 'kelas', 'waktu', 'had_jam_kredit', 'unit_kokurikulum', 'rumah_sukan'].indexOf(name) !== -1;
}

function mulaPermintaan() { _CACHE.aktif = true; _CACHE.memo = {}; _CACHE.bacaan = 0; }
function tamatPermintaan() { _CACHE.aktif = false; _CACHE.memo = {}; }
function bilanganBacaan() { return _CACHE.bacaan; }

/** Dipanggil selepas SETIAP tulisan: batalkan cache tab dan maklumkan modul lain (contoh cache sesi). */
function _selepasTulis(name, rows) {
  delete _CACHE.memo[name];
  delete _REF_CACHE[name];
  try { CacheService.getScriptCache().remove('jd:' + name); } catch (e) { /* abaikan */ }
  if (typeof onTulisJadual === 'function') {
    (rows || []).forEach(function (r) { if (r) onTulisJadual(name, r); });
  }
}

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

/**
 * Nilai JS -> nilai sel. Tarikh dan masa+tarikh disimpan sebagai NILAI TARIKH Sheets (bukan teks) supaya
 * mudah dibaca dalam Sheet (format dd-mm-yyyy, hh.mm ditetapkan oleh setupTemplate) dan tetap tepat.
 */
function _toCell(def, v) {
  if (v === null || v === undefined) return '';
  if (def.type === 'date' && typeof v === 'string' && DATE_RE.test(v)) {
    return new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10));
  }
  if (def.type === 'datetime' && typeof v === 'string' && DATETIME_RE.test(v)) {
    var d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return sanitizeForSheet(v);
}

/** Baca semua baris. segar=true wajib untuk laluan tulisan (bukan daripada cache). */
function _readAll(schema, segar) {
  var name = schema.name;
  if (!segar && _CACHE.aktif) {
    if (_CACHE.memo[name]) return _CACHE.memo[name];
    if (_bolehCacheKekal(name)) {
      var c = null;
      try { c = CacheService.getScriptCache().get('jd:' + name); } catch (e) { c = null; }
      if (c) {
        var dc = { sheet: null, rows: JSON.parse(c) };
        _CACHE.memo[name] = dc;
        return dc;
      }
    }
  }
  var data = _readSheet(schema);
  if (_CACHE.aktif) {
    _CACHE.memo[name] = data;
    if (_bolehCacheKekal(name)) {
      try { CacheService.getScriptCache().put('jd:' + name, JSON.stringify(data.rows), CACHE_TTL_SAAT); } catch (e) { /* terlalu besar: abaikan */ }
    }
  }
  return data;
}

function _readSheet(schema) {
  _CACHE.bacaan++;
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
    var data = _readAll(s, true);
    if (data.rows.some(function (r) { return r[s.pk] === clean[s.pk]; })) {
      throw new AppError('DUPLIKAT', 'Rekod dengan id ini sudah wujud.');
    }
    _checkUnique(s, clean, null, data.rows);
    var line = s.columns.map(function (c) { return _toCell(s.defs[c], clean[c]); });
    data.sheet.getRange(data.sheet.getLastRow() + 1, 1, 1, s.columns.length).setValues([line]);
    _selepasTulis(s.name, [clean]);
    return clean;
  });
}

function update(table, id, patch, ctx) {
  var s = getTableSchema(table);
  ctx = ctx || {};
  return _withLock(function () {
    var data = _readAll(s, true);
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
    _selepasTulis(s.name, [merged]);
    return merged;
  });
}

function remove(table, id, ctx) {
  var s = getTableSchema(table);
  return _withLock(function () {
    var data = _readAll(s, true);
    for (var i = 0; i < data.rows.length; i++) {
      if (data.rows[i][s.pk] === id) {
        data.sheet.deleteRow(data.rows[i].__row);
        _selepasTulis(s.name, [_clean(data.rows[i])]);
        return true;
      }
    }
    return false;
  });
}

// ---------------------------------------------------------------------------
// Operasi pukal (import). Satu bacaan dan satu tulisan, bukan satu bagi setiap baris,
// supaya import ratusan baris tidak melepasi had masa Apps Script.
// ---------------------------------------------------------------------------

/** Sahkan dan sediakan baris baharu (tanpa menulis). `semua` = baris yang akan kekal dalam jadual. */
function _sediakanBaris(s, rows, semua, ctx) {
  if (!Array.isArray(rows)) throw new AppError('VALIDASI', 'Data tidak sah.');
  var fkSets = {};
  function fkSet(t) {
    if (!fkSets[t]) {
      var ts = getTableSchema(t), set = {};
      _readAll(ts).rows.forEach(function (r) { set[r[ts.pk]] = true; });
      fkSets[t] = set;
    }
    return fkSets[t];
  }
  semua = semua.slice();
  var out = [], lines = [], now = nowIso();
  rows.forEach(function (row, i) {
    var clean;
    try {
      clean = _validate(s, row, true, { skipFk: true });
      s.columns.forEach(function (c) {
        var d = s.defs[c];
        if (d.fk && clean[c] !== null && clean[c] !== undefined && !ctx.skipFk && !fkSet(d.fk)[clean[c]]) {
          _bad(c, 'Rekod rujukan untuk "' + c + '" tidak wujud.');
        }
      });
      if (!clean[s.pk]) clean[s.pk] = uuid();
      if (semua.some(function (r) { return r[s.pk] === clean[s.pk]; })) throw new AppError('DUPLIKAT', 'Rekod dengan id ini sudah wujud.');
      _checkUnique(s, clean, null, semua);
    } catch (e) {
      if (e && e.name === 'AppError') { e.message = 'Baris ' + (i + 1) + ': ' + e.message; e.details = { baris: i + 1, field: e.details && e.details.field }; }
      throw e;
    }
    if (s.audit) { clean.created_at = now; clean.updated_at = now; clean.updated_by = ctx.actorId || null; }
    semua.push(clean);
    out.push(clean);
    lines.push(s.columns.map(function (c) { return _toCell(s.defs[c], clean[c]); }));
  });
  return { out: out, lines: lines };
}

function insertMany(table, rows, ctx) {
  var s = getTableSchema(table);
  ctx = ctx || {};
  return _withLock(function () {
    var data = _readAll(s, true);
    var p = _sediakanBaris(s, rows, data.rows, ctx);
    if (p.lines.length) data.sheet.getRange(data.sheet.getLastRow() + 1, 1, p.lines.length, s.columns.length).setValues(p.lines);
    _selepasTulis(s.name, p.out);
    return p.out;
  });
}

/**
 * Ganti baris yang sepadan dengan penapis dengan baris baharu, SECARA SELAMAT:
 * semua baris baharu disahkan dahulu (terhadap baris yang kekal). Jika satu gagal, tiada apa berubah.
 * Pulangkan { dipadam, ditambah: [...] }.
 */
function replaceWhere(table, filter, rows, ctx) {
  var s = getTableSchema(table);
  ctx = ctx || {};
  if (!filter || typeof filter !== 'object' || !Object.keys(filter).length) throw new AppError('VALIDASI', 'Penapis diperlukan untuk ganti pukal.');
  Object.keys(filter).forEach(function (k) { if (!s.defs[k]) throw new AppError('VALIDASI', 'Penapis menggunakan lajur yang tidak wujud: ' + k); });
  return _withLock(function () {
    var data = _readAll(s, true);
    var buang = {}, kekal = [], n = 0, dibuang = [];
    data.rows.forEach(function (row) {
      if (Object.keys(filter).every(function (k) { return _matches(row[k], filter[k]); })) { buang[row.__row] = true; n++; dibuang.push(_clean(row)); }
      else kekal.push(row);
    });
    var p = _sediakanBaris(s, rows, kekal, ctx); // lontar ralat sebelum apa-apa ditulis
    var last = data.sheet.getLastRow();
    var keep = [];
    if (last > 1) {
      var range = data.sheet.getRange(2, 1, last - 1, s.columns.length);
      keep = range.getValues().filter(function (v, i) { return !buang[i + 2] && v.some(function (x) { return x !== '' && x !== null; }); });
      if (n) range.clearContent();
    }
    if (n) {
      var semua = keep.concat(p.lines);
      if (semua.length) data.sheet.getRange(2, 1, semua.length, s.columns.length).setValues(semua);
    } else if (p.lines.length) {
      data.sheet.getRange(last + 1, 1, p.lines.length, s.columns.length).setValues(p.lines);
    }
    _selepasTulis(s.name, dibuang.concat(p.out));
    return { dipadam: n, ditambah: p.out };
  });
}

/**
 * Tambah satu baris TANPA membaca tab (hanya baris tajuk untuk semakan). Untuk jadual log yang sentiasa
 * bertambah dan tiada kekangan unik (audit_log). Pengesahan jenis dan sanitasi tetap berlaku.
 */
function appendLog(table, row, ctx) {
  var s = getTableSchema(table);
  ctx = ctx || {};
  if (s.unique.length) throw new AppError('VALIDASI', 'appendLog hanya untuk jadual tanpa kekangan unik.');
  return _withLock(function () {
    var clean = _validate(s, row, true, { skipFk: true });
    if (!clean[s.pk]) clean[s.pk] = uuid();
    if (s.audit) { var now = nowIso(); clean.created_at = now; clean.updated_at = now; clean.updated_by = ctx.actorId || null; }
    var sh = _sheetOf(s);
    _checkHeaders(s, sh.getRange(1, 1, 1, s.columns.length).getValues()[0]);
    sh.getRange(sh.getLastRow() + 1, 1, 1, s.columns.length).setValues([s.columns.map(function (c) { return _toCell(s.defs[c], clean[c]); })]);
    delete _CACHE.memo[s.name];
    return clean;
  });
}

/** Padam semua baris yang sepadan dengan penapis. filter mesti ada sekurang-kurangnya satu lajur. */
function removeWhere(table, filter) {
  var s = getTableSchema(table);
  if (!filter || typeof filter !== 'object' || !Object.keys(filter).length) throw new AppError('VALIDASI', 'Penapis diperlukan untuk padam pukal.');
  Object.keys(filter).forEach(function (k) { if (!s.defs[k]) throw new AppError('VALIDASI', 'Penapis menggunakan lajur yang tidak wujud: ' + k); });
  return _withLock(function () {
    var data = _readAll(s, true);
    var buang = {};
    var n = 0, dibuang = [];
    data.rows.forEach(function (row) {
      if (Object.keys(filter).every(function (k) { return _matches(row[k], filter[k]); })) { buang[row.__row] = true; n++; dibuang.push(_clean(row)); }
    });
    if (!n) return 0;
    var last = data.sheet.getLastRow();
    var range = data.sheet.getRange(2, 1, last - 1, s.columns.length);
    var values = range.getValues();
    var keep = values.filter(function (v, i) { return !buang[i + 2] && v.some(function (x) { return x !== '' && x !== null; }); });
    range.clearContent();
    if (keep.length) data.sheet.getRange(2, 1, keep.length, s.columns.length).setValues(keep);
    _selepasTulis(s.name, dibuang);
    return n;
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
  ss.setSpreadsheetTimeZone(TZ);
  report.push('Sheet: ' + ss.getName() + ' (zon waktu ' + TZ + ')');

  if (!props.getProperty(PROP.PEPPER)) {
    props.setProperty(PROP.PEPPER, Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
    report.push('PEPPER baharu dijana dan disimpan dalam Script Properties.');
  }

  TABLE_ORDER.forEach(function (name) {
    report.push(_ensureTab(ss, SCHEMA[name]));
  });
  report.push(_seedRefs(ss));
  report.push(_ensureLihatAkaun(ss));
  report.push(_seedHadJamKredit());
  report.push(_seedWaktu());
  report.push(_seedKoku());

  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('Helaian1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0 && blank.getLastColumn() === 0) {
    ss.deleteSheet(blank);
  }

  report.push('SELESAI. Ingat: JANGAN kongsi Sheet ini dan JANGAN guna "Publish to web".');
  Logger.log(report.join('\n'));
  return report;
}

/**
 * Tab PAPARAN baca-sahaja `lihat_akaun`: akaun dengan ID guru dan nama (bukan ID panjang/UUID).
 * Dibina dengan formula Sheets yang merujuk tab `akaun` dan `guru`; sistem tidak membaca atau menulis tab ini.
 * Dibina semula setiap kali setupTemplate dijalankan.
 */
function _ensureLihatAkaun(ss) {
  var name = 'lihat_akaun';
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var A = SCHEMA.akaun.columns, G = SCHEMA.guru.columns;
  var a = function (c) { var L = _hurufLajur(A.indexOf(c) + 1); return 'akaun!' + L + '2:' + L; };
  var g = function (c) { var L = _hurufLajur(G.indexOf(c) + 1); return 'guru!' + L + '2:' + L; };
  var ada = 'akaun!' + _hurufLajur(A.indexOf('id') + 1) + '2:' + _hurufLajur(A.indexOf('id') + 1);
  var cari = function (col) { return '=ARRAYFORMULA(IF(' + ada + '="","",XLOOKUP(' + a('guru_id') + ',' + g('id') + ',' + g(col) + ',"?")))'; };
  var terus = function (col) { return '=ARRAYFORMULA(IF(' + ada + '="","",' + a(col) + '))'; };
  var tajuk = ['ID guru', 'Nama', 'Peranan', 'Akaun sistem', 'Akaun aktif', 'Wajib tukar kata laluan', 'Setuju PDPA pada', 'Percubaan gagal', 'Dicipta', 'Dikemas kini'];
  var formula = [cari('guru_kod'), cari('nama_penuh'), terus('role'), cari('akaun_sistem'), terus('aktif'), terus('wajib_tukar_password'),
    terus('persetujuan_pdpa_pada'), terus('percubaan_gagal'), terus('created_at'), terus('updated_at')];
  sh.getRange(1, 1, 2, tajuk.length).setValues([tajuk, formula]);
  sh.getRange(1, 1, 1, tajuk.length).setBackground('#566873').setFontColor('#ffffff').setFontWeight('bold');
  sh.getRange(2, 7, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat(FORMAT_TARIKH_MASA);
  sh.getRange(2, 9, Math.max(1, sh.getMaxRows() - 1), 2).setNumberFormat(FORMAT_TARIKH_MASA);
  sh.setFrozenRows(1);
  sh.setTabColor('#566873');
  if (typeof sh.protect === 'function') {
    try { sh.protect().setDescription('Paparan sahaja: dijana oleh setupTemplate').setWarningOnly(true); } catch (e) { /* abaikan */ }
  }
  return 'Tab paparan lihat_akaun: dikemas kini (baca sahaja)';
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

var FORMAT_TARIKH = 'dd-mm-yyyy';
var FORMAT_TARIKH_MASA = 'dd-mm-yyyy", "hh.mm';

function _hurufLajur(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

/**
 * Pastikan tab wujud dengan lajur betul.
 *  - Tab baharu: tulis baris tajuk.
 *  - Tab sedia ada yang ketinggalan lajur baharu (kemas kini sistem): lajur yang tiada DISISIPKAN di
 *    kedudukan betul, data sedia ada kekal. Lajur yang tidak dikenali -> berhenti (tidak menimpa data).
 *  - Lajur tarikh/masa: format dd-mm-yyyy / dd-mm-yyyy, hh.mm; teks ISO lama ditukar kepada nilai tarikh.
 */
function _ensureTab(ss, s) {
  var sh = ss.getSheetByName(s.name);
  var created = false, ditambah = [];
  if (!sh) { sh = ss.insertSheet(s.name); created = true; }

  var n = s.columns.length;
  if (sh.getLastRow() > 0) {
    var lastCol = Math.max(1, sh.getLastColumn ? sh.getLastColumn() : n);
    var head = sh.getRange(1, 1, 1, Math.max(lastCol, n)).getValues()[0].map(String).filter(function (h, i, arr) {
      return arr.slice(i).some(function (x) { return x !== ''; });
    });
    var tidakDikenali = head.filter(function (h) { return s.columns.indexOf(h) === -1; });
    var ikutUrutan = head.every(function (h, i) { return i === 0 || s.columns.indexOf(h) > s.columns.indexOf(head[i - 1]); });
    if (tidakDikenali.length || !ikutUrutan) {
      throw new Error('Tab "' + s.name + '" sudah ada tetapi lajurnya tidak sepadan (' + (tidakDikenali.length ? 'lajur tidak dikenali: ' + tidakDikenali.join(', ') : 'susunan lajur berbeza') +
        '). Lajur 1 sepatutnya "' + s.columns[0] + '". Namakan semula tab itu, kemudian jalankan semula.');
    }
    for (var i = 0; i < n; i++) {
      if (head[i] !== s.columns[i]) {
        if (i < head.length) sh.insertColumnBefore(i + 1);
        else if (i + 1 > sh.getMaxColumns()) sh.insertColumnAfter(sh.getMaxColumns());
        sh.getRange(1, i + 1).setValues([[s.columns[i]]]);
        head.splice(i, 0, s.columns[i]);
        ditambah.push(s.columns[i]);
      }
    }
  } else {
    sh.getRange(1, 1, 1, n).setValues([s.columns]);
  }

  if (sh.getMaxRows() < 2) sh.insertRowsAfter(1, 1);
  var rows = sh.getMaxRows() - 1;
  var dataRows = Math.max(0, sh.getLastRow() - 1);
  s.columns.forEach(function (c, i) {
    var t = s.defs[c].type;
    var rg = sh.getRange(2, i + 1, rows, 1);
    if (t === 'date' || t === 'datetime') {
      rg.setNumberFormat(t === 'date' ? FORMAT_TARIKH : FORMAT_TARIKH_MASA);
      if (dataRows) {
        // Tukar teks ISO lama (sebelum kemas kini ini) kepada nilai tarikh sebenar
        var col = sh.getRange(2, i + 1, dataRows, 1);
        var vals = col.getValues();
        var ubah = false;
        vals = vals.map(function (r) {
          var v = r[0];
          if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1);
          if (typeof v === 'string' && (DATE_RE.test(v) || DATETIME_RE.test(v))) { ubah = true; return [_toCell(s.defs[c], v)]; }
          return [r[0]];
        });
        if (ubah) col.setValues(vals);
      }
    } else if (t !== 'int' && t !== 'num' && t !== 'bool') {
      // Teks dan masa (JJ:MM) kekal sebagai TEKS supaya Sheets tidak menukarnya.
      rg.setNumberFormat('@');
    }
  });

  sh.getRange(1, 1, 1, n).setBackground('#00548d').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setTabColor(s.isRef ? '#008c21' : '#00548d');
  return (created ? 'Dicipta : ' : 'Sedia ada: ') + s.name + (ditambah.length ? ' (lajur baharu: ' + ditambah.join(', ') + ')' : '');
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
  // Selaraskan nilai sedia ada: label dan susunan ikut senarai; nilai yang dibuang dinyahaktifkan.
  var dikemas = 0, dinyahaktif = 0;
  Object.keys(REF_SEEDS).forEach(function (name) {
    var seed = {};
    REF_SEEDS[name].forEach(function (pair, idx) { seed[pair[0]] = { label: pair[1], susunan: idx + 1 }; });
    query(name, {}).forEach(function (r) {
      var sd = seed[r.kod];
      if (sd && (r.label !== sd.label || r.susunan !== sd.susunan || !r.aktif)) {
        update(name, r.id, { label: sd.label, susunan: sd.susunan, aktif: true }, { actorId: 'setup' }); dikemas++;
      } else if (!sd && r.aktif) {
        update(name, r.id, { aktif: false }, { actorId: 'setup' }); dinyahaktif++;
      }
    });
  });
  return 'Nilai rujukan ditambah: ' + added + ', dikemas kini: ' + dikemas + ', dinyahaktifkan: ' + dinyahaktif;
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
var PDPA_VERSI = '1.0';

// ======================================================================
// Akaun.gs
// ======================================================================
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
    dikunci: guru ? adaKunci(guru.guru_kod) : false
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
  logAudit(ctx.akaunId, 'AKAUN_CIPTA', kod, 'peranan=' + role);
  return { akaun: _barisAkaun(r.akaun, r.guru), password_sementara: r.password };
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
  logAudit(ctx.akaunId, 'AKAUN_RESET_PASSWORD', x.guru ? x.guru.guru_kod : id);
  return { akaun: _barisAkaun(akaun, x.guru), password_sementara: pw };
}

function aksiAkaunSetAktif(ctx, params) {
  var id = pUuid(params, 'akaun_id', 'Akaun');
  var aktif = pBool(params, 'aktif', 'Status aktif');
  _bukanDiriSendiri(ctx, id, 'Anda tidak boleh menyahaktifkan akaun sendiri.');
  var x = _akaunDanGuru(id);
  if (!aktif && x.akaun.role === 'superadmin') _pastikanAdaSuperadminLain(id);
  var akaun = update('akaun', id, { aktif: aktif }, { actorId: ctx.akaunId });
  if (x.guru) update('guru', x.guru.id, { aktif: aktif }, { actorId: ctx.akaunId });
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

// ======================================================================
// Guru.gs
// ======================================================================
/**
 * Guru.gs — profil teras guru (Fasa 2).
 *
 * Peraturan akses (disemak di server, bukan di pelayar):
 *  - Guru hanya boleh membaca dan mengubah rekod dengan guru_id miliknya.
 *  - Pentadbir dan superadmin boleh membaca dan mengubah profil mana-mana guru.
 *  - Nombor telefon: guru (termasuk pemiliknya) menerima versi bertutup. Pentadbir menerima
 *    nombor penuh, dan setiap bacaan direkod dalam audit_log.
 *  - Cerapan boleh dikemas kini oleh guru sendiri, atau oleh pentadbir (GK, PK, Pengetua) bagi pihak guru.
 *  - Status "percubaan": tamat 6 bulan selepas tarikh lantikan. Pengesahan ke guru tetap dibuat oleh pentadbir.
 *  - Perubahan oleh guru terus disimpan (keputusan pemilik). Sunting oleh pentadbir ke atas
 *    profil guru lain direkod dalam audit_log.
 */

function _isAdmin(ctx) { return ctx.role === 'pentadbir' || ctx.role === 'superadmin'; }

/** Guru sebenar yang aktif (tidak termasuk akaun sistem seperti ADMIN01). Guna untuk SEMUA senarai/kiraan guru. */
function senaraiGuruMengajar(opts) {
  var f = { akaun_sistem: { ne: true } };
  if (!(opts && opts.termasukTidakAktif)) f.aktif = true;
  return query('guru', f, { orderBy: 'nama_penuh' });
}

var EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,200}\.[A-Za-z]{2,24}$/;

/** Sahkan emel (pilihan) dan pastikan tiada guru lain menggunakannya. */
function _semakEmel(email, guruIdSendiri) {
  if (!email) return null;
  email = String(email).trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) throw new AppError('VALIDASI', 'Alamat emel tidak sah.', { field: 'email' });
  var lain = query('guru', { email: email }).filter(function (g) { return g.id !== guruIdSendiri; });
  if (lain.length) throw new AppError('DUPLIKAT', 'Emel ini sudah digunakan oleh ' + lain[0].guru_kod + '.', { field: 'email' });
  return email;
}

/** Nama ringkas untuk hebahan: nama_panggilan, atau perkataan sebelum bin/binti (maksimum 2 perkataan). */
function namaPanggilan(g) {
  if (g.nama_panggilan) return g.nama_panggilan;
  var w = String(g.nama_penuh || '').split(/\s+/).filter(Boolean);
  var out = [];
  for (var i = 0; i < w.length && out.length < 2; i++) {
    if (/^(bin|binti|bt|bte|b\.|a\/l|a\/p)$/i.test(w[i])) break;
    out.push(w[i]);
  }
  return out.join(' ') || g.guru_kod;
}

/**
 * Tentukan guru sasaran. Tiada guru_id atau guru_id sendiri = diri sendiri.
 * guru_id lain hanya untuk pentadbir/superadmin.
 */
function _sasaranGuru(ctx, guruId) {
  if (guruId === undefined || guruId === null || guruId === '' || guruId === ctx.guruId) return ctx.guru;
  if (typeof guruId !== 'string' || !UUID_RE.test(guruId)) throw new AppError('VALIDASI', 'Guru tidak sah.');
  if (!_isAdmin(ctx)) throw new AppError('TIADA_KEBENARAN', 'Anda hanya boleh mengakses profil anda sendiri.');
  var g = getById('guru', guruId);
  if (!g) throw new AppError('TIDAK_JUMPA', 'Guru tidak dijumpai.');
  return g;
}

function _auditJikaOrangLain(ctx, guru, tindakan, butiran) {
  if (guru.id !== ctx.guruId) logAudit(ctx.akaunId, tindakan, guru.guru_kod, butiran);
}

/** Bentuk data guru yang selamat dihantar ke pelayar. */
function _guruUntukPelayar(ctx, guru) {
  var admin = _isAdmin(ctx);
  var out = {
    id: guru.id, guru_kod: guru.guru_kod, nama_penuh: guru.nama_penuh, nama_panggilan: guru.nama_panggilan,
    panggilan: namaPanggilan(guru), status_lantikan: guru.status_lantikan,
    jawatan: guru.jawatan, tarikh_lantikan: guru.tarikh_lantikan, tarikh_tamat_praktikal: guru.tarikh_tamat_praktikal,
    tarikh_disahkan: guru.tarikh_disahkan, email: guru.email, akaun_sistem: !!guru.akaun_sistem, aktif: guru.aktif,
    ada_telefon: !!guru.no_telefon,
    no_telefon: guru.no_telefon ? (admin ? formatPhone(guru.no_telefon) : maskPhone(guru.no_telefon)) : null,
    telefon_penuh: admin,
    updated_at: guru.updated_at
  };
  if (admin && guru.no_telefon) logAudit(ctx.akaunId, 'BACA_TELEFON_PENUH', guru.guru_kod);
  return out;
}

function _refSenarai(nama) {
  return query(nama, { aktif: true }, { orderBy: 'susunan' }).map(function (r) { return { kod: r.kod, label: r.label }; });
}

function _subjekSenarai() {
  return query('subjek', {}, { orderBy: 'nama' }).map(function (s) { return { id: s.id, nama: s.nama, kod: s.kod, kategori: s.kategori }; });
}

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

function aksiProfilLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = tahunSemasa();
  var subjek = _subjekSenarai();
  var subjekById = {};
  subjek.forEach(function (s) { subjekById[s.id] = s; });

  var opsyen = query('opsyen_guru', { guru_id: guru.id }).map(function (o) {
    var s = subjekById[o.subjek_id] || {};
    return { id: o.id, jenis: o.jenis, subjek_id: o.subjek_id, subjek_nama: s.nama || '(subjek dipadam)' };
  });
  var cerapan = query('cerapan', { guru_id: guru.id }, { orderBy: 'tahun_akademik', desc: true }).map(function (c) {
    return { id: c.id, tahun_akademik: c.tahun_akademik, bilangan_dicerap: c.bilangan_dicerap, pencerap: c.pencerap, catatan: c.catatan };
  });
  var semasa = cerapan.filter(function (c) { return c.tahun_akademik === tahun; })[0] || null;

  return {
    guru: _guruUntukPelayar(ctx, guru),
    milik_sendiri: guru.id === ctx.guruId,
    boleh: { sunting: true, cerapan: true, sahkan_percubaan: _isAdmin(ctx) },
    percubaan: statusPercubaan(guru, hariIni()),
    praktikal: statusPraktikal(guru, hariIni()),
    kelayakan: query('kelayakan', { guru_id: guru.id }, { orderBy: 'tahun_tamat', desc: true }).map(_pilih(['id', 'tahap', 'bidang', 'institusi', 'tahun_tamat'])),
    opsyen: opsyen,
    kursus: query('kursus', { guru_id: guru.id }, { orderBy: 'tarikh_mula', desc: true }).map(_pilih(['id', 'tajuk', 'penganjur', 'tarikh_mula', 'tarikh_tamat', 'jam', 'tahap'])),
    cerapan: { tahun: tahun, semasa: semasa, sejarah: cerapan },
    ref: {
      status_lantikan: _refSenarai('ref_status_lantikan'),
      tahap_kelayakan: _refSenarai('ref_tahap_kelayakan'),
      jenis_opsyen: _refSenarai('ref_jenis_opsyen'),
      peringkat_kursus: _refSenarai('ref_peringkat_kursus'),
      subjek: subjek
    }
  };
}

function _pilih(cols) {
  return function (row) { var o = {}; cols.forEach(function (c) { o[c] = row[c]; }); return o; };
}

function aksiProfilSimpanTeras(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var patch = {
    nama_penuh: pStr(params, 'nama_penuh', { label: 'Nama penuh', min: 3, max: 150 }),
    status_lantikan: pStr(params, 'status_lantikan', { label: 'Status lantikan', max: 30 }),
    jawatan: pStr(params, 'jawatan', { label: 'Jawatan', max: 100, optional: true }),
    tarikh_lantikan: pStr(params, 'tarikh_lantikan', { label: 'Tarikh lantikan', max: 10, optional: true }),
    nama_panggilan: pStr(params, 'nama_panggilan', { label: 'Nama panggilan', max: 40, optional: true }),
    tarikh_tamat_praktikal: pStr(params, 'tarikh_tamat_praktikal', { label: 'Tarikh tamat praktikal', max: 10, optional: true })
  };
  if (patch.status_lantikan !== 'praktikal') patch.tarikh_tamat_praktikal = null;
  if (params.email !== undefined) patch.email = _semakEmel(pStr(params, 'email', { label: 'Emel', max: 254, optional: true }), guru.id);
  if (patch.tarikh_lantikan && patch.tarikh_lantikan > hariIni()) {
    throw new AppError('VALIDASI', 'Tarikh lantikan tidak boleh pada masa depan.', { field: 'tarikh_lantikan' });
  }
  if (guru.status_lantikan === 'percubaan' && patch.status_lantikan === 'tetap') {
    if (!_isAdmin(ctx)) {
      throw new AppError('VALIDASI', 'Pengesahan ke guru tetap dibuat oleh pentadbir selepas tempoh percubaan 6 bulan.', { field: 'status_lantikan' });
    }
    patch.tarikh_disahkan = hariIni();
  }
  if (params.padam_telefon === true) {
    patch.no_telefon = null;
  } else if (params.no_telefon_baru !== undefined && params.no_telefon_baru !== null && String(params.no_telefon_baru).trim() !== '') {
    var tel = normalizePhone(String(params.no_telefon_baru));
    if (!tel) throw new AppError('VALIDASI', 'Nombor telefon tidak sah. Contoh: 012-3456789.', { field: 'no_telefon_baru' });
    patch.no_telefon = tel;
  }
  var baru = update('guru', guru.id, patch, { actorId: ctx.akaunId });
  _auditJikaOrangLain(ctx, guru, 'SUNTING_PROFIL_GURU', 'maklumat teras');
  return _guruUntukPelayar(ctx, baru);
}

// ---------------------------------------------------------------------------
// Rekod anak: kelayakan, kursus, opsyen_guru
// ---------------------------------------------------------------------------

/** Lajur yang boleh diisi oleh pengguna bagi setiap jadual. guru_id SENTIASA ditentukan oleh server. */
var REKOD_GURU = {
  kelayakan: ['tahap', 'bidang', 'institusi', 'tahun_tamat'],
  tugasan_guru: ['tahun_akademik', 'jenis_tugasan', 'kumpulan', 'nama_tugasan', 'subjek_id', 'bilangan_kelas', 'jabatan', 'jam_kredit'],
  kursus: ['tajuk', 'penganjur', 'tarikh_mula', 'tarikh_tamat', 'jam', 'tahap'],
  opsyen_guru: ['jenis', 'subjek_id'],
  keahlian_unit: ['unit_id', 'tahun_akademik', 'jawatan'],
  guru_rumah: ['rumah_sukan_id', 'tahun_akademik', 'jawatan'],
  kumpulan_usrah_pelajar: ['tahun_akademik', 'nama_kumpulan', 'tingkatan', 'hari', 'bilangan_murid'],
  peranan_hem: ['tahun_akademik', 'jenis', 'kelas_id', 'butiran']
};

function _jadualRekod(params) {
  var j = params.jadual;
  if (typeof j !== 'string' || !Object.prototype.hasOwnProperty.call(REKOD_GURU, j)) throw new AppError('VALIDASI', 'Jenis rekod tidak sah.');
  return j;
}

function _dataRekod(jadual, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AppError('VALIDASI', 'Data tidak sah.');
  var out = {};
  Object.keys(data).forEach(function (k) {
    if (REKOD_GURU[jadual].indexOf(k) === -1) throw new AppError('VALIDASI', 'Medan "' + k + '" tidak dibenarkan.', { field: k });
    out[k] = data[k];
  });
  return out;
}

function _semakRekod(jadual, row) {
  if (jadual === 'peranan_hem') {
    if (row.jenis === 'guru_kelas' && !row.kelas_id) throw new AppError('VALIDASI', 'Pilih kelas untuk Guru Kelas.', { field: 'kelas_id' });
    if (row.jenis !== 'guru_kelas' && row.kelas_id) row.kelas_id = null;
    if (row.kelas_id) {
      var k = getById('kelas', row.kelas_id);
      if (k && row.tahun_akademik && k.tahun_akademik !== row.tahun_akademik) throw new AppError('VALIDASI', 'Kelas ini untuk tahun ' + k.tahun_akademik + '.', { field: 'kelas_id' });
    }
  }
  if (jadual === 'keahlian_unit' && row.unit_id) {
    var u = getById('unit_kokurikulum', row.unit_id);
    if (u && row.tahun_akademik && u.tahun_akademik !== row.tahun_akademik) throw new AppError('VALIDASI', 'Unit ini untuk tahun ' + u.tahun_akademik + '.', { field: 'unit_id' });
  }
  if (jadual === 'tugasan_guru') {
    if (row.jenis_tugasan === 'tidak_berjadual') {
      if (row.kumpulan !== 'tugasan_tidak_berjadual') throw new AppError('VALIDASI', 'Tugasan tidak berjadual mesti dalam kumpulan "Tugasan tidak berjadual".', { field: 'kumpulan' });
      if (!row.jabatan) throw new AppError('VALIDASI', 'Pilih jabatan untuk tugasan tidak berjadual.', { field: 'jabatan' });
    } else if (row.kumpulan === 'tugasan_tidak_berjadual') {
      throw new AppError('VALIDASI', 'Kumpulan ini hanya untuk tugasan tidak berjadual.', { field: 'kumpulan' });
    }
  }
  if (jadual === 'kursus' && row.tarikh_mula && row.tarikh_tamat && row.tarikh_tamat < row.tarikh_mula) {
    throw new AppError('VALIDASI', 'Tarikh tamat tidak boleh sebelum tarikh mula.', { field: 'tarikh_tamat' });
  }
  if (jadual === 'kelayakan' && row.tahun_tamat && (+row.tahun_tamat < 1950 || +row.tahun_tamat > +tahunSemasa() + 1)) {
    throw new AppError('VALIDASI', 'Tahun tamat tidak munasabah.', { field: 'tahun_tamat' });
  }
}

/** Tugasan guru diisi oleh pentadbir sahaja (keputusan pemilik): guru tidak perlu mengisi satu persatu. */
function _semakPenulisTugasan(ctx, jadual) {
  if (jadual === 'tugasan_guru' && !_isAdmin(ctx)) throw new AppError('TIADA_KEBENARAN', 'Tugasan diisi oleh pentadbir. Hubungi pentadbir jika ada pembetulan.');
}

function aksiRekodSimpan(ctx, params) {
  var jadual = _jadualRekod(params);
  _semakPenulisTugasan(ctx, jadual);
  var data = _dataRekod(jadual, params.data);
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Rekod');
    var lama = getById(jadual, id);
    if (!lama) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
    var guru = _sasaranGuru(ctx, lama.guru_id); // semakan pemilikan rekod sedia ada
    var gabung = {};
    Object.keys(lama).forEach(function (k) { gabung[k] = lama[k]; });
    Object.keys(data).forEach(function (k) { gabung[k] = data[k]; });
    _semakRekod(jadual, gabung);
    if (jadual === 'peranan_hem' && gabung.kelas_id === null && lama.kelas_id) data.kelas_id = null;
    hasil = update(jadual, id, data, { actorId: ctx.akaunId });
    _auditJikaOrangLain(ctx, guru, 'SUNTING_PROFIL_GURU', jadual + ' dikemas kini');
  } else {
    var g = _sasaranGuru(ctx, params.guru_id);
    if (query(jadual, { guru_id: g.id }).length >= 200) throw new AppError('VALIDASI', 'Had bilangan rekod dicapai.');
    data.guru_id = g.id;
    _semakRekod(jadual, data);
    hasil = insert(jadual, data, { actorId: ctx.akaunId });
    _auditJikaOrangLain(ctx, g, 'SUNTING_PROFIL_GURU', jadual + ' ditambah');
  }
  var out = _pilih(['id'].concat(REKOD_GURU[jadual]))(hasil);
  if (jadual === 'opsyen_guru') { var s = getById('subjek', out.subjek_id); out.subjek_nama = s ? s.nama : ''; }
  return out;
}

function aksiRekodPadam(ctx, params) {
  var jadual = _jadualRekod(params);
  _semakPenulisTugasan(ctx, jadual);
  var id = pUuid(params, 'id', 'Rekod');
  var lama = getById(jadual, id);
  if (!lama) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
  var guru = _sasaranGuru(ctx, lama.guru_id);
  remove(jadual, id, { actorId: ctx.akaunId });
  _auditJikaOrangLain(ctx, guru, 'SUNTING_PROFIL_GURU', jadual + ' dipadam');
  return { dipadam: true };
}

// ---------------------------------------------------------------------------
// Tempoh percubaan
// ---------------------------------------------------------------------------

var BULAN_PERCUBAAN = 6;

/** Tarikh hari ini (ISO) dalam zon Malaysia. */
function hariIni() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

/** "2026-01-31" + 6 bulan -> "2026-07-31"; "2026-08-31" -> "2027-02-28" (hari dihadkan kepada hujung bulan). */
function tarikhTamatPercubaan(tarikhLantikan) {
  if (!tarikhLantikan || !isIsoDate(tarikhLantikan)) return null;
  var y = +tarikhLantikan.slice(0, 4), m = +tarikhLantikan.slice(5, 7) + BULAN_PERCUBAAN, d = +tarikhLantikan.slice(8, 10);
  y += Math.floor((m - 1) / 12);
  m = ((m - 1) % 12) + 1;
  var akhirBulan = new Date(Date.UTC(y, m, 0)).getUTCDate();
  d = Math.min(d, akhirBulan);
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}

/** null jika bukan percubaan; jika ya { tarikh_tamat, tamat, perlu_tarikh_lantikan }. */
function statusPercubaan(guru, hari) {
  if (!guru || guru.status_lantikan !== 'percubaan') return null;
  var tamat = tarikhTamatPercubaan(guru.tarikh_lantikan);
  return { tarikh_tamat: tamat, tamat: !!tamat && hari >= tamat, perlu_tarikh_lantikan: !tamat };
}

var HARI_AMARAN_PRAKTIKAL = 30;

/** null jika bukan praktikal; jika ya { tarikh_tamat, tamat, hampir (dalam 30 hari), perlu_tarikh }. */
function statusPraktikal(guru, hari) {
  if (!guru || guru.status_lantikan !== 'praktikal') return null;
  var t = guru.tarikh_tamat_praktikal;
  if (!t) return { tarikh_tamat: null, tamat: false, hampir: false, perlu_tarikh: true };
  var hariLagi = Math.round((Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)) - Date.UTC(+hari.slice(0, 4), +hari.slice(5, 7) - 1, +hari.slice(8, 10))) / 86400000);
  return { tarikh_tamat: t, tamat: hariLagi < 0, hampir: hariLagi >= 0 && hariLagi <= HARI_AMARAN_PRAKTIKAL, hari_lagi: hariLagi, perlu_tarikh: false };
}

function aksiPercubaanSahkan(ctx, params) {
  var guru = _sasaranGuru(ctx, pUuid(params, 'guru_id', 'Guru'));
  if (guru.status_lantikan !== 'percubaan') throw new AppError('VALIDASI', 'Guru ini bukan dalam tempoh percubaan.');
  var baru = update('guru', guru.id, { status_lantikan: 'tetap', tarikh_disahkan: hariIni() }, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'SAHKAN_GURU_TETAP', guru.guru_kod, 'tamat percubaan: ' + (tarikhTamatPercubaan(guru.tarikh_lantikan) || '-'));
  return _guruUntukPelayar(ctx, baru);
}

// ---------------------------------------------------------------------------
// Cerapan: guru sendiri, atau pentadbir (GK, PK, Pengetua) bagi pihak guru
// ---------------------------------------------------------------------------

function aksiCerapanSimpan(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = pStr(params, 'tahun_akademik', { label: 'Tahun', max: 4, re: /^\d{4}$/ });
  var row = {
    bilangan_dicerap: params.bilangan_dicerap,
    pencerap: pStr(params, 'pencerap', { label: 'Pencerap', max: 200, optional: true }),
    catatan: pStr(params, 'catatan', { label: 'Catatan', max: 1000, optional: true })
  };
  var ada = query('cerapan', { guru_id: guru.id, tahun_akademik: tahun })[0];
  var hasil = ada
    ? update('cerapan', ada.id, row, { actorId: ctx.akaunId })
    : insert('cerapan', { guru_id: guru.id, tahun_akademik: tahun, bilangan_dicerap: row.bilangan_dicerap, pencerap: row.pencerap, catatan: row.catatan }, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'CERAPAN_SIMPAN', guru.guru_kod, tahun + ': ' + hasil.bilangan_dicerap + ' kali' + (guru.id !== ctx.guruId ? ' (bagi pihak guru)' : ''));
  return _pilih(['id', 'tahun_akademik', 'bilangan_dicerap', 'pencerap', 'catatan'])(hasil);
}

// ---------------------------------------------------------------------------
// Senarai guru (pentadbir) dan subjek
// ---------------------------------------------------------------------------

function aksiGuruSenarai(ctx) {
  var tahun = tahunSemasa(), hari = hariIni();
  var cerap = {};
  query('cerapan', { tahun_akademik: tahun }).forEach(function (c) { cerap[c.guru_id] = c.bilangan_dicerap; });
  var tugasan = {};
  query('tugasan_guru', { tahun_akademik: tahun }).forEach(function (t) { (tugasan[t.guru_id] = tugasan[t.guru_id] || []).push(t); });
  var had = hadJamKredit(tahun);
  return {
    tahun: tahun,
    had: had,
    guru: senaraiGuruMengajar({ termasukTidakAktif: true }).map(function (g) {
      var jam = kiraJamKredit(tugasan[g.id] || []);
      return {
        id: g.id, guru_kod: g.guru_kod, nama_penuh: g.nama_penuh, jawatan: g.jawatan, status_lantikan: g.status_lantikan,
        aktif: g.aktif, cerapan_tahun_ini: cerap[g.id] || 0, percubaan: statusPercubaan(g, hari), praktikal: statusPraktikal(g, hari),
        jam_berjadual: jam.berjadual, jam_tidak_berjadual: jam.tidak_berjadual,
        status_beban: statusBebanKeseluruhan(jam, had)
      };
    }),
    ref: { status_lantikan: _refSenarai('ref_status_lantikan') }
  };
}

function aksiSubjekSenarai() {
  return { subjek: _subjekSenarai(), kategori: _refSenarai('ref_kategori_subjek') };
}

function aksiSubjekSimpan(ctx, params) {
  var row = {
    nama: pStr(params, 'nama', { label: 'Nama subjek', min: 2, max: 120 }),
    kod: pStr(params, 'kod', { label: 'Kod', max: 20, optional: true }),
    kategori: pStr(params, 'kategori', { label: 'Kategori', max: 40 })
  };
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Subjek');
    if (!getById('subjek', id)) throw new AppError('TIDAK_JUMPA', 'Subjek tidak dijumpai.');
    hasil = update('subjek', id, row, { actorId: ctx.akaunId });
  } else {
    hasil = insert('subjek', row, { actorId: ctx.akaunId });
  }
  logAudit(ctx.akaunId, 'SUBJEK_SIMPAN', row.nama);
  return _pilih(['id', 'nama', 'kod', 'kategori'])(hasil);
}

// ======================================================================
// Kurikulum.gs
// ======================================================================
/**
 * Kurikulum.gs — tugasan, jam kredit, jadual waktu, pertindihan dan slot kosong (Fasa 3).
 *
 * Bahagian 1: FUNGSI TULEN (tiada akses Sheets) — mudah diuji di Node.
 * Bahagian 2: AKSI API — guna repository, semak akses.
 *
 * Jam kredit diambil daripada tugasan_guru.jam_kredit (nilai ditetapkan sekolah dalam surat tugasan),
 * BUKAN dikira daripada bilangan slot jadual. Bilangan slot hanya untuk semakan silang.
 */

// ===========================================================================
// Bahagian 1: fungsi tulen
// ===========================================================================

var HAD_LALAI = { had_berjadual: 22, had_tidak_berjadual: 10 };
var NISBAH_HAMPIR = 0.8; // >= 80% had = "hampir had"

function _bundar(n) { return Math.round(n * 100) / 100; }

/** Jumlah jam kredit berjadual dan tidak berjadual daripada senarai tugasan. */
function kiraJamKredit(tugasan) {
  var out = { berjadual: 0, tidak_berjadual: 0 };
  (tugasan || []).forEach(function (t) {
    var j = Number(t.jam_kredit) || 0;
    if (t.jenis_tugasan === 'berjadual') out.berjadual += j;
    else if (t.jenis_tugasan === 'tidak_berjadual') out.tidak_berjadual += j;
  });
  out.berjadual = _bundar(out.berjadual);
  out.tidak_berjadual = _bundar(out.tidak_berjadual);
  return out;
}

/** 'dalam' | 'hampir' | 'lebih' */
function statusBeban(jam, had) {
  if (jam > had) return 'lebih';
  if (jam >= had * NISBAH_HAMPIR) return 'hampir';
  return 'dalam';
}

function statusBebanKeseluruhan(jam, had) {
  var a = statusBeban(jam.berjadual, had.had_berjadual), b = statusBeban(jam.tidak_berjadual, had.had_tidak_berjadual);
  if (a === 'lebih' || b === 'lebih') return 'lebih';
  if (a === 'hampir' || b === 'hampir') return 'hampir';
  return 'dalam';
}

/** "07:40" -> 460 */
function minitDari(hhmm) {
  var m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  return m ? (+m[1]) * 60 + (+m[2]) : NaN;
}

/** Dua slot bertindih jika hari sama dan julat masa bersilang. Bersambung (08:10 tamat, 08:10 mula) TIDAK bertindih. */
function slotBertindih(a, b) {
  return a.hari === b.hari && minitDari(a.masa_mula) < minitDari(b.masa_akhir) && minitDari(b.masa_mula) < minitDari(a.masa_akhir);
}

/**
 * Kesan pertindihan.
 * slots: [{ id, guru_id, hari, masa_mula, masa_akhir, kelas_ids: [] }]
 * Pulangkan [{ jenis: 'guru'|'kelas', a: idSlot, b: idSlot, guru_id?, kelas_id? }]
 *  - 'guru'  : guru yang sama ada dua slot pada masa bertindih
 *  - 'kelas' : kelas yang sama diajar dua guru berbeza pada masa bertindih (amaran sahaja;
 *              boleh jadi sah untuk kelas elektif yang dipecahkan, contoh KMA/EKO)
 */
function kesanPertindihan(slots) {
  var out = [];
  for (var i = 0; i < slots.length; i++) {
    for (var j = i + 1; j < slots.length; j++) {
      var a = slots[i], b = slots[j];
      if (!slotBertindih(a, b)) continue;
      if (a.guru_id === b.guru_id) {
        out.push({ jenis: 'guru', a: a.id, b: b.id, guru_id: a.guru_id });
      } else {
        (a.kelas_ids || []).forEach(function (k) {
          if ((b.kelas_ids || []).indexOf(k) !== -1) out.push({ jenis: 'kelas', a: a.id, b: b.id, kelas_id: k });
        });
      }
    }
  }
  return out;
}

/** Senarai guru_id yang TIADA slot bertindih dengan julat yang diberi. */
function cariGuruKosong(guruIds, slots, hari, mula, akhir) {
  var sasaran = { hari: hari, masa_mula: mula, masa_akhir: akhir };
  var sibuk = {};
  slots.forEach(function (s) { if (slotBertindih(s, sasaran)) sibuk[s.guru_id] = true; });
  return guruIds.filter(function (id) { return !sibuk[id]; });
}

/** Bilangan waktu dalam templat yang diliputi oleh julat masa (untuk medan `tempoh`). */
function kiraTempoh(waktu, mula, akhir) {
  var a = minitDari(mula), b = minitDari(akhir);
  var n = (waktu || []).filter(function (w) { return minitDari(w.masa_mula) >= a && minitDari(w.masa_akhir) <= b; }).length;
  return n || null;
}

/** Templat waktu lalai (daripada jadual sekolah 2026). Superadmin boleh ubah di Data rujukan. */
var WAKTU_LALAI = [
  ['07:30', '07:40'], ['07:40', '08:10'], ['08:10', '08:40'], ['08:40', '09:00'], ['09:00', '09:40'], ['09:40', '10:00'],
  ['10:00', '10:30'], ['10:30', '11:00'], ['11:00', '11:30'], ['11:30', '12:00'], ['12:00', '12:30'], ['12:30', '12:55'],
  ['12:55', '13:20'], ['13:20', '13:45'], ['13:45', '14:05'], ['14:05', '14:30'], ['14:30', '15:00'], ['15:00', '15:30']
];

// ===========================================================================
// Bahagian 2: aksi API
// ===========================================================================

function hadJamKredit(tahun) {
  var h = query('had_jam_kredit', { tahun_akademik: tahun })[0];
  return h ? { had_berjadual: h.had_berjadual, had_tidak_berjadual: h.had_tidak_berjadual } : { had_berjadual: HAD_LALAI.had_berjadual, had_tidak_berjadual: HAD_LALAI.had_tidak_berjadual };
}

function _tahunParam(params) {
  if (params.tahun === undefined || params.tahun === null || params.tahun === '') return tahunSemasa();
  return pStr(params, 'tahun', { label: 'Tahun', max: 4, re: /^\d{4}$/ });
}

/** Semua slot sah bagi satu tahun, dengan kelas_ids. Hanya slot `disahkan` digunakan dalam pengiraan. */
function _slotTahun(tahun, hanyaDisahkan) {
  var kelasBySlot = {};
  query('jadual_slot_kelas', {}).forEach(function (r) { (kelasBySlot[r.slot_id] = kelasBySlot[r.slot_id] || []).push(r.kelas_id); });
  var f = { tahun_akademik: tahun };
  if (hanyaDisahkan) f.disahkan = true;
  return query('jadual_slot', f).map(function (s) {
    s.kelas_ids = kelasBySlot[s.id] || [];
    return s;
  });
}

function aksiKurikulumLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = _tahunParam(params);
  var had = hadJamKredit(tahun);
  var tugasan = query('tugasan_guru', { guru_id: guru.id, tahun_akademik: tahun });
  var jam = kiraJamKredit(tugasan);
  var semua = _slotTahun(tahun, true);
  var milik = semua.filter(function (s) { return s.guru_id === guru.id; });
  var idMilik = {};
  milik.forEach(function (s) { idMilik[s.id] = true; });
  var pertindihan = kesanPertindihan(semua).filter(function (p) { return idMilik[p.a] || idMilik[p.b]; });

  var kelas = query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' });
  var kelasNama = {}; kelas.forEach(function (k) { kelasNama[k.id] = k.nama; });
  var subjek = _subjekSenarai();
  var subjekById = {}; subjek.forEach(function (s) { subjekById[s.id] = s; });
  var guruNama = {};
  if (pertindihan.length) query('guru', {}).forEach(function (g) { guruNama[g.id] = g.nama_penuh; });
  var slotById = {}; semua.forEach(function (s) { slotById[s.id] = s; });
  var huraiSlot = function (s) {
    return {
      id: s.id, hari: s.hari, masa_mula: s.masa_mula, masa_akhir: s.masa_akhir, tempoh: s.tempoh,
      subjek_id: s.subjek_id, subjek: s.subjek_id && subjekById[s.subjek_id] ? (subjekById[s.subjek_id].kod || subjekById[s.subjek_id].nama) : null,
      label: s.label, kelas_ids: s.kelas_ids, kelas: s.kelas_ids.map(function (k) { return kelasNama[k] || '?'; }), sumber: s.sumber,
      milik: !!idMilik[s.id], guru: s.guru_id === guru.id ? null : (guruNama[s.guru_id] || null)
    };
  };

  // Semakan opsyen: subjek diajar (tugasan atau jadual) yang bukan opsyen guru. Maklumat sahaja.
  var opsyen = {};
  query('opsyen_guru', { guru_id: guru.id }).forEach(function (o) { opsyen[o.subjek_id] = true; });
  var diajar = {};
  tugasan.forEach(function (t) { if (t.subjek_id) diajar[t.subjek_id] = true; });
  milik.forEach(function (s) { if (s.subjek_id) diajar[s.subjek_id] = true; });
  var luarOpsyen = Object.keys(diajar).filter(function (id) { return !opsyen[id]; })
    .map(function (id) { return subjekById[id] ? subjekById[id].nama : '?'; });

  var minitJadual = milik.reduce(function (a, s) { return a + (minitDari(s.masa_akhir) - minitDari(s.masa_mula)); }, 0);

  return {
    guru: { id: guru.id, nama_penuh: guru.nama_penuh, guru_kod: guru.guru_kod },
    milik_sendiri: guru.id === ctx.guruId,
    boleh: { tugasan: _isAdmin(ctx) },
    tahun: tahun,
    had: had,
    jam: jam,
    status: { berjadual: statusBeban(jam.berjadual, had.had_berjadual), tidak_berjadual: statusBeban(jam.tidak_berjadual, had.had_tidak_berjadual) },
    tugasan: tugasan.map(_pilih(['id'].concat(REKOD_GURU.tugasan_guru))).map(function (t) {
      t.subjek_nama = t.subjek_id && subjekById[t.subjek_id] ? subjekById[t.subjek_id].nama : null;
      return t;
    }),
    slot: milik.map(huraiSlot),
    pertindihan: pertindihan.map(function (p) {
      var a = slotById[p.a], b = slotById[p.b];
      return { jenis: p.jenis, kelas: p.kelas_id ? kelasNama[p.kelas_id] : null, a: huraiSlot(a), b: huraiSlot(b) };
    }),
    luar_opsyen: luarOpsyen,
    semakan_silang: { bilangan_slot: milik.length, waktu: milik.reduce(function (a, s) { return a + (s.tempoh || 0); }, 0), jam_jadual: _bundar(minitJadual / 60) },
    ref: {
      subjek: subjek, kelas: kelas.map(_pilih(['id', 'nama', 'tingkatan'])),
      waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
      hari: _refSenarai('ref_hari'), jenis_tugasan: _refSenarai('ref_jenis_tugasan'),
      kumpulan: _refSenarai('ref_kumpulan_tugasan'), jabatan: _refSenarai('ref_jabatan')
    }
  };
}

function _kelasIds(params) {
  var ids = params.kelas_ids === undefined || params.kelas_ids === null ? [] : params.kelas_ids;
  if (!Array.isArray(ids) || ids.length > 12) throw new AppError('VALIDASI', 'Senarai kelas tidak sah.', { field: 'kelas_ids' });
  var seen = {};
  return ids.filter(function (k) {
    if (typeof k !== 'string' || !UUID_RE.test(k)) throw new AppError('VALIDASI', 'Kelas tidak sah.', { field: 'kelas_ids' });
    if (!getById('kelas', k)) throw new AppError('VALIDASI', 'Kelas tidak wujud.', { field: 'kelas_ids' });
    if (seen[k]) return false;
    seen[k] = true; return true;
  });
}

function aksiSlotSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = {
    hari: pStr(params, 'hari', { label: 'Hari', max: 20 }),
    masa_mula: pStr(params, 'masa_mula', { label: 'Masa mula', max: 5, re: TIME_RE, reMsg: 'Masa mula tidak sah (JJ:MM).' }),
    masa_akhir: pStr(params, 'masa_akhir', { label: 'Masa akhir', max: 5, re: TIME_RE, reMsg: 'Masa akhir tidak sah (JJ:MM).' }),
    subjek_id: params.subjek_id ? pUuid(params, 'subjek_id', 'Subjek') : null,
    label: pStr(params, 'label', { label: 'Aktiviti', max: 60, optional: true })
  };
  if (minitDari(row.masa_akhir) <= minitDari(row.masa_mula)) throw new AppError('VALIDASI', 'Masa akhir mesti selepas masa mula.', { field: 'masa_akhir' });
  if (!row.subjek_id && !row.label) throw new AppError('VALIDASI', 'Pilih subjek atau isi nama aktiviti (contoh Perhimpunan).', { field: 'subjek_id' });
  var kelasIds = _kelasIds(params);
  row.tempoh = kiraTempoh(query('waktu', { tahun_akademik: tahun }), row.masa_mula, row.masa_akhir);

  var slot, guru;
  if (params.id) {
    var id = pUuid(params, 'id', 'Slot');
    var lama = getById('jadual_slot', id);
    if (!lama) throw new AppError('TIDAK_JUMPA', 'Slot tidak dijumpai.');
    guru = _sasaranGuru(ctx, lama.guru_id);
    row.disahkan = true;
    slot = update('jadual_slot', id, row, { actorId: ctx.akaunId });
    query('jadual_slot_kelas', { slot_id: id }).forEach(function (r) { remove('jadual_slot_kelas', r.id); });
  } else {
    guru = _sasaranGuru(ctx, params.guru_id);
    row.guru_id = guru.id; row.tahun_akademik = tahun; row.sumber = 'manual'; row.disahkan = true;
    slot = insert('jadual_slot', row, { actorId: ctx.akaunId });
  }
  kelasIds.forEach(function (k) { insert('jadual_slot_kelas', { slot_id: slot.id, kelas_id: k }, { actorId: ctx.akaunId, skipFk: true }); });
  _auditJikaOrangLain(ctx, guru, 'SUNTING_JADUAL_GURU', row.hari + ' ' + row.masa_mula);

  // Amaran pertindihan yang melibatkan slot ini
  var semua = _slotTahun(slot.tahun_akademik, true);
  var amaran = kesanPertindihan(semua).filter(function (p) { return p.a === slot.id || p.b === slot.id; });
  return { id: slot.id, amaran: amaran.length };
}

function aksiSlotPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Slot');
  var lama = getById('jadual_slot', id);
  if (!lama) throw new AppError('TIDAK_JUMPA', 'Slot tidak dijumpai.');
  var guru = _sasaranGuru(ctx, lama.guru_id);
  query('jadual_slot_kelas', { slot_id: id }).forEach(function (r) { remove('jadual_slot_kelas', r.id); });
  remove('jadual_slot', id);
  _auditJikaOrangLain(ctx, guru, 'SUNTING_JADUAL_GURU', 'slot dipadam');
  return { dipadam: true };
}

/** Cari guru yang tiada kelas pada hari dan masa tertentu (untuk guru ganti). Pentadbir sahaja. */
function aksiSlotKosong(ctx, params) {
  var tahun = _tahunParam(params);
  var hari = pStr(params, 'hari', { label: 'Hari', max: 20 });
  var mula = pStr(params, 'masa_mula', { label: 'Masa mula', max: 5, re: TIME_RE });
  var akhir = pStr(params, 'masa_akhir', { label: 'Masa akhir', max: 5, re: TIME_RE });
  if (minitDari(akhir) <= minitDari(mula)) throw new AppError('VALIDASI', 'Masa akhir mesti selepas masa mula.');
  var subjekId = params.subjek_id ? pUuid(params, 'subjek_id', 'Subjek') : null;
  var jabatan = pStr(params, 'jabatan', { label: 'Jabatan', max: 20, optional: true });

  var guru = senaraiGuruMengajar();
  var kosong = cariGuruKosong(guru.map(function (g) { return g.id; }), _slotTahun(tahun, true), hari, mula, akhir);
  var set = {}; kosong.forEach(function (id) { set[id] = true; });

  var opsyenGuru = {};
  query('opsyen_guru', {}).forEach(function (o) { (opsyenGuru[o.guru_id] = opsyenGuru[o.guru_id] || {})[o.subjek_id] = o.jenis; });
  var jabatanGuru = {};
  query('tugasan_guru', { tahun_akademik: tahun }).forEach(function (t) { if (t.jabatan) (jabatanGuru[t.guru_id] = jabatanGuru[t.guru_id] || {})[t.jabatan] = true; });
  var tugasan = {};
  query('tugasan_guru', { tahun_akademik: tahun }).forEach(function (t) { (tugasan[t.guru_id] = tugasan[t.guru_id] || []).push(t); });

  var hasil = guru.filter(function (g) {
    if (!set[g.id]) return false;
    if (subjekId && !(opsyenGuru[g.id] && opsyenGuru[g.id][subjekId])) return false;
    if (jabatan && !(jabatanGuru[g.id] && jabatanGuru[g.id][jabatan])) return false;
    return true;
  }).map(function (g) {
    return {
      id: g.id, nama_penuh: g.nama_penuh, guru_kod: g.guru_kod, jawatan: g.jawatan,
      opsyen: subjekId && opsyenGuru[g.id] ? opsyenGuru[g.id][subjekId] : null,
      jam_berjadual: kiraJamKredit(tugasan[g.id] || []).berjadual
    };
  });
  // Guru paling ringan beban didahulukan
  hasil.sort(function (a, b) { return a.jam_berjadual - b.jam_berjadual; });
  return { tahun: tahun, guru: hasil, jumlah_guru_aktif: guru.length };
}

/** Data untuk borang carian slot kosong. */
function aksiSlotKosongRujukan(ctx, params) {
  var tahun = _tahunParam(params);
  return {
    tahun: tahun,
    waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
    hari: _refSenarai('ref_hari'), jabatan: _refSenarai('ref_jabatan'), subjek: _subjekSenarai()
  };
}

// ---------------------------------------------------------------------------
// Data rujukan kurikulum (superadmin): kelas, waktu, had jam kredit
// ---------------------------------------------------------------------------

function aksiKurikulumRujukan(ctx, params) {
  var tahun = _tahunParam(params);
  return {
    tahun: tahun,
    kelas: query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'tingkatan'])),
    waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
    had: hadJamKredit(tahun)
  };
}

/** Tambah kelas secara pukal: satu kelas setiap baris, contoh "1 Tabari". Tingkatan diambil daripada nombor di depan. */
function aksiKelasPukal(ctx, params) {
  var tahun = _tahunParam(params);
  var teks = pStr(params, 'teks', { label: 'Senarai kelas', max: 5000 });
  var ada = {};
  query('kelas', { tahun_akademik: tahun }).forEach(function (k) { ada[k.nama.toLowerCase()] = true; });
  var ditambah = [], dilangkau = [], ralat = [];
  teks.split(/\r?\n/).map(function (x) { return x.trim().replace(/\s+/g, ' '); }).filter(Boolean).forEach(function (nama) {
    var m = /^([1-6])\s*\S/.exec(nama);
    if (!m) { ralat.push(nama + ' (mesti bermula dengan tingkatan 1-6)'); return; }
    if (ada[nama.toLowerCase()]) { dilangkau.push(nama); return; }
    insert('kelas', { nama: nama.slice(0, 60), tingkatan: +m[1], tahun_akademik: tahun }, { actorId: ctx.akaunId });
    ada[nama.toLowerCase()] = true;
    ditambah.push(nama);
  });
  logAudit(ctx.akaunId, 'KELAS_PUKAL', tahun, ditambah.length + ' kelas');
  return { ditambah: ditambah, dilangkau: dilangkau, ralat: ralat };
}

function aksiKelasPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Kelas');
  if (!getById('kelas', id)) throw new AppError('TIDAK_JUMPA', 'Kelas tidak dijumpai.');
  if (query('jadual_slot_kelas', { kelas_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Kelas ini masih digunakan dalam jadual. Buang daripada slot dahulu.');
  remove('kelas', id);
  return { dipadam: true };
}

/** Tambah subjek pukal: "KOD - Nama subjek" atau "Nama subjek" setiap baris. */
function aksiSubjekPukal(ctx, params) {
  var teks = pStr(params, 'teks', { label: 'Senarai subjek', max: 5000 });
  var ada = {};
  query('subjek', {}).forEach(function (s) { ada[s.nama.toLowerCase()] = true; });
  var ditambah = [], dilangkau = [];
  teks.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (baris) {
    var m = /^([A-Za-z0-9/]{1,15})\s+-\s+(.+)$/.exec(baris);
    var kod = m ? m[1].toUpperCase() : null, nama = (m ? m[2] : baris).trim().slice(0, 120);
    if (ada[nama.toLowerCase()]) { dilangkau.push(nama); return; }
    insert('subjek', { nama: nama, kod: kod, kategori: 'subjek' }, { actorId: ctx.akaunId });
    ada[nama.toLowerCase()] = true;
    ditambah.push(nama);
  });
  logAudit(ctx.akaunId, 'SUBJEK_PUKAL', null, ditambah.length + ' subjek');
  return { ditambah: ditambah, dilangkau: dilangkau };
}

/** Ganti templat waktu bagi satu tahun. waktu: [{ masa_mula, masa_akhir }] mengikut urutan. */
function aksiWaktuSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var list = params.waktu;
  if (!Array.isArray(list) || !list.length || list.length > 30) throw new AppError('VALIDASI', 'Senarai waktu tidak sah.');
  list.forEach(function (w, i) {
    if (!w || !TIME_RE.test(w.masa_mula) || !TIME_RE.test(w.masa_akhir) || minitDari(w.masa_akhir) <= minitDari(w.masa_mula)) {
      throw new AppError('VALIDASI', 'Waktu ' + (i + 1) + ' tidak sah.');
    }
    if (i > 0 && minitDari(w.masa_mula) < minitDari(list[i - 1].masa_akhir)) throw new AppError('VALIDASI', 'Waktu ' + (i + 1) + ' bertindih dengan waktu sebelumnya.');
  });
  query('waktu', { tahun_akademik: tahun }).forEach(function (w) { remove('waktu', w.id); });
  list.forEach(function (w, i) { insert('waktu', { tahun_akademik: tahun, nombor: i + 1, masa_mula: w.masa_mula, masa_akhir: w.masa_akhir }, { actorId: ctx.akaunId }); });
  logAudit(ctx.akaunId, 'WAKTU_SIMPAN', tahun, list.length + ' waktu');
  return { bilangan: list.length };
}

function aksiHadSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = { had_berjadual: params.had_berjadual, had_tidak_berjadual: params.had_tidak_berjadual };
  var ada = query('had_jam_kredit', { tahun_akademik: tahun })[0];
  if (ada) update('had_jam_kredit', ada.id, row, { actorId: ctx.akaunId });
  else { row.tahun_akademik = tahun; insert('had_jam_kredit', row, { actorId: ctx.akaunId }); }
  logAudit(ctx.akaunId, 'HAD_JAM_SIMPAN', tahun, row.had_berjadual + '/' + row.had_tidak_berjadual);
  return hadJamKredit(tahun);
}

/** Sediakan templat waktu lalai untuk tahun semasa (dipanggil oleh setupTemplate). */
function _seedWaktu() {
  var tahun = tahunSemasa();
  if (query('waktu', { tahun_akademik: tahun }).length) return 'Templat waktu ' + tahun + ': sedia ada';
  WAKTU_LALAI.forEach(function (w, i) { insert('waktu', { tahun_akademik: tahun, nombor: i + 1, masa_mula: w[0], masa_akhir: w[1] }, { actorId: 'setup' }); });
  return 'Templat waktu ' + tahun + ': ' + WAKTU_LALAI.length + ' waktu';
}

// ======================================================================
// Import.gs
// ======================================================================
/**
 * Import.gs — import pukal oleh pentadbir (Fasa 3).
 *
 *  1. Jadual daripada eksport aSc Timetables (XML). Fail dibaca di PELAYAR (js/asc.js), dipadankan
 *     dengan guru/subjek/kelas, dan disemak serta disunting oleh pentadbir. Hanya selepas
 *     "Sahkan dan simpan" barulah slot dihantar ke sini, dalam kumpulan kecil (beberapa guru sekali).
 *  2. Tugasan guru daripada jadual Excel/CSV (salin-tampal). Dipadankan di pelayar, disahkan di sini.
 *
 * Server tetap menyemak SETIAP baris (jenis, julat, rujukan wujud) walaupun pelayar sudah menyemak.
 */

var IMPORT_MAX_BARIS = 600; // setiap panggilan

function aksiImportRujukan(ctx, params) {
  var tahun = _tahunParam(params);
  return {
    tahun: tahun,
    guru: senaraiGuruMengajar().map(_pilih(['id', 'guru_kod', 'nama_penuh'])),
    subjek: _subjekSenarai(),
    kelas: query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'tingkatan'])),
    waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
    hari: _refSenarai('ref_hari'), jabatan: _refSenarai('ref_jabatan'),
    kumpulan: _refSenarai('ref_kumpulan_tugasan'), jenis_tugasan: _refSenarai('ref_jenis_tugasan'),
    had: hadJamKredit(tahun),
    jadual_sedia_ada: query('jadual_slot', { tahun_akademik: tahun }).length,
    tugasan_sedia_ada: query('tugasan_guru', { tahun_akademik: tahun }).length
  };
}

function _senaraiGuruId(params) {
  var ids = params.guru_ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100) throw new AppError('VALIDASI', 'Senarai guru tidak sah.');
  ids.forEach(function (id) { if (typeof id !== 'string' || !UUID_RE.test(id)) throw new AppError('VALIDASI', 'ID guru tidak sah.'); });
  return ids;
}

/**
 * Simpan jadual bagi sekumpulan guru. Jadual tahun itu bagi guru dalam guru_ids DIGANTI sepenuhnya.
 * params: { tahun, guru_ids: [...], slot: [{ guru_id, hari, masa_mula, masa_akhir, subjek_id?, label?, kelas_ids: [] }] }
 */
function aksiJadualImport(ctx, params) {
  var tahun = _tahunParam(params);
  var guruIds = _senaraiGuruId(params);
  var slots = params.slot;
  if (!Array.isArray(slots) || slots.length > IMPORT_MAX_BARIS) throw new AppError('VALIDASI', 'Terlalu banyak slot dalam satu kumpulan (maksimum ' + IMPORT_MAX_BARIS + ').');
  var dibenar = {}; guruIds.forEach(function (id) { dibenar[id] = true; });
  var waktu = query('waktu', { tahun_akademik: tahun });
  var kelasSah = {}; query('kelas', { tahun_akademik: tahun }).forEach(function (k) { kelasSah[k.id] = true; });

  var barisSlot = [], barisKelas = [];
  slots.forEach(function (x, i) {
    var n = 'Slot ' + (i + 1) + ': ';
    if (!x || typeof x !== 'object') throw new AppError('VALIDASI', n + 'data tidak sah.');
    if (!dibenar[x.guru_id]) throw new AppError('VALIDASI', n + 'guru tiada dalam senarai kumpulan ini.');
    if (!TIME_RE.test(x.masa_mula) || !TIME_RE.test(x.masa_akhir) || minitDari(x.masa_akhir) <= minitDari(x.masa_mula)) throw new AppError('VALIDASI', n + 'masa tidak sah.');
    if (!x.subjek_id && !x.label) throw new AppError('VALIDASI', n + 'perlu subjek atau nama aktiviti.');
    var kelasIds = Array.isArray(x.kelas_ids) ? x.kelas_ids : [];
    if (kelasIds.length > 12) throw new AppError('VALIDASI', n + 'terlalu banyak kelas.');
    var id = uuid();
    barisSlot.push({
      id: id, guru_id: x.guru_id, tahun_akademik: tahun, hari: x.hari, masa_mula: x.masa_mula, masa_akhir: x.masa_akhir,
      subjek_id: x.subjek_id || null, label: x.label ? String(x.label).slice(0, 60) : null,
      tempoh: kiraTempoh(waktu, x.masa_mula, x.masa_akhir), sumber: 'asc', disahkan: true
    });
    var seen = {};
    kelasIds.forEach(function (k) {
      if (!kelasSah[k]) throw new AppError('VALIDASI', n + 'kelas tidak wujud untuk tahun ' + tahun + '.');
      if (!seen[k]) { seen[k] = true; barisKelas.push({ slot_id: id, kelas_id: k }); }
    });
  });

  // Ganti secara selamat: slot baharu disahkan dahulu; jika gagal, jadual lama kekal.
  var lama = query('jadual_slot', { tahun_akademik: tahun, guru_id: guruIds }).map(function (s) { return s.id; });
  replaceWhere('jadual_slot', { tahun_akademik: tahun, guru_id: guruIds }, barisSlot, { actorId: ctx.akaunId });
  replaceWhere('jadual_slot_kelas', { slot_id: lama }, barisKelas, { actorId: ctx.akaunId, skipFk: true });
  logAudit(ctx.akaunId, 'JADUAL_IMPORT', tahun, guruIds.length + ' guru, ' + barisSlot.length + ' slot');
  return { guru: guruIds.length, slot: barisSlot.length, diganti: lama.length };
}

/**
 * Simpan tugasan guru secara pukal.
 * params: { tahun, ganti: true|false, tugasan: [{ guru_id, jenis_tugasan, kumpulan, nama_tugasan, subjek_id?, bilangan_kelas?, jabatan?, jam_kredit }] }
 * ganti = true: tugasan tahun itu bagi guru yang ada dalam fail dipadam dahulu.
 */
function aksiTugasanImport(ctx, params) {
  var tahun = _tahunParam(params);
  var list = params.tugasan;
  if (!Array.isArray(list) || !list.length || list.length > IMPORT_MAX_BARIS) throw new AppError('VALIDASI', 'Senarai tugasan tidak sah (1 hingga ' + IMPORT_MAX_BARIS + ' baris).');
  var guruSah = {}; query('guru', {}).forEach(function (g) { guruSah[g.id] = true; });
  var rows = list.map(function (t, i) {
    if (!t || typeof t !== 'object') throw new AppError('VALIDASI', 'Baris ' + (i + 1) + ': data tidak sah.');
    if (!guruSah[t.guru_id]) throw new AppError('VALIDASI', 'Baris ' + (i + 1) + ': guru tidak dijumpai.');
    var row = { guru_id: t.guru_id, tahun_akademik: tahun };
    REKOD_GURU.tugasan_guru.forEach(function (k) { if (k !== 'tahun_akademik' && t[k] !== undefined) row[k] = t[k]; });
    try { _semakRekod('tugasan_guru', row); } catch (e) { e.message = 'Baris ' + (i + 1) + ': ' + e.message; throw e; }
    return row;
  });
  var guruIds = Object.keys(rows.reduce(function (a, r) { a[r.guru_id] = true; return a; }, {}));
  var dipadam = 0;
  if (params.ganti === true) dipadam = replaceWhere('tugasan_guru', { tahun_akademik: tahun, guru_id: guruIds }, rows, { actorId: ctx.akaunId }).dipadam;
  else insertMany('tugasan_guru', rows, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'TUGASAN_IMPORT', tahun, guruIds.length + ' guru, ' + rows.length + ' tugasan' + (dipadam ? ', ' + dipadam + ' diganti' : ''));
  return { guru: guruIds.length, tugasan: rows.length, diganti: dipadam };
}

// ======================================================================
// Kokurikulum.gs
// ======================================================================
/**
 * Kokurikulum.gs — unit (Syabab, kelab, pasukan), rumah sukan, juara rumah sukan, pertandingan (Fasa 4).
 *
 * Akses:
 *  - Guru: lihat dan isi keahlian unit, rumah sukan dan pertandingan SENDIRI.
 *  - Pentadbir: semua di atas bagi mana-mana guru, ditambah urus senarai unit (termasuk semua kelab),
 *    rumah sukan, sejarah juara dan senarai pertandingan seluruh sekolah.
 */

var RUMAH_LALAI = [['Fatah', 'merah', '#d9534f'], ['Falah', 'hijau', '#2e9e4f'], ['Najah', 'biru', '#2f6fb3'], ['Solah', 'kuning', '#e0b020']];
var SYABAB_LALAI = ['KASPA', 'KRS', 'BSMM', 'Puteri Islam'];

// ---------------------------------------------------------------------------
// Fungsi tulen
// ---------------------------------------------------------------------------

/**
 * Kiraan pingat rumah sukan merentas tahun.
 * juara: [{ tahun_akademik, rumah_sukan_id, kedudukan }] -> { rumah_id: { johan, naib, ketiga, keempat } }
 */
function kiraJuaraRumah(juara) {
  var out = {};
  var nama = ['johan', 'naib', 'ketiga', 'keempat'];
  (juara || []).forEach(function (j) {
    var o = out[j.rumah_sukan_id] = out[j.rumah_sukan_id] || { johan: 0, naib: 0, ketiga: 0, keempat: 0 };
    var k = nama[j.kedudukan - 1];
    if (k) o[k]++;
  });
  return out;
}

/** Baca teks CSV juara: "tahun,rumah,kedudukan[,catatan]" setiap baris. Baris tajuk diabaikan. */
function bacaTeksJuara(teks, rumah) {
  var byNama = {};
  rumah.forEach(function (r) { byNama[String(r.nama).toLowerCase()] = r.id; });
  var baris = [], ralat = [];
  String(teks || '').split(/\r?\n/).forEach(function (line, i) {
    line = line.trim();
    if (!line) return;
    var p = line.split(/\t|,|;/).map(function (x) { return x.trim(); });
    if (i === 0 && !/^\d{4}$/.test(p[0])) return; // tajuk
    var tahun = p[0], rid = byNama[String(p[1] || '').toLowerCase()], ked = parseInt(p[2], 10);
    if (!/^\d{4}$/.test(tahun)) { ralat.push('Baris ' + (i + 1) + ': tahun tidak sah'); return; }
    if (!rid) { ralat.push('Baris ' + (i + 1) + ': rumah "' + (p[1] || '') + '" tidak dikenali'); return; }
    if (!(ked >= 1 && ked <= 4)) { ralat.push('Baris ' + (i + 1) + ': kedudukan mesti 1 hingga 4'); return; }
    baris.push({ tahun_akademik: tahun, rumah_sukan_id: rid, kedudukan: ked, catatan: p.slice(3).join(', ') || null });
  });
  return { baris: baris, ralat: ralat };
}

// ---------------------------------------------------------------------------
// Bantuan
// ---------------------------------------------------------------------------

function _unitTahun(tahun) {
  return query('unit_kokurikulum', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'jenis']));
}
function _rumahSemua() {
  return query('rumah_sukan', {}, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'warna']));
}
function _kokuRef() {
  return {
    jenis_unit: _refSenarai('ref_jenis_unit'), jawatan_unit: _refSenarai('ref_jawatan_unit'),
    peringkat: _refSenarai('ref_peringkat_pertandingan'), peranan: _refSenarai('ref_peranan_pertandingan')
  };
}

/** Pertandingan dengan senarai peserta guru. */
function _pertandinganLengkap(list) {
  var guruNama = {};
  query('guru', {}).forEach(function (g) { guruNama[g.id] = g.nama_penuh; });
  var unitNama = {};
  query('unit_kokurikulum', {}).forEach(function (u) { unitNama[u.id] = u.nama; });
  var peserta = {};
  query('penyertaan_pertandingan', {}).forEach(function (p) {
    (peserta[p.pertandingan_id] = peserta[p.pertandingan_id] || []).push({ id: p.id, guru_id: p.guru_id, nama: guruNama[p.guru_id] || '?', peranan: p.peranan });
  });
  return list.map(function (p) {
    var o = _pilih(['id', 'nama_acara', 'peringkat', 'tarikh', 'bilangan_murid', 'pencapaian', 'unit_id', 'tahun_akademik'])(p);
    o.unit_nama = p.unit_id ? unitNama[p.unit_id] || null : null;
    o.peserta = peserta[p.id] || [];
    return o;
  }).sort(function (a, b) { return (b.tarikh || '') < (a.tarikh || '') ? -1 : 1; });
}

function _bolehSuntingPertandingan(ctx, pertandinganId) {
  if (_isAdmin(ctx)) return true;
  return query('penyertaan_pertandingan', { pertandingan_id: pertandinganId, guru_id: ctx.guruId }).length > 0;
}

// ---------------------------------------------------------------------------
// Aksi: paparan guru
// ---------------------------------------------------------------------------

function aksiKokuLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = _tahunParam(params);
  var units = _unitTahun(tahun);
  var unitById = {}; units.forEach(function (u) { unitById[u.id] = u; });
  var rumah = _rumahSemua();
  var rumahById = {}; rumah.forEach(function (r) { rumahById[r.id] = r; });

  var keahlian = query('keahlian_unit', { guru_id: guru.id, tahun_akademik: tahun }).map(function (k) {
    var u = unitById[k.unit_id] || {};
    return { id: k.id, unit_id: k.unit_id, unit_nama: u.nama || '?', jenis: u.jenis || null, jawatan: k.jawatan };
  });
  var gr = query('guru_rumah', { guru_id: guru.id, tahun_akademik: tahun })[0] || null;
  var idPertandingan = {};
  query('penyertaan_pertandingan', { guru_id: guru.id }).forEach(function (p) { idPertandingan[p.pertandingan_id] = true; });
  var pertandingan = _pertandinganLengkap(query('pertandingan', { tahun_akademik: tahun }).filter(function (p) { return idPertandingan[p.id]; }));

  return {
    guru: { id: guru.id, nama_penuh: guru.nama_penuh, guru_kod: guru.guru_kod },
    milik_sendiri: guru.id === ctx.guruId,
    tahun: tahun,
    keahlian: keahlian,
    rumah: gr ? { id: gr.id, rumah_sukan_id: gr.rumah_sukan_id, nama: (rumahById[gr.rumah_sukan_id] || {}).nama, warna: (rumahById[gr.rumah_sukan_id] || {}).warna, jawatan: gr.jawatan } : null,
    pertandingan: pertandingan,
    ref: Object.assign({ unit: units, rumah: rumah }, _kokuRef())
  };
}

// ---------------------------------------------------------------------------
// Aksi: pertandingan
// ---------------------------------------------------------------------------

function _dataPertandingan(params, tahun) {
  var row = {
    nama_acara: pStr(params, 'nama_acara', { label: 'Nama acara', min: 2, max: 200 }),
    peringkat: pStr(params, 'peringkat', { label: 'Peringkat', max: 30 }),
    tarikh: pStr(params, 'tarikh', { label: 'Tarikh', max: 10, optional: true }),
    bilangan_murid: params.bilangan_murid === '' ? null : params.bilangan_murid,
    pencapaian: pStr(params, 'pencapaian', { label: 'Pencapaian', max: 1000, optional: true }),
    unit_id: params.unit_id ? pUuid(params, 'unit_id', 'Unit') : null,
    tahun_akademik: tahun
  };
  if (row.tarikh && row.tarikh.slice(0, 4) !== tahun) throw new AppError('VALIDASI', 'Tarikh mesti dalam tahun ' + tahun + '.', { field: 'tarikh' });
  return row;
}

/** Cipta (guru sasaran sebagai peserta) atau kemas kini pertandingan. */
function aksiPertandinganSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = _dataPertandingan(params, tahun);
  var peranan = pStr(params, 'peranan', { label: 'Peranan', max: 30, optional: true });
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Pertandingan');
    if (!getById('pertandingan', id)) throw new AppError('TIDAK_JUMPA', 'Pertandingan tidak dijumpai.');
    if (!_bolehSuntingPertandingan(ctx, id)) throw new AppError('TIADA_KEBENARAN', 'Hanya guru yang terlibat atau pentadbir boleh mengubah pertandingan ini.');
    hasil = update('pertandingan', id, row, { actorId: ctx.akaunId });
    if (peranan) {
      var mine = query('penyertaan_pertandingan', { pertandingan_id: id, guru_id: (params.guru_id && _isAdmin(ctx)) ? params.guru_id : ctx.guruId })[0];
      if (mine) update('penyertaan_pertandingan', mine.id, { peranan: peranan }, { actorId: ctx.akaunId });
    }
  } else {
    var guru = _sasaranGuru(ctx, params.guru_id);
    hasil = insert('pertandingan', row, { actorId: ctx.akaunId });
    try {
      insert('penyertaan_pertandingan', { pertandingan_id: hasil.id, guru_id: guru.id, peranan: peranan || 'lain_lain' }, { actorId: ctx.akaunId });
    } catch (e) { remove('pertandingan', hasil.id); throw e; }
  }
  logAudit(ctx.akaunId, 'PERTANDINGAN_SIMPAN', row.nama_acara, tahun);
  return _pertandinganLengkap([getById('pertandingan', hasil.id)])[0];
}

/** Tambah guru lain ke pertandingan (pentadbir, atau guru menambah diri sendiri). */
function aksiPenyertaanSimpan(ctx, params) {
  var pid = pUuid(params, 'pertandingan_id', 'Pertandingan');
  if (!getById('pertandingan', pid)) throw new AppError('TIDAK_JUMPA', 'Pertandingan tidak dijumpai.');
  var guru = _sasaranGuru(ctx, params.guru_id);
  var peranan = pStr(params, 'peranan', { label: 'Peranan', max: 30 });
  if (!_isAdmin(ctx) && !_bolehSuntingPertandingan(ctx, pid) && guru.id !== ctx.guruId) throw new AppError('TIADA_KEBENARAN', 'Tiada kebenaran.');
  insert('penyertaan_pertandingan', { pertandingan_id: pid, guru_id: guru.id, peranan: peranan }, { actorId: ctx.akaunId });
  return _pertandinganLengkap([getById('pertandingan', pid)])[0];
}

/** Buang penyertaan. Jika tiada peserta lagi, pertandingan itu turut dipadam. */
function aksiPenyertaanPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Penyertaan');
  var p = getById('penyertaan_pertandingan', id);
  if (!p) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
  if (!_isAdmin(ctx) && p.guru_id !== ctx.guruId) throw new AppError('TIADA_KEBENARAN', 'Anda hanya boleh membuang penyertaan anda sendiri.');
  remove('penyertaan_pertandingan', id);
  var baki = query('penyertaan_pertandingan', { pertandingan_id: p.pertandingan_id }).length;
  if (!baki) remove('pertandingan', p.pertandingan_id);
  return { dipadam: true, pertandingan_dipadam: !baki };
}

function aksiPertandinganPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Pertandingan');
  if (!getById('pertandingan', id)) throw new AppError('TIDAK_JUMPA', 'Pertandingan tidak dijumpai.');
  removeWhere('penyertaan_pertandingan', { pertandingan_id: id });
  remove('pertandingan', id);
  logAudit(ctx.akaunId, 'PERTANDINGAN_PADAM', id);
  return { dipadam: true };
}

// ---------------------------------------------------------------------------
// Aksi: urus (pentadbir)
// ---------------------------------------------------------------------------

function aksiKokuUrus(ctx, params) {
  var tahun = _tahunParam(params);
  var units = _unitTahun(tahun);
  var guruNama = {};
  senaraiGuruMengajar().forEach(function (g) { guruNama[g.id] = g.nama_penuh; });
  var ahli = {};
  query('keahlian_unit', { tahun_akademik: tahun }).forEach(function (k) {
    (ahli[k.unit_id] = ahli[k.unit_id] || []).push({ id: k.id, guru_id: k.guru_id, nama: guruNama[k.guru_id] || '?', jawatan: k.jawatan });
  });
  var rumah = _rumahSemua();
  var guruRumah = {};
  query('guru_rumah', { tahun_akademik: tahun }).forEach(function (g) {
    (guruRumah[g.rumah_sukan_id] = guruRumah[g.rumah_sukan_id] || []).push({ id: g.id, guru_id: g.guru_id, nama: guruNama[g.guru_id] || '?', jawatan: g.jawatan });
  });
  var juara = query('juara_rumah_sukan', {}, { orderBy: 'tahun_akademik', desc: true }).map(_pilih(['id', 'tahun_akademik', 'rumah_sukan_id', 'kedudukan', 'catatan']));
  var adaUnit = {};
  query('keahlian_unit', { tahun_akademik: tahun }).forEach(function (k) { adaUnit[k.guru_id] = true; });
  return {
    tahun: tahun,
    unit: units.map(function (u) { u.ahli = ahli[u.id] || []; return u; }),
    rumah: rumah.map(function (r) { r.guru = guruRumah[r.id] || []; return r; }),
    juara: juara,
    kiraan_juara: kiraJuaraRumah(juara),
    pertandingan: _pertandinganLengkap(query('pertandingan', { tahun_akademik: tahun })),
    guru_tanpa_unit: Object.keys(guruNama).filter(function (id) { return !adaUnit[id]; }).length,
    jumlah_guru: Object.keys(guruNama).length,
    tahun_unit_sebelum: query('unit_kokurikulum', { tahun_akademik: String(+tahun - 1) }).length,
    ref: Object.assign({ guru: senaraiGuruMengajar().map(_pilih(['id', 'nama_penuh', 'guru_kod'])) }, _kokuRef())
  };
}

function aksiUnitSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = { nama: pStr(params, 'nama', { label: 'Nama unit', min: 2, max: 120 }), jenis: pStr(params, 'jenis', { label: 'Jenis', max: 30 }) };
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Unit');
    if (!getById('unit_kokurikulum', id)) throw new AppError('TIDAK_JUMPA', 'Unit tidak dijumpai.');
    hasil = update('unit_kokurikulum', id, row, { actorId: ctx.akaunId });
  } else {
    row.tahun_akademik = tahun;
    hasil = insert('unit_kokurikulum', row, { actorId: ctx.akaunId });
  }
  logAudit(ctx.akaunId, 'UNIT_SIMPAN', row.nama, tahun);
  return _pilih(['id', 'nama', 'jenis', 'tahun_akademik'])(hasil);
}

function aksiUnitPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Unit');
  if (!getById('unit_kokurikulum', id)) throw new AppError('TIDAK_JUMPA', 'Unit tidak dijumpai.');
  if (query('keahlian_unit', { unit_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Unit ini masih ada ahli. Buang ahli dahulu.');
  if (query('pertandingan', { unit_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Unit ini dirujuk oleh rekod pertandingan.');
  remove('unit_kokurikulum', id);
  return { dipadam: true };
}

/** Salin senarai unit (tanpa ahli) dari tahun lepas ke tahun ini. Unit yang sudah ada dilangkau. */
function aksiUnitSalin(ctx, params) {
  var tahun = _tahunParam(params);
  var dari = String(+tahun - 1);
  var ada = {};
  query('unit_kokurikulum', { tahun_akademik: tahun }).forEach(function (u) { ada[u.nama.toLowerCase()] = true; });
  var baru = query('unit_kokurikulum', { tahun_akademik: dari }).filter(function (u) { return !ada[u.nama.toLowerCase()]; })
    .map(function (u) { return { nama: u.nama, jenis: u.jenis, tahun_akademik: tahun }; });
  if (baru.length) insertMany('unit_kokurikulum', baru, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'UNIT_SALIN', dari + ' -> ' + tahun, baru.length + ' unit');
  return { disalin: baru.length };
}

function aksiRumahSimpan(ctx, params) {
  var id = pUuid(params, 'id', 'Rumah');
  if (!getById('rumah_sukan', id)) throw new AppError('TIDAK_JUMPA', 'Rumah sukan tidak dijumpai.');
  var warna = pStr(params, 'warna', { label: 'Warna', max: 7, re: /^#[0-9a-fA-F]{6}$/, reMsg: 'Warna mesti kod seperti #d9534f.' });
  var hasil = update('rumah_sukan', id, { nama: pStr(params, 'nama', { label: 'Nama', min: 2, max: 60 }), warna: warna }, { actorId: ctx.akaunId });
  return _pilih(['id', 'nama', 'warna'])(hasil);
}

/** Ganti keputusan juara rumah sukan bagi satu tahun. keputusan: [{ rumah_sukan_id, kedudukan, catatan }] */
function aksiJuaraSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var list = params.keputusan;
  if (!Array.isArray(list) || list.length > 4) throw new AppError('VALIDASI', 'Keputusan tidak sah.');
  var rows = list.filter(function (k) { return k && k.rumah_sukan_id; }).map(function (k) {
    return { tahun_akademik: tahun, rumah_sukan_id: k.rumah_sukan_id, kedudukan: k.kedudukan, catatan: k.catatan || null };
  });
  replaceWhere('juara_rumah_sukan', { tahun_akademik: tahun }, rows, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'JUARA_SIMPAN', tahun, rows.length + ' kedudukan');
  return { disimpan: rows.length };
}

/** Import sejarah juara (CSV). Tahun yang ada dalam fail DIGANTI. */
function aksiJuaraImport(ctx, params) {
  var teks = pStr(params, 'teks', { label: 'Data juara', max: 20000 });
  var r = bacaTeksJuara(teks, _rumahSemua());
  if (r.ralat.length) throw new AppError('VALIDASI', r.ralat.slice(0, 5).join('; ') + (r.ralat.length > 5 ? ' ...' : ''));
  if (!r.baris.length) throw new AppError('VALIDASI', 'Tiada baris data.');
  var tahun = Object.keys(r.baris.reduce(function (a, b) { a[b.tahun_akademik] = 1; return a; }, {}));
  replaceWhere('juara_rumah_sukan', { tahun_akademik: tahun }, r.baris, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'JUARA_IMPORT', tahun.join(','), r.baris.length + ' baris');
  return { tahun: tahun.length, baris: r.baris.length };
}

// ---------------------------------------------------------------------------
// Data awal (dipanggil oleh setupTemplate)
// ---------------------------------------------------------------------------

function _seedKoku() {
  var out = [];
  var adaRumah = {};
  query('rumah_sukan', {}).forEach(function (r) { adaRumah[r.nama.toLowerCase()] = true; });
  var rumahBaru = RUMAH_LALAI.filter(function (r) { return !adaRumah[r[0].toLowerCase()]; }).map(function (r) { return { nama: r[0], warna: r[2] }; });
  if (rumahBaru.length) insertMany('rumah_sukan', rumahBaru, { actorId: 'setup' });
  out.push('Rumah sukan ditambah: ' + rumahBaru.length);
  var tahun = tahunSemasa();
  var adaUnit = {};
  query('unit_kokurikulum', { tahun_akademik: tahun }).forEach(function (u) { adaUnit[u.nama.toLowerCase()] = true; });
  var unitBaru = SYABAB_LALAI.filter(function (n) { return !adaUnit[n.toLowerCase()]; }).map(function (n) { return { nama: n, jenis: 'badan_beruniform', tahun_akademik: tahun }; });
  if (unitBaru.length) insertMany('unit_kokurikulum', unitBaru, { actorId: 'setup' });
  out.push('Unit Syabab ' + tahun + ' ditambah: ' + unitBaru.length);
  return out.join('; ');
}

// ======================================================================
// Hem.gs
// ======================================================================
/**
 * Hem.gs — Hal Ehwal Murid (Fasa 5).
 *
 *  - Usrah Murabbi Pelajar (kumpulan_usrah_pelajar): guru isi kumpulan pelajar yang dibawa.
 *  - Peranan HEM (peranan_hem): Guru Tarbiah, Guru Kelas, Bidang Disiplin. BERASINGAN daripada usrah pelajar
 *    kerana jam kredit dan sifatnya berbeza dalam surat tugasan.
 *  - Usrah Guru: pentadbir tetapkan kumpulan, murabbi dan ahli. MURABBI kumpulan itu sahaja yang
 *    merekod sesi dan kehadiran. Sesi direkod mengikut tarikh ia dijalankan (bukan semestinya mingguan).
 *    Ahli melihat kehadiran sendiri; pentadbir melihat semua.
 */

// ---------------------------------------------------------------------------
// Fungsi tulen
// ---------------------------------------------------------------------------

/**
 * Ringkasan kehadiran seorang guru.
 * sesi: [{ id }], kehadiran: [{ sesi_id, guru_id, hadir }] -> { hadir, jumlah, peratus }
 * Sesi tanpa rekod kehadiran guru itu dikira tidak hadir.
 */
function kiraKehadiran(sesi, kehadiran, guruId) {
  var ada = {};
  kehadiran.forEach(function (k) { if (k.guru_id === guruId && k.hadir) ada[k.sesi_id] = true; });
  var hadir = sesi.filter(function (s) { return ada[s.id]; }).length;
  return { hadir: hadir, jumlah: sesi.length, peratus: sesi.length ? Math.round(hadir / sesi.length * 100) : null };
}

// ---------------------------------------------------------------------------
// Bantuan
// ---------------------------------------------------------------------------

function _guruNamaMap() {
  var o = {};
  query('guru', {}).forEach(function (g) { o[g.id] = g.nama_penuh; });
  return o;
}

/** Data lengkap satu kumpulan usrah guru: ahli, sesi, kehadiran. */
function _usrahLengkap(u, guruNama) {
  var ahli = query('keahlian_usrah_guru', { usrah_guru_id: u.id }).map(function (a) { return { id: a.id, guru_id: a.guru_id, nama: guruNama[a.guru_id] || '?' }; })
    .sort(function (a, b) { return a.nama < b.nama ? -1 : 1; });
  var sesi = query('sesi_usrah_guru', { usrah_guru_id: u.id }, { orderBy: 'tarikh', desc: true }).map(_pilih(['id', 'tarikh', 'tajuk', 'catatan']));
  var idSesi = sesi.map(function (s) { return s.id; });
  var kehadiran = idSesi.length ? query('kehadiran_usrah_guru', { sesi_id: idSesi }).map(_pilih(['id', 'sesi_id', 'guru_id', 'hadir', 'catatan'])) : [];
  ahli.forEach(function (a) { a.kehadiran = kiraKehadiran(sesi, kehadiran, a.guru_id); });
  var hadirSemua = ahli.reduce(function (t, a) { return t + a.kehadiran.hadir; }, 0);
  var bolehSemua = ahli.length * sesi.length;
  return {
    id: u.id, nama_kumpulan: u.nama_kumpulan, hari: u.hari, tahun_akademik: u.tahun_akademik,
    murabbi_guru_id: u.murabbi_guru_id, murabbi: guruNama[u.murabbi_guru_id] || '?',
    ahli: ahli, sesi: sesi, kehadiran: kehadiran,
    peratus_kumpulan: bolehSemua ? Math.round(hadirSemua / bolehSemua * 100) : null
  };
}

function _usrahDanAkses(ctx, usrahId, tulis) {
  var u = getById('usrah_guru', usrahId);
  if (!u) throw new AppError('TIDAK_JUMPA', 'Kumpulan usrah tidak dijumpai.');
  var murabbi = u.murabbi_guru_id === ctx.guruId;
  if (tulis && !murabbi) throw new AppError('TIADA_KEBENARAN', 'Hanya murabbi kumpulan ini boleh merekod sesi dan kehadiran.');
  if (!tulis && !murabbi && !_isAdmin(ctx) && !query('keahlian_usrah_guru', { usrah_guru_id: usrahId, guru_id: ctx.guruId }).length) {
    throw new AppError('TIADA_KEBENARAN', 'Anda bukan ahli kumpulan ini.');
  }
  return u;
}

// ---------------------------------------------------------------------------
// Aksi: paparan guru
// ---------------------------------------------------------------------------

function aksiHemLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = _tahunParam(params);
  var kelas = query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'tingkatan']));
  var kelasNama = {}; kelas.forEach(function (k) { kelasNama[k.id] = k.nama; });
  var guruNama = _guruNamaMap();

  var usrahTahun = query('usrah_guru', { tahun_akademik: tahun });
  var keahlian = query('keahlian_usrah_guru', { guru_id: guru.id });
  var ahliDalam = usrahTahun.filter(function (u) { return keahlian.some(function (k) { return k.usrah_guru_id === u.id; }); })[0] || null;
  var kumpulanSaya = null;
  if (ahliDalam) {
    var L = _usrahLengkap(ahliDalam, guruNama);
    var mine = L.ahli.filter(function (a) { return a.guru_id === guru.id; })[0];
    var hadirSesi = {};
    L.kehadiran.forEach(function (k) { if (k.guru_id === guru.id) hadirSesi[k.sesi_id] = k; });
    kumpulanSaya = {
      id: L.id, nama_kumpulan: L.nama_kumpulan, hari: L.hari, murabbi: L.murabbi,
      bilangan_ahli: L.ahli.length, kehadiran: mine ? mine.kehadiran : null,
      sesi: L.sesi.map(function (s) { var k = hadirSesi[s.id]; return { tarikh: s.tarikh, tajuk: s.tajuk, hadir: k ? k.hadir : false, catatan: k ? k.catatan : null }; })
    };
  }
  var dibimbing = usrahTahun.filter(function (u) { return u.murabbi_guru_id === guru.id; }).map(function (u) {
    var L = _usrahLengkap(u, guruNama);
    return { id: L.id, nama_kumpulan: L.nama_kumpulan, hari: L.hari, bilangan_ahli: L.ahli.length, bilangan_sesi: L.sesi.length,
      sesi_terakhir: L.sesi[0] ? L.sesi[0].tarikh : null, peratus_kumpulan: L.peratus_kumpulan };
  });

  return {
    guru: { id: guru.id, nama_penuh: guru.nama_penuh, guru_kod: guru.guru_kod },
    milik_sendiri: guru.id === ctx.guruId,
    tahun: tahun,
    usrah_pelajar: query('kumpulan_usrah_pelajar', { guru_id: guru.id, tahun_akademik: tahun }, { orderBy: 'nama_kumpulan' })
      .map(_pilih(['id', 'nama_kumpulan', 'tingkatan', 'hari', 'bilangan_murid'])),
    peranan: query('peranan_hem', { guru_id: guru.id, tahun_akademik: tahun }).map(function (p) {
      var o = _pilih(['id', 'jenis', 'kelas_id', 'butiran'])(p);
      o.kelas_nama = p.kelas_id ? kelasNama[p.kelas_id] || '?' : null;
      return o;
    }),
    usrah_guru: kumpulanSaya,
    usrah_dibimbing: dibimbing,
    ref: { kelas: kelas, hari: _refSenarai('ref_hari'), jenis_peranan: _refSenarai('ref_jenis_peranan_hem') }
  };
}

// ---------------------------------------------------------------------------
// Aksi: sesi dan kehadiran (murabbi)
// ---------------------------------------------------------------------------

function aksiUsrahSesiLihat(ctx, params) {
  var u = _usrahDanAkses(ctx, pUuid(params, 'usrah_guru_id', 'Kumpulan'), false);
  var L = _usrahLengkap(u, _guruNamaMap());
  L.boleh_rekod = u.murabbi_guru_id === ctx.guruId;
  if (!L.boleh_rekod && !_isAdmin(ctx)) {
    // Ahli biasa: hanya kehadiran sendiri
    L.kehadiran = L.kehadiran.filter(function (k) { return k.guru_id === ctx.guruId; });
    L.ahli = L.ahli.filter(function (a) { return a.guru_id === ctx.guruId; });
  }
  return L;
}

/**
 * Simpan satu sesi dan kehadirannya (murabbi sahaja).
 * params: { usrah_guru_id, id?, tarikh, tajuk?, catatan?, kehadiran: [{ guru_id, hadir, catatan? }] }
 */
function aksiUsrahSesiSimpan(ctx, params) {
  var u = _usrahDanAkses(ctx, pUuid(params, 'usrah_guru_id', 'Kumpulan'), true);
  var tarikh = pStr(params, 'tarikh', { label: 'Tarikh', max: 10 });
  if (!isIsoDate(tarikh)) throw new AppError('VALIDASI', 'Tarikh tidak sah.', { field: 'tarikh' });
  if (tarikh > hariIni()) throw new AppError('VALIDASI', 'Tarikh sesi tidak boleh pada masa depan.', { field: 'tarikh' });
  if (tarikh.slice(0, 4) !== u.tahun_akademik) throw new AppError('VALIDASI', 'Tarikh mesti dalam tahun ' + u.tahun_akademik + '.', { field: 'tarikh' });
  var row = { tarikh: tarikh, tajuk: pStr(params, 'tajuk', { label: 'Tajuk', max: 200, optional: true }), catatan: pStr(params, 'catatan', { label: 'Catatan', max: 1000, optional: true }) };

  var ahli = {};
  query('keahlian_usrah_guru', { usrah_guru_id: u.id }).forEach(function (a) { ahli[a.guru_id] = true; });
  var list = params.kehadiran;
  if (!Array.isArray(list)) throw new AppError('VALIDASI', 'Senarai kehadiran tidak sah.');
  var dilihat = {};
  list.forEach(function (k) {
    if (!k || !ahli[k.guru_id]) throw new AppError('VALIDASI', 'Kehadiran hanya untuk ahli kumpulan ini.');
    if (dilihat[k.guru_id]) throw new AppError('VALIDASI', 'Ahli berulang dalam senarai kehadiran.');
    if (k.hadir !== true && k.hadir !== false) throw new AppError('VALIDASI', 'Status hadir mesti ya atau tidak.');
    dilihat[k.guru_id] = true;
  });

  var sesi;
  if (params.id) {
    var id = pUuid(params, 'id', 'Sesi');
    var lama = getById('sesi_usrah_guru', id);
    if (!lama || lama.usrah_guru_id !== u.id) throw new AppError('TIDAK_JUMPA', 'Sesi tidak dijumpai.');
    try { sesi = update('sesi_usrah_guru', id, row, { actorId: ctx.akaunId }); }
    catch (e) {
      if (e && e.code === 'DUPLIKAT') throw new AppError('DUPLIKAT', 'Sudah ada sesi lain pada tarikh ' + tarikh.split('-').reverse().join('/') + '.', { field: 'tarikh' });
      throw e;
    }
  } else {
    row.usrah_guru_id = u.id;
    try { sesi = insert('sesi_usrah_guru', row, { actorId: ctx.akaunId }); }
    catch (e) {
      if (e && e.code === 'DUPLIKAT') throw new AppError('DUPLIKAT', 'Sesi pada ' + tarikh.split('-').reverse().join('/') + ' sudah direkod. Tekan tarikh itu dalam jadual kehadiran untuk menyuntingnya.', { field: 'tarikh' });
      throw e;
    }
  }
  var baris = list.map(function (k) { return { sesi_id: sesi.id, guru_id: k.guru_id, hadir: k.hadir, catatan: k.catatan ? String(k.catatan).slice(0, 200) : null }; });
  replaceWhere('kehadiran_usrah_guru', { sesi_id: sesi.id }, baris, { actorId: ctx.akaunId, skipFk: true });
  logAudit(ctx.akaunId, 'USRAH_SESI_SIMPAN', u.nama_kumpulan, tarikh + ': ' + baris.filter(function (b) { return b.hadir; }).length + '/' + baris.length + ' hadir');
  return { id: sesi.id, hadir: baris.filter(function (b) { return b.hadir; }).length, jumlah: baris.length };
}

function aksiUsrahSesiPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Sesi');
  var s = getById('sesi_usrah_guru', id);
  if (!s) throw new AppError('TIDAK_JUMPA', 'Sesi tidak dijumpai.');
  _usrahDanAkses(ctx, s.usrah_guru_id, true);
  removeWhere('kehadiran_usrah_guru', { sesi_id: id });
  remove('sesi_usrah_guru', id);
  return { dipadam: true };
}

// ---------------------------------------------------------------------------
// Aksi: urus (pentadbir)
// ---------------------------------------------------------------------------

function aksiHemUrus(ctx, params) {
  var tahun = _tahunParam(params);
  var guruNama = _guruNamaMap();
  var guruAktif = senaraiGuruMengajar().map(_pilih(['id', 'nama_penuh', 'guru_kod']));
  var usrah = query('usrah_guru', { tahun_akademik: tahun }, { orderBy: 'nama_kumpulan' }).map(function (u) {
    var L = _usrahLengkap(u, guruNama);
    delete L.kehadiran;
    L.sesi_terakhir = L.sesi[0] ? L.sesi[0].tarikh : null;
    L.bilangan_sesi = L.sesi.length;
    delete L.sesi;
    return L;
  });
  var berkumpulan = {};
  usrah.forEach(function (u) { berkumpulan[u.murabbi_guru_id] = true; u.ahli.forEach(function (a) { berkumpulan[a.guru_id] = true; }); });
  var kelas = query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' });
  var kelasNama = {}; kelas.forEach(function (k) { kelasNama[k.id] = k.nama; });
  var peranan = query('peranan_hem', { tahun_akademik: tahun }).map(function (p) {
    return { id: p.id, guru_id: p.guru_id, nama: guruNama[p.guru_id] || '?', jenis: p.jenis, kelas_id: p.kelas_id, kelas_nama: p.kelas_id ? kelasNama[p.kelas_id] : null, butiran: p.butiran };
  });
  var adaGuruKelas = {};
  peranan.forEach(function (p) { if (p.jenis === 'guru_kelas' && p.kelas_id) adaGuruKelas[p.kelas_id] = true; });
  var pelajar = query('kumpulan_usrah_pelajar', { tahun_akademik: tahun });
  return {
    tahun: tahun,
    usrah_guru: usrah,
    guru_tanpa_usrah: guruAktif.filter(function (g) { return !berkumpulan[g.id]; }),
    peranan: peranan,
    kelas_tanpa_guru_kelas: kelas.filter(function (k) { return !adaGuruKelas[k.id]; }).map(function (k) { return k.nama; }),
    usrah_pelajar: { kumpulan: pelajar.length, murid: pelajar.reduce(function (a, p) { return a + (p.bilangan_murid || 0); }, 0),
      guru: Object.keys(pelajar.reduce(function (a, p) { a[p.guru_id] = 1; return a; }, {})).length },
    ref: { guru: guruAktif, hari: _refSenarai('ref_hari'), jenis_peranan: _refSenarai('ref_jenis_peranan_hem') }
  };
}

function aksiUsrahGuruSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = {
    nama_kumpulan: pStr(params, 'nama_kumpulan', { label: 'Nama kumpulan', min: 2, max: 100 }),
    murabbi_guru_id: pUuid(params, 'murabbi_guru_id', 'Murabbi'),
    hari: pStr(params, 'hari', { label: 'Hari', max: 20, optional: true })
  };
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Kumpulan');
    if (!getById('usrah_guru', id)) throw new AppError('TIDAK_JUMPA', 'Kumpulan tidak dijumpai.');
    if (query('keahlian_usrah_guru', { usrah_guru_id: id, guru_id: row.murabbi_guru_id }).length) throw new AppError('VALIDASI', 'Murabbi tidak boleh juga menjadi ahli kumpulan yang sama.');
    hasil = update('usrah_guru', id, row, { actorId: ctx.akaunId });
  } else {
    row.tahun_akademik = tahun;
    hasil = insert('usrah_guru', row, { actorId: ctx.akaunId });
  }
  logAudit(ctx.akaunId, 'USRAH_GURU_SIMPAN', row.nama_kumpulan, tahun);
  return _pilih(['id', 'nama_kumpulan', 'murabbi_guru_id', 'hari', 'tahun_akademik'])(hasil);
}

/** Tetapkan ahli kumpulan (ganti senarai). Seorang guru hanya boleh dalam satu kumpulan bagi setiap tahun. */
function aksiUsrahAhliSimpan(ctx, params) {
  var id = pUuid(params, 'usrah_guru_id', 'Kumpulan');
  var u = getById('usrah_guru', id);
  if (!u) throw new AppError('TIDAK_JUMPA', 'Kumpulan tidak dijumpai.');
  var ids = params.guru_ids;
  if (!Array.isArray(ids) || ids.length > 60) throw new AppError('VALIDASI', 'Senarai ahli tidak sah.');
  var lain = {};
  query('usrah_guru', { tahun_akademik: u.tahun_akademik }).forEach(function (x) {
    if (x.id === id) return;
    query('keahlian_usrah_guru', { usrah_guru_id: x.id }).forEach(function (k) { lain[k.guru_id] = x.nama_kumpulan; });
  });
  var guruNama = _guruNamaMap();
  var seen = {};
  ids.forEach(function (g) {
    if (typeof g !== 'string' || !guruNama[g]) throw new AppError('VALIDASI', 'Guru tidak dijumpai.');
    if (g === u.murabbi_guru_id) throw new AppError('VALIDASI', 'Murabbi tidak perlu disenaraikan sebagai ahli.');
    if (lain[g]) throw new AppError('VALIDASI', guruNama[g] + ' sudah dalam kumpulan ' + lain[g] + '.');
    if (seen[g]) throw new AppError('VALIDASI', 'Ahli berulang.');
    seen[g] = true;
  });
  replaceWhere('keahlian_usrah_guru', { usrah_guru_id: id }, ids.map(function (g) { return { usrah_guru_id: id, guru_id: g }; }), { actorId: ctx.akaunId, skipFk: true });
  logAudit(ctx.akaunId, 'USRAH_AHLI_SIMPAN', u.nama_kumpulan, ids.length + ' ahli');
  return { ahli: ids.length };
}

function aksiUsrahGuruPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Kumpulan');
  if (!getById('usrah_guru', id)) throw new AppError('TIDAK_JUMPA', 'Kumpulan tidak dijumpai.');
  if (query('sesi_usrah_guru', { usrah_guru_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Kumpulan ini sudah ada rekod sesi. Tidak boleh dipadam supaya sejarah kehadiran kekal.');
  removeWhere('keahlian_usrah_guru', { usrah_guru_id: id });
  remove('usrah_guru', id);
  return { dipadam: true };
}

// ======================================================================
// Dashboard.gs
// ======================================================================
/**
 * Dashboard.gs — paparan seluruh sekolah untuk pentadbir dan superadmin (Fasa 6).
 *
 * Satu panggilan memulangkan satu baris ringkasan bagi setiap guru untuk tahun dipilih.
 * Penapisan (jabatan, status, subjek, tingkatan, unit, nama) dibuat di pelayar kerana data
 * ini memang dibenarkan untuk pentadbir; tiada nombor telefon, hash atau data peribadi lain dihantar.
 */

function aksiDashboard(ctx, params) {
  var tahun = _tahunParam(params);
  var hari = hariIni();
  var had = hadJamKredit(tahun);

  var kelas = query('kelas', { tahun_akademik: tahun });
  var kelasById = {}; kelas.forEach(function (k) { kelasById[k.id] = k; });
  var subjek = _subjekSenarai();
  var units = _unitTahun(tahun);

  var by = function (rows, key) { var o = {}; rows.forEach(function (r) { (o[r[key]] = o[r[key]] || []).push(r); }); return o; };
  var tugasan = by(query('tugasan_guru', { tahun_akademik: tahun }), 'guru_id');
  var slots = _slotTahun(tahun, true);
  var slotGuru = by(slots, 'guru_id');
  var cerapan = {}; query('cerapan', { tahun_akademik: tahun }).forEach(function (c) { cerapan[c.guru_id] = c; });
  var unitGuru = by(query('keahlian_unit', { tahun_akademik: tahun }), 'guru_id');
  var semuaPeranan = query('peranan_hem', { tahun_akademik: tahun });
  var peranan = by(semuaPeranan, 'guru_id');
  var adaGuruKelas = {};
  semuaPeranan.forEach(function (p) { if (p.jenis === 'guru_kelas' && p.kelas_id) adaGuruKelas[p.kelas_id] = true; });
  var pelajar = by(query('kumpulan_usrah_pelajar', { tahun_akademik: tahun }), 'guru_id');
  var rumah = {}; query('guru_rumah', { tahun_akademik: tahun }).forEach(function (r) { rumah[r.guru_id] = r.rumah_sukan_id; });

  // Usrah guru: kumpulan dan peratus kehadiran setiap ahli
  // (setiap jadual dibaca SEKALI sahaja, kemudian dikumpulkan dalam memori)
  var usrah = query('usrah_guru', { tahun_akademik: tahun });
  var idUsrah = usrah.map(function (u) { return u.id; });
  var sesiByUsrah = idUsrah.length ? by(query('sesi_usrah_guru', { usrah_guru_id: idUsrah }), 'usrah_guru_id') : {};
  var semuaSesiId = [];
  Object.keys(sesiByUsrah).forEach(function (k) { sesiByUsrah[k].forEach(function (s) { semuaSesiId.push(s.id); }); });
  var semuaKh = semuaSesiId.length ? query('kehadiran_usrah_guru', { sesi_id: semuaSesiId }) : [];
  var ahliByUsrah = idUsrah.length ? by(query('keahlian_usrah_guru', { usrah_guru_id: idUsrah }), 'usrah_guru_id') : {};
  var usrahGuru = {};
  usrah.forEach(function (u) {
    var sesi = sesiByUsrah[u.id] || [];
    (ahliByUsrah[u.id] || []).forEach(function (a) {
      usrahGuru[a.guru_id] = { kumpulan: u.nama_kumpulan, peratus: kiraKehadiran(sesi, semuaKh, a.guru_id).peratus };
    });
    if (!usrahGuru[u.murabbi_guru_id]) usrahGuru[u.murabbi_guru_id] = { kumpulan: u.nama_kumpulan, murabbi: true, peratus: null };
  });

  var guru = senaraiGuruMengajar().map(function (g) {
    var t = tugasan[g.id] || [];
    var jam = kiraJamKredit(t);
    var subj = {}, ting = {}, jab = {};
    t.forEach(function (x) { if (x.subjek_id) subj[x.subjek_id] = 1; if (x.jabatan) jab[x.jabatan] = 1; });
    (slotGuru[g.id] || []).forEach(function (s) {
      if (s.subjek_id) subj[s.subjek_id] = 1;
      s.kelas_ids.forEach(function (k) { if (kelasById[k]) ting[kelasById[k].tingkatan] = 1; });
    });
    var c = cerapan[g.id];
    return {
      id: g.id, guru_kod: g.guru_kod, nama_penuh: g.nama_penuh, jawatan: g.jawatan, status_lantikan: g.status_lantikan,
      percubaan: statusPercubaan(g, hari), praktikal: statusPraktikal(g, hari),
      jam_berjadual: jam.berjadual, jam_tidak_berjadual: jam.tidak_berjadual,
      status_berjadual: statusBeban(jam.berjadual, had.had_berjadual),
      status_tidak_berjadual: statusBeban(jam.tidak_berjadual, had.had_tidak_berjadual),
      status_beban: statusBebanKeseluruhan(jam, had),
      bilangan_tugasan: t.length, bilangan_slot: (slotGuru[g.id] || []).length,
      jabatan: Object.keys(jab), subjek_ids: Object.keys(subj), tingkatan: Object.keys(ting).map(Number).sort(),
      cerapan: c ? c.bilangan_dicerap : 0, pencerap: c ? c.pencerap : null,
      unit: (unitGuru[g.id] || []).map(function (k) { return { unit_id: k.unit_id, jawatan: k.jawatan }; }),
      rumah_sukan_id: rumah[g.id] || null,
      peranan_hem: (peranan[g.id] || []).map(function (p) { return p.jenis; }),
      murid_usrah: (pelajar[g.id] || []).reduce(function (a, p) { return a + (p.bilangan_murid || 0); }, 0),
      usrah_guru: usrahGuru[g.id] || null
    };
  });

  return {
    tahun: tahun, had: had, dijana: nowIso(),
    guru: guru,
    ref: {
      subjek: subjek, unit: units, rumah: _rumahSemua(),
      tingkatan: Object.keys(kelas.reduce(function (a, k) { a[k.tingkatan] = 1; return a; }, {})).map(Number).sort(),
      jabatan: _refSenarai('ref_jabatan'), status_lantikan: _refSenarai('ref_status_lantikan'),
      jenis_unit: _refSenarai('ref_jenis_unit'), jawatan_unit: _refSenarai('ref_jawatan_unit'), jenis_peranan: _refSenarai('ref_jenis_peranan_hem')
    },
    kelas_tanpa_guru_kelas: kelas.filter(function (k) { return !adaGuruKelas[k.id]; }).length
  };
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
