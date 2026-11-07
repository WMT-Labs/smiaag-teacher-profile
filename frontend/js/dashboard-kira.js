/*
 * dashboard-kira.js — logik dashboard yang tidak menyentuh paparan: penapis, ringkasan, susunan, CSV.
 * Berjalan di pelayar (window.DashKira) dan di Node untuk ujian.
 */
(function (root) {
  'use strict';

  /** f: { jabatan, status, subjek, tingkatan, unit, cari } — kosong = semua */
  function tapis(rows, f) {
    f = f || {};
    var q = String(f.cari || '').trim().toLowerCase();
    return rows.filter(function (g) {
      if (f.jabatan && g.jabatan.indexOf(f.jabatan) === -1) return false;
      if (f.status && g.status_lantikan !== f.status) return false;
      if (f.subjek && g.subjek_ids.indexOf(f.subjek) === -1) return false;
      if (f.tingkatan && g.tingkatan.indexOf(Number(f.tingkatan)) === -1) return false;
      if (f.unit && !g.unit.some(function (u) { return u.unit_id === f.unit; })) return false;
      if (q && (g.nama_penuh + ' ' + g.guru_kod + ' ' + (g.jawatan || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function bundar(n) { return Math.round(n * 10) / 10; }

  function ringkasan(rows) {
    var n = rows.length;
    var jb = rows.reduce(function (a, g) { return a + g.jam_berjadual; }, 0);
    var jt = rows.reduce(function (a, g) { return a + g.jam_tidak_berjadual; }, 0);
    return {
      jumlah: n,
      purata_berjadual: n ? bundar(jb / n) : 0,
      purata_tidak_berjadual: n ? bundar(jt / n) : 0,
      melebihi: rows.filter(function (g) { return g.status_beban === 'lebih'; }).length,
      hampir: rows.filter(function (g) { return g.status_beban === 'hampir'; }).length,
      belum_dicerap: rows.filter(function (g) { return !g.cerapan; }).length,
      tamat_percubaan: rows.filter(function (g) { return g.percubaan && g.percubaan.tamat; }).length,
      tiada_tugasan: rows.filter(function (g) { return !g.bilangan_tugasan; }).length
    };
  }

  var SUSUN = {
    nama: function (g) { return g.nama_penuh.toLowerCase(); },
    berjadual: function (g) { return g.jam_berjadual; },
    tidak_berjadual: function (g) { return g.jam_tidak_berjadual; },
    cerapan: function (g) { return g.cerapan; },
    status: function (g) { return { lebih: 0, hampir: 1, dalam: 2 }[g.status_beban]; }
  };
  /** Susun salinan baris. Seri dipecahkan mengikut nama. */
  function susun(rows, kunci, menurun) {
    var fn = SUSUN[kunci] || SUSUN.nama;
    return rows.slice().sort(function (a, b) {
      var x = fn(a), y = fn(b);
      if (x < y) return menurun ? 1 : -1;
      if (x > y) return menurun ? -1 : 1;
      return a.nama_penuh < b.nama_penuh ? -1 : 1;
    });
  }

  /** Ringkasan unit: bilangan guru dan pecahan jawatan bagi setiap unit (ikut baris yang ditapis). */
  function ringkasanUnit(rows, units) {
    var o = {};
    units.forEach(function (u) { o[u.id] = { id: u.id, nama: u.nama, jenis: u.jenis, jumlah: 0, jawatan: {} }; });
    rows.forEach(function (g) {
      g.unit.forEach(function (k) {
        var x = o[k.unit_id]; if (!x) return;
        x.jumlah++; x.jawatan[k.jawatan] = (x.jawatan[k.jawatan] || 0) + 1;
      });
    });
    return Object.keys(o).map(function (k) { return o[k]; });
  }

  /** Lindungi daripada formula injection dalam Excel/Sheets dan petik nilai CSV. */
  function sel(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /** Baris guru -> teks CSV (dengan BOM supaya Excel membaca huruf dengan betul). */
  function keCsv(rows, ref, had) {
    var label = function (list, kod) { for (var i = 0; i < (list || []).length; i++) if (list[i].kod === kod) return list[i].label; return kod || ''; };
    var subjekNama = {}; (ref.subjek || []).forEach(function (s) { subjekNama[s.id] = s.kod || s.nama; });
    var unitNama = {}; (ref.unit || []).forEach(function (u) { unitNama[u.id] = u.nama; });
    var STATUS = { dalam: 'Dalam had', hampir: 'Hampir had', lebih: 'Melebihi had' };
    var head = ['ID guru', 'Nama', 'Jawatan', 'Status lantikan', 'Jam berjadual', 'Had berjadual', 'Jam tidak berjadual', 'Had tidak berjadual', 'Status beban',
      'Jabatan', 'Subjek', 'Tingkatan', 'Cerapan', 'Pencerap', 'Unit kokurikulum', 'Usrah guru', 'Kehadiran usrah (%)', 'Peranan HEM', 'Murid usrah'];
    var lines = [head.map(sel).join(',')];
    rows.forEach(function (g) {
      lines.push([
        g.guru_kod, g.nama_penuh, g.jawatan, label(ref.status_lantikan, g.status_lantikan),
        g.jam_berjadual, had.had_berjadual, g.jam_tidak_berjadual, had.had_tidak_berjadual, STATUS[g.status_beban],
        g.jabatan.join(' / '), g.subjek_ids.map(function (id) { return subjekNama[id] || ''; }).join(' / '), g.tingkatan.join(' / '),
        g.cerapan, g.pencerap,
        g.unit.map(function (u) { return (unitNama[u.unit_id] || '') + ' (' + label(ref.jawatan_unit, u.jawatan) + ')'; }).join(' / '),
        g.usrah_guru ? g.usrah_guru.kumpulan + (g.usrah_guru.murabbi ? ' (murabbi)' : '') : '',
        g.usrah_guru && g.usrah_guru.peratus != null ? g.usrah_guru.peratus : '',
        g.peranan_hem.map(function (p) { return label(ref.jenis_peranan, p); }).join(' / '),
        g.murid_usrah || ''
      ].map(sel).join(','));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  var api = { tapis: tapis, ringkasan: ringkasan, susun: susun, ringkasanUnit: ringkasanUnit, keCsv: keCsv, sel: sel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DashKira = api;
})(this);
