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
  report.push(_pasangPencetusCache());

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
/** Pasang pencetus masa (sekali sahaja; selamat diulang): cache setiap jam, penyelenggaraan harian. */
function _pasangPencetus(fungsi, bina) {
  var ada = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === fungsi; });
  if (!ada) bina(ScriptApp.newTrigger(fungsi).timeBased()).create();
  return ada;
}

function _pasangPencetusCache() {
  try {
    var a = _pasangPencetus('panaskanCache', function (b) { return b.everyHours(1); });
    var h = _pasangPencetus('penyelenggaraanHarian', function (b) { return b.everyDays(1).atHour(3); });
    panaskanCache();
    return 'Pencetus: cache setiap jam ' + (a ? 'sudah wujud' : 'dipasang') + '; penyelenggaraan harian (3 pagi) ' +
      (h ? 'sudah wujud' : 'dipasang') + '. Cache diisi.';
  } catch (e) {
    return 'Pencetus GAGAL dipasang (' + e.message + '). Sistem tetap berfungsi, cuma bacaan pertama lebih perlahan.';
  }
}

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
