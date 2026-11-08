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

  // ---------------------------------------------------------------------------
  // Penunjuk loading: bar nipis di atas skrin + label "Sedang memuatkan…" jika menunggu lama.
  // Dikawal oleh bilangan permintaan aktif, jadi beberapa panggilan serentak berkongsi satu bar.
  // ---------------------------------------------------------------------------
  var muat = { aktif: 0, nilai: 0, timer: null, labelTimer: null, bar: null, label: null };

  function binaPenunjuk() {
    if (muat.bar || !document.body) return;
    muat.bar = document.createElement('div');
    muat.bar.className = 'muat-bar';
    muat.bar.setAttribute('role', 'progressbar');
    muat.bar.setAttribute('aria-label', 'Memuatkan');
    muat.bar.appendChild(document.createElement('i'));
    muat.label = document.createElement('div');
    muat.label.className = 'muat-label';
    muat.label.setAttribute('role', 'status');
    var sp = document.createElement('span'); sp.className = 'muat-putar'; sp.setAttribute('aria-hidden', 'true');
    muat.label.appendChild(sp);
    muat.label.appendChild(document.createTextNode('Sedang memuatkan…'));
    document.body.appendChild(muat.bar);
    document.body.appendChild(muat.label);
  }
  function setNilai(v) { muat.nilai = v; if (muat.bar) muat.bar.firstChild.style.width = v + '%'; }
  function mulaMuat() {
    binaPenunjuk();
    muat.aktif++;
    if (muat.aktif > 1 || !muat.bar) return;
    clearTimeout(muat.labelTimer); clearInterval(muat.timer);
    muat.bar.classList.add('on'); muat.bar.classList.remove('done');
    document.body.setAttribute('aria-busy', 'true');
    setNilai(8);
    // Bergerak perlahan menghampiri 90% (tidak pernah penuh sebelum data tiba)
    muat.timer = setInterval(function () { setNilai(muat.nilai + (90 - muat.nilai) * 0.08); }, 200);
    muat.labelTimer = setTimeout(function () { if (muat.aktif) muat.label.classList.add('on'); }, 800);
  }
  function tamatMuat() {
    muat.aktif = Math.max(0, muat.aktif - 1);
    if (muat.aktif || !muat.bar) return;
    clearInterval(muat.timer); clearTimeout(muat.labelTimer);
    setNilai(100);
    muat.bar.classList.add('done');
    muat.label.classList.remove('on');
    document.body.removeAttribute('aria-busy');
    setTimeout(function () { if (!muat.aktif) { muat.bar.classList.remove('on', 'done'); setNilai(0); } }, 350);
  }

  /** Panggil satu aksi. Berjaya -> pulangkan `data`. Gagal -> lontar Error dengan `.code` dan mesej Bahasa Melayu. */
  function call(action, params) {
    if (!cfg.API_URL) {
      return Promise.reject(makeError('TIADA_SAMBUNGAN', 'Alamat pelayan belum ditetapkan. Minta pentadbir sistem mengisi API_URL dalam js/config.js.'));
    }
    var s = getSession();
    mulaMuat();
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
    }).then(function (v) { clearTimeout(timer); tamatMuat(); return v; }, function (e) { clearTimeout(timer); tamatMuat(); throw e; });
  }

  function makeError(code, message) { var e = new Error(message); e.code = code; return e; }

  window.Api = { call: call, getSession: getSession, setSession: setSession, clearSession: clearSession };
})();
