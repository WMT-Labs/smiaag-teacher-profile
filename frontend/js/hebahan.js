/*
 * hebahan.js — jana teks hebahan WhatsApp guru ganti (relief) mengikut templat sekolah:
 *
 *   Assalamualaikum
 *   Relief Khamis 5 Nov 2026
 *
 *
 *   1. Irfan (Tamrin WAFA)
 *   ▫️*7.30-8.30* (DQH, 3 Suyuthi): Cg Nuaimah
 *
 *   2. Farah Hanani
 *   ▫️*11.15-12.05* (RBT, 3 Razi): Cg Nurul Ain
 *
 *   Terima Kasih
 *
 * Hanya guru tidak hadir yang ada sekurang-kurangnya satu slot berpengganti dimasukkan.
 * Berjalan di pelayar (window.Hebahan) dan di Node untuk ujian.
 */
(function (root) {
  'use strict';
  var BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  var HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

  /** "13:05" -> "1.05" */
  function masa(hhmm) {
    var m = /^(\d{2}):(\d{2})/.exec(hhmm || '');
    if (!m) return hhmm || '';
    var h = +m[1] % 12 === 0 ? 12 : +m[1] % 12;
    return h + '.' + m[2];
  }

  /** "2026-11-05" -> "Khamis 5 Nov 2026" */
  function tarikhPanjang(iso) {
    var y = +iso.slice(0, 4), mo = +iso.slice(5, 7), d = +iso.slice(8, 10);
    var hari = HARI[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
    return hari + ' ' + d + ' ' + BULAN[mo - 1] + ' ' + y;
  }

  /**
   * data: { tarikh, tidak_hadir: [{ guru: { panggilan }, sebab, slot: [{ masa_mula, masa_akhir, subjek, kelas, ganti: { guru: { panggilan } } | null }] }] }
   */
  function jana(data) {
    var baris = ['Assalamualaikum ', 'Relief ' + tarikhPanjang(data.tarikh), '', ''];
    var n = 0;
    (data.tidak_hadir || []).forEach(function (t) {
      var ada = (t.slot || []).filter(function (s) { return s.ganti && s.ganti.guru; });
      if (!ada.length) return;
      n++;
      baris.push(n + '. ' + t.guru.panggilan + (t.sebab ? ' (' + t.sebab + ')' : ''));
      ada.forEach(function (s) {
        var maklumat = [s.subjek, s.kelas].filter(Boolean).join(', ');
        baris.push('▫️*' + masa(s.masa_mula) + '-' + masa(s.masa_akhir) + '*' + (maklumat ? ' (' + maklumat + ')' : '') + ': Cg ' + s.ganti.guru.panggilan);
      });
      baris.push('');
    });
    if (!n) return '';
    baris.push('Terima Kasih');
    return baris.join('\n');
  }

  /** Bilangan slot yang belum ada pengganti. */
  function belumAda(data) {
    var c = 0;
    (data.tidak_hadir || []).forEach(function (t) { (t.slot || []).forEach(function (s) { if (!s.ganti) c++; }); });
    return c;
  }

  var api = { jana: jana, belumAda: belumAda, masa: masa, tarikhPanjang: tarikhPanjang };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Hebahan = api;
})(this);
