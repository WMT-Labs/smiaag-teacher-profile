/**
 * Ecuti.gs — log masuk sekali (SSO) ke sistem e-Cuti SMIAAG (projek Apps Script berasingan).
 *
 * Aliran:
 *   1. Guru yang sudah log masuk menekan "e-Cuti". Frontend memanggil ECUTI_TIKET.
 *   2. Server ini mengeluarkan tiket bertandatangan HMAC-SHA256 (kunci ECUTI_SSO_SECRET dalam Script
 *      Properties KEDUA-DUA projek), sah 60 saat, dengan nonce sekali guna.
 *   3. Frontend membuka e-Cuti dalam tab baru: https://.../#sso=<tiket> (fragmen # tidak dihantar ke pelayan web).
 *   4. e-Cuti mengesahkan tandatangan, tempoh dan nonce, mencari pengguna AKTIF mengikut emel, dan mencipta sesi
 *      e-Cuti sendiri. PERANAN dalam e-Cuti (ADMIN/GURU/STAF) kekal ditentukan oleh e-Cuti, bukan oleh tiket ini.
 *
 * Format tiket: base64url(JSON payload) + "." + base64url(HMAC-SHA256(bahagian pertama, kunci))
 * Payload: { v:1, iss:'smiaag-profil', aud:'ecuti', emel, nama, kod, iat, exp, n }  (masa dalam saat Unix)
 */

var ECUTI_TIKET_SAAT = 60;

function _b64url(bytesAtauTeks) {
  var s = typeof bytesAtauTeks === 'string'
    ? Utilities.base64EncodeWebSafe(bytesAtauTeks, Utilities.Charset.UTF_8)
    : Utilities.base64EncodeWebSafe(bytesAtauTeks);
  return s.replace(/=+$/, '');
}

/** Bina tiket untuk guru. Dipisahkan daripada aksi supaya mudah diuji. */
function janaTiketEcuti(guru, rahsia, nowMs) {
  var iat = Math.floor((nowMs || Date.now()) / 1000);
  var payload = {
    v: 1, iss: 'smiaag-profil', aud: 'ecuti',
    emel: String(guru.email).toLowerCase(), nama: guru.nama_penuh, kod: guru.guru_kod,
    iat: iat, exp: iat + ECUTI_TIKET_SAAT, n: Utilities.getUuid()
  };
  var p = _b64url(JSON.stringify(payload));
  var sig = _b64url(Utilities.computeHmacSha256Signature(p, rahsia, Utilities.Charset.UTF_8));
  return p + '.' + sig;
}

function aksiEcutiTiket(ctx) {
  var guru = getById('guru', ctx.guruId);
  if (!guru || guru.akaun_sistem) {
    throw new AppError('TIDAK_DIBENARKAN', 'Akaun sistem tiada akses e-Cuti. Log masuk dengan akaun guru anda.');
  }
  if (!guru.email) {
    throw new AppError('TIADA_EMEL', 'Emel anda belum didaftarkan dalam Profil Guru. Kemas kini emel di Profil saya (mesti sama dengan emel e-Cuti) atau hubungi pentadbir.');
  }
  var rahsia = PropertiesService.getScriptProperties().getProperty(PROP.ECUTI_SSO);
  if (!rahsia) throw new AppError('SETUP_BELUM_SIAP', 'Sambungan e-Cuti belum disediakan. Hubungi pentadbir sistem.');
  logAudit(ctx.akaunId, 'ECUTI_SSO', guru.guru_kod);
  return { tiket: janaTiketEcuti(guru, rahsia), tamat_saat: ECUTI_TIKET_SAAT };
}
