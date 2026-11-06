/*
 * tugasan-import.js — baca jadual tugasan (tampal dari Excel atau fail CSV) dan padankan dengan sistem.
 * Berjalan di pelayar (window.TugasanImport) dan di Node untuk ujian.
 *
 * Lajur (baris pertama ialah tajuk, susunan bebas):
 *   guru_kod | jenis | kumpulan | nama_tugasan | subjek_kod | bilangan_kelas | jabatan | jam_kredit
 * jenis    : berjadual / tidak berjadual
 * kumpulan : subjek / al-quran tutorial / aktiviti lain (kosong = diteka)
 * jabatan  : KURI / HEM / KOKU / lain-lain (wajib untuk tidak berjadual)
 */
(function (root) {
  'use strict';
  var LAJUR = ['guru_kod', 'jenis', 'kumpulan', 'nama_tugasan', 'subjek_kod', 'bilangan_kelas', 'jabatan', 'jam_kredit'];
  var ALIAS = {
    guru_kod: ['guru_kod', 'id_guru', 'kod_guru', 'id'], jenis: ['jenis', 'jenis_tugasan'], kumpulan: ['kumpulan'],
    nama_tugasan: ['nama_tugasan', 'tugasan', 'nama'], subjek_kod: ['subjek_kod', 'kod_subjek', 'subjek'],
    bilangan_kelas: ['bilangan_kelas', 'bil_kelas', 'kelas'], jabatan: ['jabatan'], jam_kredit: ['jam_kredit', 'jam', 'kredit']
  };

  /** Pecah teks CSV/TSV kepada baris dan sel. Menyokong petikan "..." dan pemisah tab, koma atau koma bertitik. */
  function pecah(teks) {
    teks = String(teks || '').replace(/^﻿/, '');
    var baris1 = teks.split(/\r?\n/)[0] || '';
    var sep = baris1.indexOf('\t') !== -1 ? '\t' : (baris1.split(';').length > baris1.split(',').length ? ';' : ',');
    var rows = [], row = [], sel = '', q = false;
    for (var i = 0; i < teks.length; i++) {
      var ch = teks[i];
      if (q) {
        if (ch === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
        else if (ch === '"') q = false;
        else sel += ch;
      } else if (ch === '"' && sel === '') q = true;
      else if (ch === sep) { row.push(sel); sel = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && teks[i + 1] === '\n') i++;
        row.push(sel); rows.push(row); row = []; sel = '';
      } else sel += ch;
    }
    if (sel !== '' || row.length) { row.push(sel); rows.push(row); }
    return rows.map(function (r) { return r.map(function (c) { return c.trim(); }); }).filter(function (r) { return r.some(Boolean); });
  }

  function kunci(h) { return String(h).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  function nombor(v) {
    if (v === '' || v == null) return null;
    var n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }

  /**
   * teks -> { baris: [{ n, data, guru_nama, isu: [] }], lajurTiada: [] }
   * rujukan: { guru: [{id, guru_kod, nama_penuh}], subjek: [{id, kod, nama}] }
   */
  function baca(teks, rujukan) {
    var rows = pecah(teks);
    if (!rows.length) return { baris: [], lajurTiada: LAJUR.slice() };
    var head = rows[0].map(kunci), idx = {};
    LAJUR.forEach(function (l) {
      for (var i = 0; i < head.length; i++) if (ALIAS[l].indexOf(head[i]) !== -1) { idx[l] = i; return; }
    });
    var wajib = ['guru_kod', 'jenis', 'nama_tugasan', 'jam_kredit'];
    var lajurTiada = wajib.filter(function (l) { return idx[l] === undefined; });
    if (lajurTiada.length) return { baris: [], lajurTiada: lajurTiada };

    var guruByKod = {}, subjByKod = {}, subjByNama = {};
    rujukan.guru.forEach(function (g) { guruByKod[String(g.guru_kod).toUpperCase()] = g; });
    rujukan.subjek.forEach(function (s) { if (s.kod) subjByKod[String(s.kod).toUpperCase()] = s; subjByNama[String(s.nama).toLowerCase()] = s; });
    var get = function (r, l) { return idx[l] === undefined ? '' : (r[idx[l]] || ''); };

    var baris = rows.slice(1).map(function (r, i) {
      var isu = [], data = {};
      var kod = get(r, 'guru_kod').toUpperCase();
      var g = guruByKod[kod];
      if (!g) isu.push('ID guru "' + kod + '" tiada dalam sistem');
      else data.guru_id = g.id;

      var j = get(r, 'jenis').toLowerCase().replace(/[^a-z]/g, '');
      data.jenis_tugasan = j === 'berjadual' || j === 'b' ? 'berjadual' : (j === 'tidakberjadual' || j === 'tb' ? 'tidak_berjadual' : null);
      if (!data.jenis_tugasan) isu.push('Jenis mesti "berjadual" atau "tidak berjadual"');

      data.nama_tugasan = get(r, 'nama_tugasan');
      if (!data.nama_tugasan) isu.push('Nama tugasan kosong');

      var sk = get(r, 'subjek_kod');
      if (sk) {
        var s = subjByKod[sk.toUpperCase()] || subjByNama[sk.toLowerCase()];
        if (s) data.subjek_id = s.id; else isu.push('Subjek "' + sk + '" tiada dalam senarai subjek');
      }

      var k = get(r, 'kumpulan').toLowerCase().replace(/[^a-z]/g, '');
      if (data.jenis_tugasan === 'tidak_berjadual') data.kumpulan = 'tugasan_tidak_berjadual';
      else if (k === 'subjek') data.kumpulan = 'subjek';
      else if (k.indexOf('quran') !== -1 || k === 'tutorial') data.kumpulan = 'al_quran_tutorial';
      else if (k.indexOf('aktiviti') !== -1 || k === 'lain') data.kumpulan = 'aktiviti_lain';
      else if (!k) data.kumpulan = sk ? 'subjek' : 'aktiviti_lain';
      else isu.push('Kumpulan "' + get(r, 'kumpulan') + '" tidak dikenali');

      var jab = get(r, 'jabatan').toUpperCase().replace(/[^A-Z]/g, '');
      if (jab) data.jabatan = jab === 'LAIN' || jab === 'LAINLAIN' ? 'lain_lain' : jab;
      if (data.jabatan && ['KURI', 'HEM', 'KOKU', 'lain_lain'].indexOf(data.jabatan) === -1) isu.push('Jabatan "' + get(r, 'jabatan') + '" tidak dikenali');
      if (data.jenis_tugasan === 'tidak_berjadual' && !data.jabatan) isu.push('Jabatan wajib untuk tugasan tidak berjadual');

      var bk = nombor(get(r, 'bilangan_kelas'));
      if (bk !== null) { if (isNaN(bk) || bk < 0 || Math.floor(bk) !== bk) isu.push('Bilangan kelas tidak sah'); else data.bilangan_kelas = bk; }
      var jam = nombor(get(r, 'jam_kredit'));
      if (jam === null || isNaN(jam) || jam < 0 || jam > 40) isu.push('Jam kredit mesti nombor 0 hingga 40');
      else data.jam_kredit = jam;

      return { n: i + 2, data: data, guru_kod: kod, guru_nama: g ? g.nama_penuh : '', isu: isu };
    });
    return { baris: baris, lajurTiada: [] };
  }

  /** Jumlah jam setiap guru daripada baris sah (untuk pratonton). */
  function jumlah(baris) {
    var o = {};
    baris.filter(function (b) { return !b.isu.length; }).forEach(function (b) {
      var t = o[b.data.guru_id] = o[b.data.guru_id] || { guru_kod: b.guru_kod, guru_nama: b.guru_nama, berjadual: 0, tidak_berjadual: 0 };
      t[b.data.jenis_tugasan] = Math.round((t[b.data.jenis_tugasan] + b.data.jam_kredit) * 100) / 100;
    });
    return Object.keys(o).map(function (k) { return o[k]; });
  }

  var TEMPLAT = 'guru_kod,jenis,kumpulan,nama_tugasan,subjek_kod,bilangan_kelas,jabatan,jam_kredit\n' +
    'SM216,berjadual,subjek,Pendidikan Islam T2,PI,2,,6\n' +
    'SM216,berjadual,al-quran tutorial,Dirasat Al-Quran T1,DQT/J,1,,1.5\n' +
    'SM216,berjadual,aktiviti lain,Usrah Murabbi Pelajar,,,,1\n' +
    'SM216,tidak berjadual,,Ketua Panitia Dirasat Quran Tilawah dan Tajwid,,,KURI,4\n' +
    'SM216,tidak berjadual,,Guru Tarbiah,,,HEM,2\n';

  var api = { pecah: pecah, baca: baca, jumlah: jumlah, TEMPLAT: TEMPLAT, LAJUR: LAJUR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TugasanImport = api;
})(this);
