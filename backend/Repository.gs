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
// Operasi pukal (import). Satu bacaan dan satu tulisan, bukan satu bagi setiap baris,
// supaya import ratusan baris tidak melepasi had masa Apps Script.
// ---------------------------------------------------------------------------

function insertMany(table, rows, ctx) {
  var s = getTableSchema(table);
  ctx = ctx || {};
  if (!Array.isArray(rows)) throw new AppError('VALIDASI', 'Data tidak sah.');
  return _withLock(function () {
    var data = _readAll(s);
    var fkSets = {};
    function fkSet(t) {
      if (!fkSets[t]) {
        var ts = getTableSchema(t), set = {};
        _readAll(ts).rows.forEach(function (r) { set[r[ts.pk]] = true; });
        fkSets[t] = set;
      }
      return fkSets[t];
    }
    var semua = data.rows.slice(), out = [], lines = [], now = nowIso();
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
    if (lines.length) data.sheet.getRange(data.sheet.getLastRow() + 1, 1, lines.length, s.columns.length).setValues(lines);
    if (s.isRef) delete _REF_CACHE[s.name];
    return out;
  });
}

/** Padam semua baris yang sepadan dengan penapis. filter mesti ada sekurang-kurangnya satu lajur. */
function removeWhere(table, filter) {
  var s = getTableSchema(table);
  if (!filter || typeof filter !== 'object' || !Object.keys(filter).length) throw new AppError('VALIDASI', 'Penapis diperlukan untuk padam pukal.');
  Object.keys(filter).forEach(function (k) { if (!s.defs[k]) throw new AppError('VALIDASI', 'Penapis menggunakan lajur yang tidak wujud: ' + k); });
  return _withLock(function () {
    var data = _readAll(s);
    var buang = {};
    var n = 0;
    data.rows.forEach(function (row) {
      if (Object.keys(filter).every(function (k) { return _matches(row[k], filter[k]); })) { buang[row.__row] = true; n++; }
    });
    if (!n) return 0;
    var last = data.sheet.getLastRow();
    var range = data.sheet.getRange(2, 1, last - 1, s.columns.length);
    var values = range.getValues();
    var keep = values.filter(function (v, i) { return !buang[i + 2] && v.some(function (x) { return x !== '' && x !== null; }); });
    range.clearContent();
    if (keep.length) data.sheet.getRange(2, 1, keep.length, s.columns.length).setValues(keep);
    if (s.isRef) delete _REF_CACHE[s.name];
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
