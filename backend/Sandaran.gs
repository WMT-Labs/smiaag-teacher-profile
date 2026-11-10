/**
 * Sandaran.gs — sandaran (backup) mingguan pangkalan data ke Spreadsheet berasingan dalam Drive pemilik skrip.
 *
 * - Pencetus mingguan `sandaranMingguan` dipasang oleh setupTemplate (Ahad, 2 pagi). Boleh juga dijalankan manual.
 * - Menyimpan SANDARAN_BILANGAN salinan terakhir secara bergilir: salinan paling lama ditulis semula.
 *   (Hanya skop `spreadsheets` diperlukan; tiada akses Drive, jadi fail lama diguna semula dan bukan dipadam.)
 * - Tab `sessions` TIDAK disalin (token log masuk). Hash kata laluan dalam `akaun` disalin kerana diperlukan untuk
 *   pemulihan; fail sandaran mesti kekal peribadi seperti Sheet utama (JANGAN kongsi).
 * - ID fail sandaran disimpan dalam Script Properties `SANDARAN_IDS` (JSON, terbaru di hadapan).
 * - Pulih: lihat README ("Sandaran dan pemulihan").
 */

var SANDARAN_BILANGAN = 4;
var SANDARAN_PROP = 'SANDARAN_IDS';
var SANDARAN_TANPA = ['sessions'];

function sandaranMingguan() {
  var props = PropertiesService.getScriptProperties();
  var ids = [];
  try { ids = JSON.parse(props.getProperty(SANDARAN_PROP) || '[]'); } catch (e) { ids = []; }
  if (!Array.isArray(ids)) ids = [];

  var sumber = getSpreadsheet();
  var nama = 'SANDARAN Profil Guru SMIAAG ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH.mm');
  var sasaran = null, id = null;
  if (ids.length >= SANDARAN_BILANGAN) {
    id = ids.pop();                                   // paling lama: guna semula
    try { sasaran = SpreadsheetApp.openById(id); sasaran.rename(nama); } catch (e) { sasaran = null; }
  }
  if (!sasaran) { sasaran = SpreadsheetApp.create(nama); id = sasaran.getId(); }

  // Tulis ke tab sementara dahulu, kemudian buang tab lama: sandaran lama tidak rosak jika proses terhenti separuh jalan.
  var lama = sasaran.getSheets();
  var bil = 0, baris = 0;
  TABLE_ORDER.forEach(function (name) {
    if (SANDARAN_TANPA.indexOf(name) !== -1) return;
    var sh = sumber.getSheetByName(name);
    if (!sh) return;
    var r = sh.getLastRow(), c = sh.getLastColumn();
    var t = sasaran.insertSheet('~' + name);
    if (r > 0 && c > 0) {
      // getValues memulangkan teks tanpa awalan ' ; sanitasi semula supaya teks seperti "=..." tidak menjadi formula dalam sandaran.
      var nilai = sh.getRange(1, 1, r, c).getValues().map(function (row) {
        return row.map(function (v) { return typeof v === 'string' ? sanitizeForSheet(v) : v; });
      });
      t.getRange(1, 1, r, c).setValues(nilai);
      baris += r - 1;
    }
    bil++;
  });
  lama.forEach(function (s) { sasaran.deleteSheet(s); });
  sasaran.getSheets().forEach(function (s) { s.setName(s.getName().replace(/^~/, '')); });

  ids.unshift(id);
  props.setProperty(SANDARAN_PROP, JSON.stringify(ids.slice(0, SANDARAN_BILANGAN)));
  logAudit(null, 'SANDARAN', 'sistem', bil + ' tab, ' + baris + ' baris');
  var mesej = 'Sandaran siap: "' + nama + '" (' + bil + ' tab, ' + baris + ' baris). Disimpan ' + Math.min(ids.length, SANDARAN_BILANGAN) + ' salinan terakhir.';
  Logger.log(mesej);
  return mesej;
}

/** Senarai fail sandaran (terbaru dahulu) untuk dilihat dalam log editor Apps Script. */
function senaraiSandaran() {
  var ids = [];
  try { ids = JSON.parse(PropertiesService.getScriptProperties().getProperty(SANDARAN_PROP) || '[]'); } catch (e) { ids = []; }
  var out = ids.map(function (id) {
    try { var s = SpreadsheetApp.openById(id); return s.getName() + ' -> ' + s.getUrl(); } catch (e) { return id + ' (tidak dapat dibuka)'; }
  });
  Logger.log(out.length ? out.join('\n') : 'Belum ada sandaran. Jalankan sandaranMingguan.');
  return out;
}
