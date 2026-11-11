/**
 * Ganti.gs — guru tidak hadir dan agihan guru ganti (relief) harian.
 *
 * Aliran pentadbir:
 *  1. Pilih tarikh, rekod guru yang tidak hadir (dengan sebab).
 *  2. Sistem papar semua slot guru itu pada hari tersebut (daripada jadual yang disahkan).
 *  3. Bagi setiap slot, cari guru lapang dan pilih pengganti.
 *  4. Senarai hari itu dijana dalam format hebahan WhatsApp (di pelayar, js/hebahan.js).
 *
 * Guru "lapang" untuk satu slot = guru mengajar aktif yang:
 *  - tiada slot sendiri yang bertindih pada hari itu,
 *  - tidak juga tidak hadir pada tarikh itu,
 *  - belum ditugaskan ganti lain yang bertindih pada tarikh itu.
 * Disusun: paling sedikit ganti bulan ini, kemudian jam kredit berjadual paling rendah.
 */

var HARI_MINGGU = ['ahad', 'isnin', 'selasa', 'rabu', 'khamis', 'jumaat', 'sabtu'];

/** "2026-11-05" -> "khamis" */
function hariDaripadaTarikh(iso) {
  var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
  return HARI_MINGGU[d.getUTCDay()];
}

function _tarikhParam(params) {
  var t = pStr(params, 'tarikh', { label: 'Tarikh', max: 10 });
  if (!isIsoDate(t)) throw new AppError('VALIDASI', 'Tarikh tidak sah.', { field: 'tarikh' });
  return t;
}

function _labelSlot(s, subjekById, kelasNama) {
  var sj = s.subjek_id ? subjekById[s.subjek_id] : null;
  return {
    subjek: sj ? (sj.kod || sj.nama) : (s.label || ''),
    kelas: (s.kelas_ids || []).map(function (k) { return kelasNama[k] || '?'; }).join(', ')
  };
}

/** Data lengkap satu tarikh: guru tidak hadir, slot mereka, dan pengganti. */
function _dataHari(tarikh) {
  var tahun = tarikh.slice(0, 4), hari = hariDaripadaTarikh(tarikh);
  var guruAll = {}; query('guru', {}).forEach(function (g) { guruAll[g.id] = g; });
  var subjekById = {}; _subjekSenarai().forEach(function (s) { subjekById[s.id] = s; });
  var kelasNama = {}; query('kelas', { tahun_akademik: tahun }).forEach(function (k) { kelasNama[k.id] = k.nama; });
  var tidakHadir = query('ketidakhadiran_guru', { tarikh: tarikh }, { orderBy: 'created_at' });
  var idTH = tidakHadir.map(function (t) { return t.id; });
  var ganti = idTH.length ? query('guru_ganti', { ketidakhadiran_id: idTH }) : [];
  var slotHari = _slotTahun(tahun, true).filter(function (s) { return s.hari === hari; });
  return {
    tarikh: tarikh, hari: hari, tahun: tahun,
    guruAll: guruAll, subjekById: subjekById, kelasNama: kelasNama,
    tidakHadir: tidakHadir, ganti: ganti, slotHari: slotHari
  };
}

function _ringkasGuru(g) { return g ? { id: g.id, nama: g.nama_penuh, panggilan: namaPanggilan(g), guru_kod: g.guru_kod } : null; }

function aksiGantiHari(ctx, params) {
  var tarikh = _tarikhParam(params);
  var D = _dataHari(tarikh);
  var gantiBySlot = {};
  D.ganti.forEach(function (x) { gantiBySlot[x.ketidakhadiran_id + '|' + (x.slot_id || x.id)] = x; });
  var labelJenis = {};
  _refSenarai('ref_jenis_ketidakhadiran').forEach(function (r) { labelJenis[r.kod] = r.label; });
  var out = D.tidakHadir.map(function (t) {
    var slots = D.slotHari.filter(function (s) { return s.guru_id === t.guru_id; }).sort(function (a, b) { return minitDari(a.masa_mula) - minitDari(b.masa_mula); });
    var rows = slots.map(function (s) {
      var l = _labelSlot(s, D.subjekById, D.kelasNama);
      var g = gantiBySlot[t.id + '|' + s.id];
      return { slot_id: s.id, masa_mula: s.masa_mula, masa_akhir: s.masa_akhir, subjek: l.subjek, kelas: l.kelas,
        ganti: g ? { id: g.id, guru: _ringkasGuru(D.guruAll[g.guru_ganti_id]), catatan: g.catatan } : null };
    });
    // Ganti yang slotnya tiada lagi dalam jadual (jadual berubah) tetap dipaparkan daripada salinan
    D.ganti.filter(function (x) { return x.ketidakhadiran_id === t.id && !slots.some(function (s) { return s.id === x.slot_id; }); }).forEach(function (x) {
      rows.push({ slot_id: x.slot_id, masa_mula: x.masa_mula, masa_akhir: x.masa_akhir, subjek: x.subjek, kelas: x.kelas, tiada_dalam_jadual: true,
        ganti: { id: x.id, guru: _ringkasGuru(D.guruAll[x.guru_ganti_id]), catatan: x.catatan } });
    });
    rows.sort(function (a, b) { return minitDari(a.masa_mula) - minitDari(b.masa_mula); });
    var jenis = t.jenis || 'lain_lain'; // rekod sebelum lajur jenis wujud
    return { id: t.id, guru: _ringkasGuru(D.guruAll[t.guru_id]), sebab: t.sebab, jenis: jenis, jenis_label: labelJenis[jenis] || jenis,
      sebab_hebahan: sebabHebahan(jenis, t.sebab, labelJenis), slot: rows };
  });
  return {
    ref: { jenis_ketidakhadiran: _refSenarai('ref_jenis_ketidakhadiran') },
    tarikh: tarikh, hari: D.hari, hari_label: _refSenarai('ref_hari').filter(function (h) { return h.kod === D.hari; }).map(function (h) { return h.label; })[0] || D.hari,
    tidak_hadir: out,
    guru: senaraiGuruMengajar().map(function (g) { return { id: g.id, nama: g.nama_penuh, guru_kod: g.guru_kod }; })
  };
}

