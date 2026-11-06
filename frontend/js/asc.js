/*
 * asc.js — baca eksport XML aSc Timetables dan tukar kepada slot jadual sistem.
 * Berjalan di pelayar (window.Asc) dan di Node (require) untuk ujian.
 *
 * Struktur XML aSc yang dijangka (elemen tertutup sendiri dengan atribut):
 *   <period period="1" starttime="7:30" endtime="7:40"/>
 *   <daysdef id=".." name="Isnin" days="10000"/>
 *   <subject id=".." name="Pendidikan Islam" short="PI"/>
 *   <teacher id=".." name="..." short="..."/>
 *   <class id=".." name="1 Tabari" short="1TAB"/>
 *   <lesson id=".." subjectid=".." classids="a,b" teacherids="t1"/>
 *   <card lessonid=".." period="3" days="10000"/>
 * Satu kad = satu waktu. Kad bersebelahan bagi pelajaran yang sama pada hari yang sama digabungkan.
 * Nota: format sebenar sekolah akan disemak semula bila fail eksport sebenar diterima.
 */
(function (root) {
  'use strict';
  var HARI = ['isnin', 'selasa', 'rabu', 'khamis', 'jumaat', 'sabtu', 'ahad'];

  function decode(v) {
    return v.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); }).replace(/&amp;/g, '&');
  }
  function attrs(s) {
    var o = {};
    s.replace(/([\w:-]+)\s*=\s*"([^"]*)"/g, function (m, k, v) { o[k] = decode(v); return m; });
    return o;
  }
  function tags(xml, name) {
    var re = new RegExp('<' + name + '\\b([^>]*?)\\/?>', 'g'), out = [], m;
    while ((m = re.exec(xml))) out.push(attrs(m[1]));
    return out;
  }
  function pad(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(t || '').trim());
    return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : null;
  }
  function senarai(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function minit(t) { var p = /^(\d{2}):(\d{2})$/.exec(t || ''); return p ? (+p[1]) * 60 + (+p[2]) : NaN; }

  /** Baca XML -> objek mentah. Lontar Error jika bukan fail aSc. */
  function baca(xml) {
    if (typeof xml !== 'string' || !/<timetable\b/i.test(xml)) throw new Error('Fail ini bukan eksport XML aSc Timetables. Pilih fail .xml yang dieksport daripada aSc.');
    var byId = function (list) { var o = {}; list.forEach(function (x) { if (x.id) o[x.id] = x; }); return o; };
    var periods = {};
    tags(xml, 'period').forEach(function (p) {
      var n = parseInt(p.period || p.name, 10);
      if (n) periods[n] = { nombor: n, masa_mula: pad(p.starttime), masa_akhir: pad(p.endtime) };
    });
    var days = byId(tags(xml, 'daysdef'));
    return {
      periods: periods, days: days,
      subjects: byId(tags(xml, 'subject')), teachers: byId(tags(xml, 'teacher')), classes: byId(tags(xml, 'class')),
      lessons: byId(tags(xml, 'lesson')),
      cards: tags(xml, 'card')
    };
  }

  /** Indeks hari (0 = Isnin) daripada atribut days="10000" (atau day="0"). */
  function hariDaripada(card, days) {
    var mask = card.days;
    if (!mask && card.daysdefid && days[card.daysdefid]) mask = days[card.daysdefid].days;
    if (mask && /^[01]+$/.test(mask)) {
      var out = [];
      for (var i = 0; i < mask.length; i++) if (mask[i] === '1') out.push(i);
      return out;
    }
    if (card.day !== undefined && /^\d+$/.test(card.day)) return [+card.day];
    return [];
  }

  /** Objek mentah -> senarai slot aSc (sebelum dipadankan dengan sistem). */
  function keSlot(d) {
    var kumpulan = {};
    d.cards.forEach(function (c) {
      var p = parseInt(c.period, 10);
      if (!p || !d.lessons[c.lessonid]) return;
      hariDaripada(c, d.days).forEach(function (h) {
        var k = c.lessonid + '|' + h;
        (kumpulan[k] = kumpulan[k] || []).push(p);
      });
    });
    var out = [];
    Object.keys(kumpulan).forEach(function (k) {
      var parts = k.split('|'), lesson = d.lessons[parts[0]], hari = +parts[1];
      var ps = kumpulan[k].sort(function (a, b) { return a - b; }).filter(function (p, i, a) { return a.indexOf(p) === i; });
      var julat = [], mula = ps[0], akhir = ps[0];
      for (var i = 1; i <= ps.length; i++) {
        if (ps[i] === akhir + 1) akhir = ps[i];
        else { julat.push([mula, akhir]); mula = akhir = ps[i]; }
      }
      var subj = d.subjects[lesson.subjectid] || {};
      var kelas = senarai(lesson.classids).map(function (id) { var c = d.classes[id] || {}; return { nama: c.name || id, short: c.short || '' }; });
      var guru = senarai(lesson.teacherids);
      julat.forEach(function (j) {
        var pa = d.periods[j[0]] || {}, pb = d.periods[j[1]] || {};
        guru.forEach(function (tid) {
          var t = d.teachers[tid] || {};
          out.push({
            asc_guru_id: tid,
            guru_nama: t.name || [t.firstname, t.lastname].filter(Boolean).join(' ') || tid,
            guru_short: t.short || '',
            hari: HARI[hari] || null,
            waktu_mula: j[0], waktu_akhir: j[1],
            masa_mula: pa.masa_mula || null, masa_akhir: pb.masa_akhir || null,
            subjek: { nama: subj.name || '', short: subj.short || '' },
            kelas: kelas
          });
        });
      });
    });
    out.sort(function (a, b) {
      return a.guru_nama < b.guru_nama ? -1 : a.guru_nama > b.guru_nama ? 1 : HARI.indexOf(a.hari) - HARI.indexOf(b.hari) || a.waktu_mula - b.waktu_mula;
    });
    return out;
  }

  /** Senarai guru unik dalam fail aSc. */
  function guruDalamFail(slots) {
    var o = {};
    slots.forEach(function (s) { if (!o[s.asc_guru_id]) o[s.asc_guru_id] = { asc_guru_id: s.asc_guru_id, nama: s.guru_nama, short: s.guru_short, slot: 0 }; o[s.asc_guru_id].slot++; });
    return Object.keys(o).map(function (k) { return o[k]; });
  }

  /** Cadangan padanan guru aSc -> guru sistem (nama penuh, kemudian ID guru = short). */
  function padanGuru(senaraiGuru, guruSistem) {
    var byNama = {}, byKod = {};
    guruSistem.forEach(function (g) { byNama[norm(g.nama_penuh)] = g.id; byKod[String(g.guru_kod).toUpperCase()] = g.id; });
    var out = {};
    senaraiGuru.forEach(function (t) {
      out[t.asc_guru_id] = byNama[norm(t.nama)] || byKod[String(t.short || '').toUpperCase()] || null;
    });
    return out;
  }

  /**
   * Tukar slot aSc kepada baris sistem, dengan isu (perkara meragukan).
   * rujukan: { subjek: [{id,nama,kod}], kelas: [{id,nama}] }, petaGuru: { asc_guru_id: guru_id|null }
   */
  function padankan(slots, rujukan, petaGuru) {
    var sKod = {}, sNama = {}, kNama = {};
    rujukan.subjek.forEach(function (s) { if (s.kod) sKod[norm(s.kod)] = s.id; sNama[norm(s.nama)] = s.id; });
    rujukan.kelas.forEach(function (k) { kNama[norm(k.nama)] = k.id; });
    return slots.map(function (s, i) {
      var isu = [];
      var guru_id = petaGuru[s.asc_guru_id] || null;
      if (!guru_id) isu.push('Guru "' + s.guru_nama + '" belum dipadankan');
      var subjek_id = sKod[norm(s.subjek.short)] || sNama[norm(s.subjek.nama)] || null;
      var label = null;
      if (!subjek_id) {
        label = (s.subjek.nama || s.subjek.short || 'Aktiviti').slice(0, 60);
        isu.push('Subjek "' + (s.subjek.short || s.subjek.nama) + '" tiada dalam senarai subjek; disimpan sebagai aktiviti');
      }
      var kelas_ids = [], tiada = [];
      s.kelas.forEach(function (k) {
        var id = kNama[norm(k.nama)] || kNama[norm(k.short)];
        if (id) { if (kelas_ids.indexOf(id) === -1) kelas_ids.push(id); } else tiada.push(k.nama);
      });
      if (tiada.length) isu.push('Kelas tiada dalam sistem: ' + tiada.join(', '));
      if (!s.masa_mula || !s.masa_akhir) isu.push('Masa waktu ' + s.waktu_mula + ' tiada dalam fail');
      if (!s.hari) isu.push('Hari tidak dikenali');
      return {
        n: i + 1, include: true, asc_guru_id: s.asc_guru_id, guru_nama_asc: s.guru_nama, guru_id: guru_id,
        hari: s.hari, masa_mula: s.masa_mula, masa_akhir: s.masa_akhir, subjek_id: subjek_id, label: label,
        kelas_ids: kelas_ids, kelas_asal: s.kelas.map(function (k) { return k.nama; }), isu: isu
      };
    });
  }

  /** Semak semula satu baris selepas disunting pengguna. Pulangkan senarai isu yang menghalang simpan. */
  function isuMenghalang(r) {
    var out = [];
    if (!r.guru_id) out.push('tiada guru');
    if (!r.hari) out.push('tiada hari');
    if (!/^\d{2}:\d{2}$/.test(r.masa_mula || '') || !/^\d{2}:\d{2}$/.test(r.masa_akhir || '')) out.push('masa tidak sah');
    else if (minit(r.masa_akhir) <= minit(r.masa_mula)) out.push('masa tamat sebelum mula');
    if (!r.subjek_id && !r.label) out.push('tiada subjek atau aktiviti');
    return out;
  }

  /** Pertindihan dalam data import (algoritma sama seperti Kurikulum.gs). */
  function kesanPertindihan(rows) {
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      for (var j = i + 1; j < rows.length; j++) {
        var a = rows[i], b = rows[j];
        if (a.hari !== b.hari || !(minit(a.masa_mula) < minit(b.masa_akhir) && minit(b.masa_mula) < minit(a.masa_akhir))) continue;
        if (a.guru_id && a.guru_id === b.guru_id) out.push({ jenis: 'guru', a: a.n, b: b.n });
        else (a.kelas_ids || []).forEach(function (k) { if ((b.kelas_ids || []).indexOf(k) !== -1) out.push({ jenis: 'kelas', a: a.n, b: b.n, kelas_id: k }); });
      }
    }
    return out;
  }

  var api = { baca: baca, keSlot: keSlot, guruDalamFail: guruDalamFail, padanGuru: padanGuru, padankan: padankan, isuMenghalang: isuMenghalang, kesanPertindihan: kesanPertindihan, norm: norm, HARI: HARI };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Asc = api;
})(this);
