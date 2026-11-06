/**
 * Kokurikulum.gs — unit (Syabab, kelab, pasukan), rumah sukan, juara rumah sukan, pertandingan (Fasa 4).
 *
 * Akses:
 *  - Guru: lihat dan isi keahlian unit, rumah sukan dan pertandingan SENDIRI.
 *  - Pentadbir: semua di atas bagi mana-mana guru, ditambah urus senarai unit (termasuk semua kelab),
 *    rumah sukan, sejarah juara dan senarai pertandingan seluruh sekolah.
 */

var RUMAH_LALAI = [['Fatah', 'merah', '#d9534f'], ['Falah', 'hijau', '#2e9e4f'], ['Najah', 'biru', '#2f6fb3'], ['Solah', 'kuning', '#e0b020']];
var SYABAB_LALAI = ['KASPA', 'KRS', 'BSMM', 'Puteri Islam'];

// ---------------------------------------------------------------------------
// Fungsi tulen
// ---------------------------------------------------------------------------

/**
 * Kiraan pingat rumah sukan merentas tahun.
 * juara: [{ tahun_akademik, rumah_sukan_id, kedudukan }] -> { rumah_id: { johan, naib, ketiga, keempat } }
 */
function kiraJuaraRumah(juara) {
  var out = {};
  var nama = ['johan', 'naib', 'ketiga', 'keempat'];
  (juara || []).forEach(function (j) {
    var o = out[j.rumah_sukan_id] = out[j.rumah_sukan_id] || { johan: 0, naib: 0, ketiga: 0, keempat: 0 };
    var k = nama[j.kedudukan - 1];
    if (k) o[k]++;
  });
  return out;
}

/** Baca teks CSV juara: "tahun,rumah,kedudukan[,catatan]" setiap baris. Baris tajuk diabaikan. */
function bacaTeksJuara(teks, rumah) {
  var byNama = {};
  rumah.forEach(function (r) { byNama[String(r.nama).toLowerCase()] = r.id; });
  var baris = [], ralat = [];
  String(teks || '').split(/\r?\n/).forEach(function (line, i) {
    line = line.trim();
    if (!line) return;
    var p = line.split(/\t|,|;/).map(function (x) { return x.trim(); });
    if (i === 0 && !/^\d{4}$/.test(p[0])) return; // tajuk
    var tahun = p[0], rid = byNama[String(p[1] || '').toLowerCase()], ked = parseInt(p[2], 10);
    if (!/^\d{4}$/.test(tahun)) { ralat.push('Baris ' + (i + 1) + ': tahun tidak sah'); return; }
    if (!rid) { ralat.push('Baris ' + (i + 1) + ': rumah "' + (p[1] || '') + '" tidak dikenali'); return; }
    if (!(ked >= 1 && ked <= 4)) { ralat.push('Baris ' + (i + 1) + ': kedudukan mesti 1 hingga 4'); return; }
    baris.push({ tahun_akademik: tahun, rumah_sukan_id: rid, kedudukan: ked, catatan: p.slice(3).join(', ') || null });
  });
  return { baris: baris, ralat: ralat };
}

// ---------------------------------------------------------------------------
// Bantuan
// ---------------------------------------------------------------------------

function _unitTahun(tahun) {
  return query('unit_kokurikulum', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'jenis']));
}
function _rumahSemua() {
  return query('rumah_sukan', {}, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'warna']));
}
function _kokuRef() {
  return {
    jenis_unit: _refSenarai('ref_jenis_unit'), jawatan_unit: _refSenarai('ref_jawatan_unit'),
    peringkat: _refSenarai('ref_peringkat_pertandingan'), peranan: _refSenarai('ref_peranan_pertandingan')
  };
}