/**
 * Teks dalam kurungan pada hebahan WhatsApp. Catatan pentadbir (sebab) diutamakan. Jika kosong, guna jenis:
 * singkatan sekolah CT / MC / CTG / CE (keputusan pemilik 11/11/2026), label penuh untuk jenis lain.
 */
var SINGKATAN_HEBAHAN = { cuti_tahunan: 'CT', cuti_sakit: 'MC', cuti_tanpa_gaji: 'CTG', cuti_ehsan: 'CE' };
function sebabHebahan(jenis, sebab, labelJenis) {
  if (sebab) return sebab;
  if (!jenis || jenis === 'lain_lain') return '';
  return SINGKATAN_HEBAHAN[jenis] || labelJenis[jenis] || '';
}

function aksiGantiTidakHadirSimpan(ctx, params) {
  var tarikh = _tarikhParam(params);
  var row = { sebab: pStr(params, 'sebab', { label: 'Sebab', max: 60, optional: true }) };
  var jenisSah = _refSenarai('ref_jenis_ketidakhadiran').map(function (r) { return r.kod; });
  if (params.jenis !== undefined && params.jenis !== null && params.jenis !== '') row.jenis = pOneOf(params, 'jenis', jenisSah, 'Jenis');
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Rekod');
    var sedia = getById('ketidakhadiran_guru', id);
    if (!sedia) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
    if (!row.jenis) row.jenis = sedia.jenis || 'lain_lain'; // rekod lama tanpa jenis
    hasil = update('ketidakhadiran_guru', id, row, { actorId: ctx.akaunId });
  } else {
    var gid = pUuid(params, 'guru_id', 'Guru');
    var g = getById('guru', gid);
    if (!g || g.akaun_sistem || !g.aktif) throw new AppError('VALIDASI', 'Guru tidak dijumpai.');
    row.tarikh = tarikh; row.guru_id = gid;
    try { hasil = insert('ketidakhadiran_guru', row, { actorId: ctx.akaunId }); }
    catch (e) { if (e && e.code === 'DUPLIKAT') throw new AppError('DUPLIKAT', g.nama_penuh + ' sudah direkod tidak hadir pada tarikh ini.'); throw e; }
  }
  logAudit(ctx.akaunId, 'GANTI_TIDAK_HADIR', tarikh, (hasil.jenis || '') + (row.sebab ? ' · ' + row.sebab : ''));
  return { id: hasil.id };
}

function aksiGantiTidakHadirPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Rekod');
  if (!getById('ketidakhadiran_guru', id)) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
  removeWhere('guru_ganti', { ketidakhadiran_id: id });
  remove('ketidakhadiran_guru', id);
  return { dipadam: true };
}

/** Bilangan tugasan ganti setiap guru dalam bulan tarikh itu (untuk agihan yang adil). */
function _kiraGantiBulan(tarikh) {
  var bulan = tarikh.slice(0, 7);
  var th = {};
  query('ketidakhadiran_guru', { tarikh: { gte: bulan + '-01', lte: bulan + '-31' } }).forEach(function (t) { th[t.id] = true; });
  var kira = {};
  var ids = Object.keys(th);
  if (ids.length) query('guru_ganti', { ketidakhadiran_id: ids }).forEach(function (g) { kira[g.guru_ganti_id] = (kira[g.guru_ganti_id] || 0) + 1; });
  return kira;
}

/** Guru yang sibuk pada julat masa ini pada tarikh itu. kecualiGantiId: abaikan tugasan ganti ini (semasa menukar pengganti). */
function _guruSibuk(D, mula, akhir, kecualiGantiId) {
  var sasaran = { hari: D.hari, masa_mula: mula, masa_akhir: akhir };
  var sibuk = {};
  D.slotHari.forEach(function (s) { if (slotBertindih(s, sasaran)) sibuk[s.guru_id] = 'ada kelas'; });
  D.tidakHadir.forEach(function (t) { sibuk[t.guru_id] = 'tidak hadir'; });
  D.ganti.forEach(function (g) {
    if (g.id !== kecualiGantiId && slotBertindih({ hari: D.hari, masa_mula: g.masa_mula, masa_akhir: g.masa_akhir }, sasaran)) sibuk[g.guru_ganti_id] = 'sudah ganti';
  });
  return sibuk;
}

