/*
 * ui.js — pembantu paparan. Semua teks daripada pengguna dimasukkan guna textContent, bukan innerHTML,
 * supaya tiada kod berbahaya boleh disuntik (XSS).
 */
(function () {
  'use strict';

  /** el('div', {class:'x', 'aria-label':'y'}, ['teks', elemenLain]) */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    [].concat(children == null ? [] : children).forEach(function (c) {
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function toast(msg) {
    var t = el('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  /** 2026-11-06 -> 06/11/2026 */
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }

  /** Status jam kredit: <80% had = ok, 80-100% = hampir, >100% = melebihi. */
  function loadStatus(jam, had) {
    if (jam > had) return { key: 'over', label: 'Melebihi had' };
    if (jam >= had * 0.8) return { key: 'near', label: 'Hampir had' };
    return { key: 'ok', label: 'Dalam had' };
  }

  window.UI = { el: el, toast: toast, fmtDate: fmtDate, loadStatus: loadStatus };
})();