/** Pertandingan dengan senarai peserta guru. */
function _pertandinganLengkap(list) {
  var guruNama = {};
  query('guru', {}).forEach(function (g) { guruNama[g.id] = g.nama_penuh; });
  var unitNama = {};
  query('unit_kokurikulum', {}).forEach(function (u) { unitNama[u.id] = u.nama; });
  var peserta = {};
  query('penyertaan_pertandingan', {}).forEach(function (p) {
    (peserta[p.pertandingan_id] = peserta[p.pertandingan_id] || []).push({ id: p.id, guru_id: p.guru_id, nama: guruNama[p.guru_id] || '?', peranan: p.peranan });
  });
  return list.map(function (p) {
    var o = _pilih(['id', 'nama_acara', 'peringkat', 'tarikh', 'bilangan_murid', 'pencapaian', 'unit_id', 'tahun_akademik'])(p);
    o.unit_nama = p.unit_id ? unitNama[p.unit_id] || null : null;
    o.peserta = peserta[p.id] || [];
    return o;
  }).sort(function (a, b) { return (b.tarikh || '') < (a.tarikh || '') ? -1 : 1; });
}

function _bolehSuntingPertandingan(ctx, pertandinganId) {
  if (_isAdmin(ctx)) return true;
  return query('penyertaan_pertandingan', { pertandingan_id: pertandinganId, guru_id: ctx.guruId }).length > 0;
}

// ---------------------------------------------------------------------------
// Aksi: paparan guru
// ---------------------------------------------------------------------------

function aksiKokuLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = _tahunParam(params);
  var units = _unitTahun(tahun);
  var unitById = {}; units.forEach(function (u) { unitById[u.id] = u; });
  var rumah = _rumahSemua();
  var rumahById = {}; rumah.forEach(function (r) { rumahById[r.id] = r; });

  var keahlian = query('keahlian_unit', { guru_id: guru.id, tahun_akademik: tahun }).map(function (k) {
    var u = unitById[k.unit_id] || {};
    return { id: k.id, unit_id: k.unit_id, unit_nama: u.nama || '?', jenis: u.jenis || null, jawatan: k.jawatan };
  });
  var gr = query('guru_rumah', { guru_id: guru.id, tahun_akademik: tahun })[0] || null;
  var idPertandingan = {};
  query('penyertaan_pertandingan', { guru_id: guru.id }).forEach(function (p) { idPertandingan[p.pertandingan_id] = true; });
  var pertandingan = _pertandinganLengkap(query('pertandingan', { tahun_akademik: tahun }).filter(function (p) { return idPertandingan[p.id]; }));

  return {
    guru: { id: guru.id, nama_penuh: guru.nama_penuh, guru_kod: guru.guru_kod },
    milik_sendiri: guru.id === ctx.guruId,
    tahun: tahun,
    keahlian: keahlian,
    rumah: gr ? { id: gr.id, rumah_sukan_id: gr.rumah_sukan_id, nama: (rumahById[gr.rumah_sukan_id] || {}).nama, warna: (rumahById[gr.rumah_sukan_id] || {}).warna, jawatan: gr.jawatan } : null,
    pertandingan: pertandingan,
    ref: Object.assign({ unit: units, rumah: rumah }, _kokuRef())
  };
}

// ---------------------------------------------------------------------------
// Aksi: pertandingan
// ---------------------------------------------------------------------------

function _dataPertandingan(params, tahun) {
  var row = {
    nama_acara: pStr(params, 'nama_acara', { label: 'Nama acara', min: 2, max: 200 }),
    peringkat: pStr(params, 'peringkat', { label: 'Peringkat', max: 30 }),
    tarikh: pStr(params, 'tarikh', { label: 'Tarikh', max: 10, optional: true }),
    bilangan_murid: params.bilangan_murid === '' ? null : params.bilangan_murid,
    pencapaian: pStr(params, 'pencapaian', { label: 'Pencapaian', max: 1000, optional: true }),
    unit_id: params.unit_id ? pUuid(params, 'unit_id', 'Unit') : null,
    tahun_akademik: tahun
  };
  if (row.tarikh && row.tarikh.slice(0, 4) !== tahun) throw new AppError('VALIDASI', 'Tarikh mesti dalam tahun ' + tahun + '.', { field: 'tarikh' });
  return row;
}