function _cariSlotTidakHadir(D, kid, slotId) {
  var t = D.tidakHadir.filter(function (x) { return x.id === kid; })[0];
  if (!t) throw new AppError('TIDAK_JUMPA', 'Rekod tidak hadir tidak dijumpai untuk tarikh ini.');
  var s = D.slotHari.filter(function (x) { return x.id === slotId && x.guru_id === t.guru_id; })[0];
  if (!s) throw new AppError('TIDAK_JUMPA', 'Slot tidak dijumpai dalam jadual guru ini pada hari tersebut.');
  return { t: t, s: s };
}

function aksiGantiCalon(ctx, params) {
  var tarikh = _tarikhParam(params);
  var D = _dataHari(tarikh);
  var x = _cariSlotTidakHadir(D, pUuid(params, 'ketidakhadiran_id', 'Rekod'), pUuid(params, 'slot_id', 'Slot'));
  var sedia = D.ganti.filter(function (g) { return g.ketidakhadiran_id === x.t.id && g.slot_id === x.s.id; })[0];
  var sibuk = _guruSibuk(D, x.s.masa_mula, x.s.masa_akhir, sedia ? sedia.id : null);
  var kira = _kiraGantiBulan(tarikh);
  var opsyen = {};
  if (x.s.subjek_id) query('opsyen_guru', { subjek_id: x.s.subjek_id }).forEach(function (o) { opsyen[o.guru_id] = o.jenis; });
  var tugasan = {};
  query('tugasan_guru', { tahun_akademik: D.tahun }).forEach(function (t) { (tugasan[t.guru_id] = tugasan[t.guru_id] || []).push(t); });
  var calon = senaraiGuruMengajar().filter(function (g) { return !sibuk[g.id]; }).map(function (g) {
    return { id: g.id, nama: g.nama_penuh, panggilan: namaPanggilan(g), guru_kod: g.guru_kod, opsyen: opsyen[g.id] || null,
      ganti_bulan_ini: kira[g.id] || 0, jam_berjadual: kiraJamKredit(tugasan[g.id] || []).berjadual };
  }).sort(function (a, b) { return a.ganti_bulan_ini - b.ganti_bulan_ini || a.jam_berjadual - b.jam_berjadual || (a.nama < b.nama ? -1 : 1); });
  var l = _labelSlot(x.s, D.subjekById, D.kelasNama);
  return { slot: { slot_id: x.s.id, masa_mula: x.s.masa_mula, masa_akhir: x.s.masa_akhir, subjek: l.subjek, kelas: l.kelas }, calon: calon, semasa: sedia ? sedia.guru_ganti_id : null };
}

function aksiGantiTetap(ctx, params) {
  var tarikh = _tarikhParam(params);
  var D = _dataHari(tarikh);
  var x = _cariSlotTidakHadir(D, pUuid(params, 'ketidakhadiran_id', 'Rekod'), pUuid(params, 'slot_id', 'Slot'));
  var gid = pUuid(params, 'guru_ganti_id', 'Guru ganti');
  var g = getById('guru', gid);
  if (!g || !g.aktif || g.akaun_sistem) throw new AppError('VALIDASI', 'Guru ganti tidak dijumpai.');
  var sedia = D.ganti.filter(function (k) { return k.ketidakhadiran_id === x.t.id && k.slot_id === x.s.id; })[0];
  var sibuk = _guruSibuk(D, x.s.masa_mula, x.s.masa_akhir, sedia ? sedia.id : null);
  if (sibuk[gid]) throw new AppError('VALIDASI', g.nama_penuh + ' tidak lapang pada masa ini (' + sibuk[gid] + ').');
  var l = _labelSlot(x.s, D.subjekById, D.kelasNama);
  var row = { ketidakhadiran_id: x.t.id, slot_id: x.s.id, masa_mula: x.s.masa_mula, masa_akhir: x.s.masa_akhir,
    subjek: l.subjek || null, kelas: l.kelas || null, guru_ganti_id: gid, catatan: pStr(params, 'catatan', { label: 'Catatan', max: 200, optional: true }) };
  var hasil = sedia ? update('guru_ganti', sedia.id, { guru_ganti_id: gid, catatan: row.catatan }, { actorId: ctx.akaunId }) : insert('guru_ganti', row, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'GANTI_TETAP', tarikh, x.s.masa_mula + ' -> ' + g.guru_kod);
  return { id: hasil.id };
}

function aksiGantiBatal(ctx, params) {
  var id = pUuid(params, 'id', 'Rekod');
  if (!getById('guru_ganti', id)) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
  remove('guru_ganti', id);
  return { dipadam: true };
}
