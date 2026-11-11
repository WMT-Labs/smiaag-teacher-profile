/*
 * api.js — satu-satunya tempat frontend bercakap dengan Apps Script.
 *
 * Nota teknikal ringkas: Apps Script tidak menyokong permintaan "preflight" CORS, jadi kita hantar
 * JSON sebagai `text/plain`. Pelayan tetap membacanya sebagai JSON. Ini corak biasa untuk Apps Script.
 *
 * Token disimpan dalam localStorage supaya guru kekal log masuk pada peranti sendiri walaupun tab ditutup.
 * Server tetap menyemak dan boleh membatalkan token pada bila-bila masa (log keluar, reset, nyahaktif).
 *
 * Cache pelayar (Api.segar): halaman SENDIRI (profil, kurikulum, koku, HEM, relief) dipaparkan serta-merta daripada
 * data terakhir, kemudian dikemas kini bila jawapan server tiba. Peraturan:
 *   - hanya aksi dalam CACHE_BOLEH dan hanya tanpa `guru_id` (data guru LAIN tidak pernah disimpan dalam pelayar);
 *   - kunci cache mengandungi id akaun, jadi pengguna lain pada pelayar yang sama tidak melihatnya;
 *   - dibuang semasa log keluar / sesi tamat, selepas sebarang aksi yang menulis, dan selepas CACHE_HARI hari;
 *   - server tetap sumber kebenaran: data cache hanya paparan sementara.
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
    buangCache();
    try { localStorage.removeItem(cfg.SESSION_KEY); } catch (e) { /* abaikan */ }
  }

  // ---------------------------------------------------------------------------
  // Cache pelayar untuk halaman sendiri (lihat nota di atas)
  // ---------------------------------------------------------------------------
  var CACHE_AWALAN = 'smiaag_cache:';
  var CACHE_BOLEH = ['PROFIL_LIHAT', 'KURIKULUM_LIHAT', 'KOKU_LIHAT', 'HEM_LIHAT', 'GANTI_SAYA'];
  var CACHE_HARI = 7;
  // Aksi yang hanya MEMBACA: tidak membuang cache. Semua aksi lain dianggap menulis.
  var BACA_SAHAJA = /(_LIHAT|_SENARAI|_SAYA|_HARI|_CALON|_TIKET|_EKSPORT|_SENARAI_TAMAT)$|^(DASHBOARD|LOGIN|LOGOUT)$/;
  function aksiBaca(action) { return BACA_SAHAJA.test(action); }

  function kunciCache(action, params) {
    var s = getSession();
    var akaun = s && s.sesi && s.sesi.akaun_id;
    if (!akaun || CACHE_BOLEH.indexOf(action) === -1) return null;
    params = params || {};
    if (params.guru_id) return null;                    // data guru lain: tidak pernah dicache
    var p = {};
    Object.keys(params).sort().forEach(function (k) { if (params[k] !== undefined && params[k] !== null && params[k] !== '') p[k] = params[k]; });
    return CACHE_AWALAN + akaun + ':' + action + ':' + JSON.stringify(p);
  }
  function bacaCache(k) {
    try {
      var o = JSON.parse(localStorage.getItem(k) || 'null');
      if (!o || !(Date.now() - o.t < CACHE_HARI * 86400000)) return null;
      return o;
    } catch (e) { return null; }
  }
  function simpanCache(k, json) {
    try { localStorage.setItem(k, '{"t":' + Date.now() + ',"d":' + json + '}'); } catch (e) { /* storan penuh: abaikan */ }
  }
  function buangCache() {
    try {
      var buang = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(CACHE_AWALAN) === 0) buang.push(k); }
      buang.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* abaikan */ }
  }

  /**
   * Muat data untuk dipaparkan: onData(data, dariCache) dipanggil serta-merta dengan data terakhir (jika ada), dan
   * sekali lagi dengan data server jika berbeza. Pulangkan Promise data server.
   * Jika server gagal tetapi data terakhir sudah dipaparkan, paparan kekal dan satu makluman ringkas dipaparkan.
   */
  function segar(action, params, onData) {
    var k = kunciCache(action, params);
    var lama = k ? bacaCache(k) : null;
    var jsonLama = lama ? JSON.stringify(lama.d) : null;
    if (lama) { try { onData(lama.d, true); } catch (e) { lama = null; jsonLama = null; } }
    return call(action, params).then(function (data) {
      var json = JSON.stringify(data);
      if (k) simpanCache(k, json);
      if (json !== jsonLama) onData(data, false);
      return data;
    }, function (err) {
      if (!lama || err.code === 'TIDAK_LOG_MASUK' || err.code === 'TIADA_KEBENARAN' || err.code === 'PERLU_TINDAKAN') throw err;
      if (window.UI && UI.toast) UI.toast('Tidak dapat mengemas kini: ' + err.message + ' Memaparkan data terakhir.');
      return lama.d;
    });
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
      if (body && body.ok) { if (!aksiBaca(action)) buangCache(); return body.data; }
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

  window.Api = { call: call, segar: segar, getSession: getSession, setSession: setSession, clearSession: clearSession, _aksiBaca: aksiBaca };
})();