/** Cipta (guru sasaran sebagai peserta) atau kemas kini pertandingan. */
function aksiPertandinganSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = _dataPertandingan(params, tahun);
  var peranan = pStr(params, 'peranan', { label: 'Peranan', max: 30, optional: true });
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Pertandingan');
    if (!getById('pertandingan', id)) throw new AppError('TIDAK_JUMPA', 'Pertandingan tidak dijumpai.');
    if (!_bolehSuntingPertandingan(ctx, id)) throw new AppError('TIADA_KEBENARAN', 'Hanya guru yang terlibat atau pentadbir boleh mengubah pertandingan ini.');
    hasil = update('pertandingan', id, row, { actorId: ctx.akaunId });
    if (peranan) {
      var mine = query('penyertaan_pertandingan', { pertandingan_id: id, guru_id: (params.guru_id && _isAdmin(ctx)) ? params.guru_id : ctx.guruId })[0];
      if (mine) update('penyertaan_pertandingan', mine.id, { peranan: peranan }, { actorId: ctx.akaunId });
    }
  } else {
    var guru = _sasaranGuru(ctx, params.guru_id);
    hasil = insert('pertandingan', row, { actorId: ctx.akaunId });
    try {
      insert('penyertaan_pertandingan', { pertandingan_id: hasil.id, guru_id: guru.id, peranan: peranan || 'lain_lain' }, { actorId: ctx.akaunId });
    } catch (e) { remove('pertandingan', hasil.id); throw e; }
  }
  logAudit(ctx.akaunId, 'PERTANDINGAN_SIMPAN', row.nama_acara, tahun);
  return _pertandinganLengkap([getById('pertandingan', hasil.id)])[0];
}

/** Tambah guru lain ke pertandingan (pentadbir, atau guru menambah diri sendiri). */
function aksiPenyertaanSimpan(ctx, params) {
  var pid = pUuid(params, 'pertandingan_id', 'Pertandingan');
  if (!getById('pertandingan', pid)) throw new AppError('TIDAK_JUMPA', 'Pertandingan tidak dijumpai.');
  var guru = _sasaranGuru(ctx, params.guru_id);
  var peranan = pStr(params, 'peranan', { label: 'Peranan', max: 30 });
  if (!_isAdmin(ctx) && !_bolehSuntingPertandingan(ctx, pid) && guru.id !== ctx.guruId) throw new AppError('TIADA_KEBENARAN', 'Tiada kebenaran.');
  insert('penyertaan_pertandingan', { pertandingan_id: pid, guru_id: guru.id, peranan: peranan }, { actorId: ctx.akaunId });
  return _pertandinganLengkap([getById('pertandingan', pid)])[0];
}

/** Buang penyertaan. Jika tiada peserta lagi, pertandingan itu turut dipadam. */
function aksiPenyertaanPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Penyertaan');
  var p = getById('penyertaan_pertandingan', id);
  if (!p) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
  if (!_isAdmin(ctx) && p.guru_id !== ctx.guruId) throw new AppError('TIADA_KEBENARAN', 'Anda hanya boleh membuang penyertaan anda sendiri.');
  remove('penyertaan_pertandingan', id);
  var baki = query('penyertaan_pertandingan', { pertandingan_id: p.pertandingan_id }).length;
  if (!baki) remove('pertandingan', p.pertandingan_id);
  return { dipadam: true, pertandingan_dipadam: !baki };
}

function aksiPertandinganPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Pertandingan');
  if (!getById('pertandingan', id)) throw new AppError('TIDAK_JUMPA', 'Pertandingan tidak dijumpai.');
  removeWhere('penyertaan_pertandingan', { pertandingan_id: id });
  remove('pertandingan', id);
  logAudit(ctx.akaunId, 'PERTANDINGAN_PADAM', id);
  return { dipadam: true };
}

// ---------------------------------------------------------------------------
// Aksi: urus (pentadbir)
// ---------------------------------------------------------------------------

