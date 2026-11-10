/*
 * config.js — tetapan frontend.
 *
 * API_URL ialah alamat Web App Apps Script (berakhir dengan /exec). Alamat ini BUKAN rahsia:
 * semua orang yang melihat kod ini boleh nampak, dan itu tidak mengapa kerana setiap aksi
 * (kecuali LOGIN) memerlukan token yang sah. Jangan letak API key, kata laluan atau ID Sheet di sini.
 */
window.APP_CONFIG = {
  API_URL: '',            // contoh: 'https://script.google.com/macros/s/AKfycb.../exec'
  ECUTI_URL: 'https://ecutismiaag.netlify.app/', // e-Cuti dibuka dalam tab baru dengan log masuk sekali (SSO)
  SESSION_KEY: 'smiaag_session',
  REQUEST_TIMEOUT_MS: 25000
};
