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
