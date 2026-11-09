/**
 * Pdpa.gs — hak akses dan pemadaman data peribadi guru (PDPA 2010, prinsip Akses dan Penyimpanan).
 *
 *   PDPA_EKSPORT       guru: data sendiri; superadmin: mana-mana guru. Fail JSON (mudah alih).
 *   PDPA_SENARAI_TAMAT superadmin: guru tidak aktif dan tarikh layak dipadam (2 tahun selepas dinyahaktif).
 *   PDPA_PADAM         superadmin: padam KEKAL data peribadi seorang guru yang tidak aktif.
 *
 * Cara padam (supaya data guru LAIN tidak rosak):
 *   - Jadual dalam PDPA_PADAM_JADUAL: baris milik guru dipadam (termasuk kelas bagi slot jadualnya).
 *   - Jadual dalam PDPA_KEKAL_JADUAL: rekod dikongsi dengan guru lain (contoh kumpulan usrah yang dia
 *     murabbi, rekod relief) dikekalkan dan menunjuk kepada rekod guru yang telah DINYAHNAMAKAN.
 *   - Rekod guru: nama "Guru dipadam", ID baharu rawak, telefon/emel/tarikh dikosongkan.
 *   - audit_log dikekalkan sebagai log keselamatan dan dibersihkan sendiri selepas 2 tahun.
 * Ujian memastikan setiap jadual yang merujuk guru dikelaskan dalam salah satu senarai ini.
 */

var PDPA_TAHUN_SIMPAN = 2;
var PDPA_PADAM_JADUAL = ['akaun', 'kelayakan', 'opsyen_guru', 'kursus', 'cerapan', 'tugasan_guru', 'jadual_slot',
  'warna_jadual', 'keahlian_unit', 'guru_rumah', 'penyertaan_pertandingan', 'kumpulan_usrah_pelajar',
  'keahlian_usrah_guru', 'kehadiran_usrah_guru', 'peranan_hem'];
var PDPA_KEKAL_JADUAL = {
  usrah_guru: 'kumpulan usrah dikongsi ahli lain (murabbi dinyahnamakan)',
  ketidakhadiran_guru: 'rekod relief guru lain bergantung padanya (sebab dikosongkan)',
  guru_ganti: 'kiraan relief guru lain (pengganti dinyahnamakan)'
};