function aksiKokuUrus(ctx, params) {
  var tahun = _tahunParam(params);
  var units = _unitTahun(tahun);
  var guruNama = {};
  query('guru', { aktif: true }).forEach(function (g) { guruNama[g.id] = g.nama_penuh; });
  var ahli = {};
  query('keahlian_unit', { tahun_akademik: tahun }).forEach(function (k) {
    (ahli[k.unit_id] = ahli[k.unit_id] || []).push({ id: k.id, guru_id: k.guru_id, nama: guruNama[k.guru_id] || '?', jawatan: k.jawatan });
  });
  var rumah = _rumahSemua();
  var guruRumah = {};
  query('guru_rumah', { tahun_akademik: tahun }).forEach(function (g) {
    (guruRumah[g.rumah_sukan_id] = guruRumah[g.rumah_sukan_id] || []).push({ id: g.id, guru_id: g.guru_id, nama: guruNama[g.guru_id] || '?', jawatan: g.jawatan });
  });
  var juara = query('juara_rumah_sukan', {}, { orderBy: 'tahun_akademik', desc: true }).map(_pilih(['id', 'tahun_akademik', 'rumah_sukan_id', 'kedudukan', 'catatan']));
  var adaUnit = {};
  query('keahlian_unit', { tahun_akademik: tahun }).forEach(function (k) { adaUnit[k.guru_id] = true; });
  return {
    tahun: tahun,
    unit: units.map(function (u) { u.ahli = ahli[u.id] || []; return u; }),
    rumah: rumah.map(function (r) { r.guru = guruRumah[r.id] || []; return r; }),
    juara: juara,
    kiraan_juara: kiraJuaraRumah(juara),
    pertandingan: _pertandinganLengkap(query('pertandingan', { tahun_akademik: tahun })),
    guru_tanpa_unit: Object.keys(guruNama).filter(function (id) { return !adaUnit[id]; }).length,
    jumlah_guru: Object.keys(guruNama).length,
    tahun_unit_sebelum: query('unit_kokurikulum', { tahun_akademik: String(+tahun - 1) }).length,
    ref: Object.assign({ guru: query('guru', { aktif: true }, { orderBy: 'nama_penuh' }).map(_pilih(['id', 'nama_penuh', 'guru_kod'])) }, _kokuRef())
  };
}

function aksiUnitSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = { nama: pStr(params, 'nama', { label: 'Nama unit', min: 2, max: 120 }), jenis: pStr(params, 'jenis', { label: 'Jenis', max: 30 }) };
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Unit');
    if (!getById('unit_kokurikulum', id)) throw new AppError('TIDAK_JUMPA', 'Unit tidak dijumpai.');
    hasil = update('unit_kokurikulum', id, row, { actorId: ctx.akaunId });
  } else {
    row.tahun_akademik = tahun;
    hasil = insert('unit_kokurikulum', row, { actorId: ctx.akaunId });
  }
  logAudit(ctx.akaunId, 'UNIT_SIMPAN', row.nama, tahun);
  return _pilih(['id', 'nama', 'jenis', 'tahun_akademik'])(hasil);
}

function aksiUnitPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Unit');
  if (!getById('unit_kokurikulum', id)) throw new AppError('TIDAK_JUMPA', 'Unit tidak dijumpai.');
  if (query('keahlian_unit', { unit_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Unit ini masih ada ahli. Buang ahli dahulu.');
  if (query('pertandingan', { unit_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Unit ini dirujuk oleh rekod pertandingan.');
  remove('unit_kokurikulum', id);
  return { dipadam: true };
}

/** Salin senarai unit (tanpa ahli) dari tahun lepas ke tahun ini. Unit yang sudah ada dilangkau. */
function aksiUnitSalin(ctx, params) {
  var tahun = _tahunParam(params);
  var dari = String(+tahun - 1);
  var ada = {};
  query('unit_kokurikulum', { tahun_akademik: tahun }).forEach(function (u) { ada[u.nama.toLowerCase()] = true; });
  var baru = query('unit_kokurikulum', { tahun_akademik: dari }).filter(function (u) { return !ada[u.nama.toLowerCase()]; })
    .map(function (u) { return { nama: u.nama, jenis: u.jenis, tahun_akademik: tahun }; });
  if (baru.length) insertMany('unit_kokurikulum', baru, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'UNIT_SALIN', dari + ' -> ' + tahun, baru.length + ' unit');
  return { disalin: baru.length };
}

function aksiRumahSimpan(ctx, params) {
  var id = pUuid(params, 'id', 'Rumah');
  if (!getById('rumah_sukan', id)) throw new AppError('TIDAK_JUMPA', 'Rumah sukan tidak dijumpai.');
  var warna = pStr(params, 'warna', { label: 'Warna', max: 7, re: /^#[0-9a-fA-F]{6}$/, reMsg: 'Warna mesti kod seperti #d9534f.' });
  var hasil = update('rumah_sukan', id, { nama: pStr(params, 'nama', { label: 'Nama', min: 2, max: 60 }), warna: warna }, { actorId: ctx.akaunId });
  return _pilih(['id', 'nama', 'warna'])(hasil);
}

/** Ganti keputusan juara rumah sukan bagi satu tahun. keputusan: [{ rumah_sukan_id, kedudukan, catatan }] */
function aksiJuaraSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var list = params.keputusan;
  if (!Array.isArray(list) || list.length > 4) throw new AppError('VALIDASI', 'Keputusan tidak sah.');
  var rows = list.filter(function (k) { return k && k.rumah_sukan_id; }).map(function (k) {
    return { tahun_akademik: tahun, rumah_sukan_id: k.rumah_sukan_id, kedudukan: k.kedudukan, catatan: k.catatan || null };
  });
  replaceWhere('juara_rumah_sukan', { tahun_akademik: tahun }, rows, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'JUARA_SIMPAN', tahun, rows.length + ' kedudukan');
  return { disimpan: rows.length };
}

/** Import sejarah juara (CSV). Tahun yang ada dalam fail DIGANTI. */
function aksiJuaraImport(ctx, params) {
  var teks = pStr(params, 'teks', { label: 'Data juara', max: 20000 });
  var r = bacaTeksJuara(teks, _rumahSemua());
  if (r.ralat.length) throw new AppError('VALIDASI', r.ralat.slice(0, 5).join('; ') + (r.ralat.length > 5 ? ' ...' : ''));
  if (!r.baris.length) throw new AppError('VALIDASI', 'Tiada baris data.');
  var tahun = Object.keys(r.baris.reduce(function (a, b) { a[b.tahun_akademik] = 1; return a; }, {}));
  replaceWhere('juara_rumah_sukan', { tahun_akademik: tahun }, r.baris, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'JUARA_IMPORT', tahun.join(','), r.baris.length + ' baris');
  return { tahun: tahun.length, baris: r.baris.length };
}

// ---------------------------------------------------------------------------
// Data awal (dipanggil oleh setupTemplate)
// ---------------------------------------------------------------------------

function _seedKoku() {
  var out = [];
  var adaRumah = {};
  query('rumah_sukan', {}).forEach(function (r) { adaRumah[r.nama.toLowerCase()] = true; });
  var rumahBaru = RUMAH_LALAI.filter(function (r) { return !adaRumah[r[0].toLowerCase()]; }).map(function (r) { return { nama: r[0], warna: r[2] }; });
  if (rumahBaru.length) insertMany('rumah_sukan', rumahBaru, { actorId: 'setup' });
  out.push('Rumah sukan ditambah: ' + rumahBaru.length);
  var tahun = tahunSemasa();
  var adaUnit = {};
  query('unit_kokurikulum', { tahun_akademik: tahun }).forEach(function (u) { adaUnit[u.nama.toLowerCase()] = true; });
  var unitBaru = SYABAB_LALAI.filter(function (n) { return !adaUnit[n.toLowerCase()]; }).map(function (n) { return { nama: n, jenis: 'badan_beruniform', tahun_akademik: tahun }; });
  if (unitBaru.length) insertMany('unit_kokurikulum', unitBaru, { actorId: 'setup' });
  out.push('Unit Syabab ' + tahun + ' ditambah: ' + unitBaru.length);
  return out.join('; ');
}
