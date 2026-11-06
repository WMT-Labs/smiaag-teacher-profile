/**
 * Config.gs — pemalar dan akses kepada Spreadsheet.
 *
 * Tiada rahsia di sini. Semua rahsia (pepper, ID Sheet, API key) disimpan dalam
 * PropertiesService (Project Settings > Script Properties) dan TIDAK masuk repo.
 */

var APP_NAME = 'SMIAAG Teacher Profiling';
var APP_VERSION = '0.3.0-fasa2';
var TZ = 'Asia/Kuala_Lumpur';

/** Nama kunci dalam PropertiesService. */
var PROP = {
  SS_ID: 'SS_ID',     // ID Google Sheet (diisi automatik oleh setupTemplate)
  PEPPER: 'PEPPER',   // rahsia tambahan untuk hash kata laluan (dijana oleh setupTemplate)
  DRIVE_FOLDER_ID: 'DRIVE_FOLDER_ID' // folder Drive peribadi untuk gambar guru (dicipta automatik)
};

/** Had saiz badan permintaan (aksara). Dinaikkan nanti untuk import PDF. */
var MAX_REQUEST_CHARS = 250000; // cukup untuk gambar kecil (thumbnail)

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