/** Tarikh (yyyy-mm-dd) data guru tidak aktif layak dipadam. Guna updated_at jika tarikh nyahaktif tiada (data lama). */
function tarikhLayakPadam(guru) {
  if (!guru || guru.aktif) return null;
  var asal = guru.dinyahaktif_pada || guru.updated_at;
  if (!asal) return null;
  var d = new Date(Date.parse(asal));
  d.setFullYear(d.getFullYear() + PDPA_TAHUN_SIMPAN);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

/** Lajur dalam jadual yang merujuk guru (fk(guru)). */
function _lajurGuru(name) {
  var s = getTableSchema(name);
  return s.columns.filter(function (c) { return s.defs[c].fk === 'guru'; });
}

function _tanpaRahsia(table, row) {
  var o = {};
  Object.keys(row).forEach(function (k) {
    if (table === 'akaun' && (k === 'salt' || k === 'password_hash')) return;
    o[k] = row[k];
  });
  return o;
}

function aksiPdpaEksport(ctx, params) {
  var guruId = params.guru_id === undefined || params.guru_id === null || params.guru_id === '' ? ctx.guruId : pUuid(params, 'guru_id', 'Guru');
  if (guruId !== ctx.guruId && ctx.role !== 'superadmin') {
    throw new AppError('TIADA_KEBENARAN', 'Hanya superadmin boleh mengeksport data guru lain.');
  }
  var guru = getById('guru', guruId);
  if (!guru) throw new AppError('TIDAK_JUMPA', 'Guru tidak dijumpai.');
  var data = {};
  Object.keys(SCHEMA).forEach(function (name) {
    if (name === 'guru' || name === 'audit_log' || name === 'sessions' || /^ref_/.test(name)) return;
    var cols = _lajurGuru(name);
    if (!cols.length) return;
    var rows = query(name, {}).filter(function (r) { return cols.some(function (c) { return r[c] === guruId; }); });
    if (rows.length) data[name] = rows.map(function (r) { return _tanpaRahsia(name, r); });
  });
  if (data.jadual_slot) {
    var slotIds = {};
    data.jadual_slot.forEach(function (s) { slotIds[s.id] = true; });
    var kelas = query('jadual_slot_kelas', {}).filter(function (k) { return slotIds[k.slot_id]; });
    if (kelas.length) data.jadual_slot_kelas = kelas;
  }
  logAudit(ctx.akaunId, 'PDPA_EKSPORT', guru.guru_kod);
  return {
    format: 'smiaag-pdpa-eksport-v1',
    dijana_pada: nowIso(),
    nota: 'Salinan data peribadi yang disimpan oleh Sistem Profil Guru SMIAAG. Kata laluan tidak disertakan.',
    guru: guru,
    data: data
  };
}

function aksiPdpaSenaraiTamat(ctx) {
  var hari = hariIni();
  var akaunByGuru = {};
  query('akaun', {}).forEach(function (a) { akaunByGuru[a.guru_id] = a; });
  return query('guru', { aktif: false }).filter(function (g) { return !_dinyahnama(g); }).map(function (g) {
    var layak = tarikhLayakPadam(g);
    return {
      guru_id: g.id, guru_kod: g.guru_kod, nama_penuh: g.nama_penuh, dinyahaktif_pada: g.dinyahaktif_pada || null,
      tarikh_layak_padam: layak, layak: !!layak && layak <= hari, ada_akaun: !!akaunByGuru[g.id]
    };
  }).sort(function (a, b) { return String(a.tarikh_layak_padam).localeCompare(String(b.tarikh_layak_padam)); });
}

function _dinyahnama(g) { return /^PADAM-/.test(g.guru_kod || ''); }

function aksiPdpaPadam(ctx, params) {
  var guruId = pUuid(params, 'guru_id', 'Guru');
  var guru = getById('guru', guruId);
  if (!guru || _dinyahnama(guru)) throw new AppError('TIDAK_JUMPA', 'Guru tidak dijumpai.');
  if (guruId === ctx.guruId) throw new AppError('TIDAK_DIBENARKAN', 'Anda tidak boleh memadam data sendiri.');
  if (guru.aktif) throw new AppError('TIDAK_DIBENARKAN', 'Nyahaktifkan akaun guru ini dahulu sebelum memadam datanya.');
  var sahkan = pStr(params, 'sahkan_kod', { label: 'ID guru pengesahan', max: 20, upper: true });
  if (sahkan !== guru.guru_kod) throw new AppError('VALIDASI', 'Taip ID guru "' + guru.guru_kod + '" dengan tepat untuk mengesahkan.', { field: 'sahkan_kod' });

  var opt = { actorId: ctx.akaunId };
  var kiraan = {};
  // 1. Sesi dan akaun
  query('akaun', { guru_id: guruId }).forEach(function (a) { removeWhere('sessions', { akaun_id: a.id }); });
  // 2. Slot jadual: kelas slot dipadam; rujukan slot dalam rekod relief dikosongkan
  var slotIds = query('jadual_slot', { guru_id: guruId }).map(function (s) { return s.id; });
  slotIds.forEach(function (sid) {
    removeWhere('jadual_slot_kelas', { slot_id: sid });
    query('guru_ganti', { slot_id: sid }).forEach(function (r) { update('guru_ganti', r.id, { slot_id: null }, opt); });
  });
  // 3. Jadual milik guru
  PDPA_PADAM_JADUAL.forEach(function (name) {
    var n = 0;
    _lajurGuru(name).forEach(function (c) { var f = {}; f[c] = guruId; n += removeWhere(name, f); });
    if (n) kiraan[name] = n;
  });
  // 4. Rekod dikongsi: kosongkan butiran peribadi
  query('ketidakhadiran_guru', { guru_id: guruId }).forEach(function (r) { if (r.sebab) update('ketidakhadiran_guru', r.id, { sebab: null }, opt); });
  // 5. Nyahnamakan rekod guru
  update('guru', guruId, {
    guru_kod: 'PADAM-' + Utilities.getUuid().slice(0, 8).toUpperCase(), nama_penuh: 'Guru dipadam', nama_panggilan: null,
    jawatan: null, tarikh_lantikan: null, tarikh_tamat_praktikal: null, no_telefon: null, email: null, tarikh_disahkan: null,
    aktif: false
  }, opt);
  logAudit(ctx.akaunId, 'PDPA_PADAM', guru.guru_kod, JSON.stringify(kiraan));
  return { dipadam: kiraan };
}

/**
 * Pencetus harian (dipasang oleh setupTemplate): buang sesi tamat dan baris audit_log melebihi 2 tahun.
 * Data guru TIDAK dipadam secara automatik: superadmin menyemak senarai "Tempoh simpanan" dan memadam sendiri.
 */
function penyelenggaraanHarian() {
  mulaPermintaan();
  try {
    bersihkanSesiTamat();
    bersihkanAuditLama();
  } finally { tamatPermintaan(); }
}

function bersihkanAuditLama() {
  var had = new Date();
  had.setFullYear(had.getFullYear() - PDPA_TAHUN_SIMPAN);
  var s = getTableSchema('audit_log');
  var sh = _sheetOf(s);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var col = s.columns.indexOf('masa') + 1;
  var masa = sh.getRange(2, col, last - 1, 1).getValues();
  // Log ditambah mengikut masa, jadi baris lama berada di atas: padam satu blok sahaja.
  var n = 0;
  while (n < masa.length) {
    var v = masa[n][0];
    var t = _isDate(v) ? v.getTime() : Date.parse(v);
    if (!(t < had.getTime())) break;
    n++;
  }
  if (n > 0) _withLock(function () { sh.deleteRows(2, n); });
  return n;
}

/**
 * KECEMASAN (pelan kebocoran data): log keluar SEMUA pengguna serta-merta. Jalankan dari editor Apps Script.
 * Semua token dipadam daripada tab sessions dan cache sesi dibatalkan. Pengguna perlu log masuk semula.
 */
function logKeluarSemua() {
  mulaPermintaan();
  try {
    var s = getTableSchema('sessions');
    var n = _withLock(function () {
      var data = _readAll(s, true);
      if (!data.rows.length) return 0;
      data.sheet.getRange(2, 1, data.sheet.getLastRow() - 1, s.columns.length).clearContent();
      _selepasTulis('sessions', data.rows.map(_clean));
      return data.rows.length;
    });
    logAudit(null, 'LOG_KELUAR_SEMUA', 'sistem', n + ' sesi dibatalkan');
    Logger.log('Log keluar semua: ' + n + ' sesi dibatalkan.');
    return n;
  } finally { tamatPermintaan(); }
}
