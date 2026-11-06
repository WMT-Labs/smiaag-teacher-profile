/*
 * api.js — satu-satunya tempat frontend bercakap dengan Apps Script.
 *
 * Nota teknikal ringkas: Apps Script tidak menyokong permintaan "preflight" CORS, jadi kita hantar
 * JSON sebagai `text/plain`. Pelayan tetap membacanya sebagai JSON. Ini corak biasa untuk Apps Script.
 *
 * Token disimpan dalam localStorage supaya guru kekal log masuk pada peranti sendiri walaupun tab ditutup.
 * Server tetap menyemak dan boleh membatalkan token pada bila-bila masa (log keluar, reset, nyahaktif).
 */
(function () {
  'use strict';
  var cfg = window.APP_CONFIG;

  function getSession() {
    try { return JSON.parse(localStorage.getItem(cfg.SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) {
    try { localStorage.setItem(cfg.SESSION_KEY, JSON.stringify(s)); } catch (e) { /* abaikan */ }
  }
  function clearSession() {
    try { localStorage.removeItem(cfg.SESSION_KEY); } catch (e) { /* abaikan */ }
  }

  /** Panggil satu aksi. Berjaya -> pulangkan `data`. Gagal -> lontar Error dengan `.code` dan mesej Bahasa Melayu. */
  function call(action, params) {
    if (!cfg.API_URL) {
      return Promise.reject(makeError('TIADA_SAMBUNGAN', 'Alamat pelayan belum ditetapkan. Minta pentadbir sistem mengisi API_URL dalam js/config.js.'));
    }
    var s = getSession();
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, cfg.REQUEST_TIMEOUT_MS);
    return fetch(cfg.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: s ? s.token : undefined, params: params || {} }),
      signal: ctrl.signal,
      redirect: 'follow'
    }).then(function (res) {
      return res.json();
    }).then(function (body) {
      if (body && body.ok) return body.data;
      var code = body && body.code ? body.code : 'RALAT_SERVER';
      if (code === 'TIDAK_LOG_MASUK' && action !== 'LOGIN' && action !== 'LOGOUT') {
        clearSession();
        location.replace('index.html?tamat=1');
      }
      throw makeError(code, (body && body.message) || 'Ralat tidak dijangka berlaku.');
    }, function (err) {
      if (err && err.name === 'AbortError') throw makeError('TAMAT_MASA', 'Pelayan lambat menjawab. Semak sambungan internet dan cuba lagi.');
      if (err && err.code) throw err;
      throw makeError('TIADA_SAMBUNGAN', 'Tidak dapat berhubung dengan pelayan. Semak sambungan internet dan cuba lagi.');
    }).then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }

  function makeError(code, message) { var e = new Error(message); e.code = code; return e; }

  window.Api = { call: call, getSession: getSession, setSession: setSession, clearSession: clearSession };
})();
