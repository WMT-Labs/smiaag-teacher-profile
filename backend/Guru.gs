/**
 * Guru.gs — profil teras guru (Fasa 2).
 *
 * Peraturan akses (disemak di server, bukan di pelayar):
 *  - Guru hanya boleh membaca dan mengubah rekod dengan guru_id miliknya.
 *  - Pentadbir dan superadmin boleh membaca dan mengubah profil mana-mana guru.
 *  - Nombor telefon: guru (termasuk pemiliknya) menerima versi bertutup. Pentadbir menerima
 *    nombor penuh, dan setiap bacaan direkod dalam audit_log.
 *  - Cerapan boleh dikemas kini oleh guru sendiri, atau oleh pentadbir (GK, PK, Pengetua) bagi pihak guru.
 *  - Status "percubaan": tamat 6 bulan selepas tarikh lantikan. Pengesahan ke guru tetap dibuat oleh pentadbir.
 *  - Perubahan oleh guru terus disimpan (keputusan pemilik). Sunting oleh pentadbir ke atas
 *    profil guru lain direkod dalam audit_log.
 */

function _isAdmin(ctx) { return ctx.role === 'pentadbir' || ctx.role === 'superadmin'; }

/**
 * Tentukan guru sasaran. Tiada guru_id atau guru_id sendiri = diri sendiri.
 * guru_id lain hanya untuk pentadbir/superadmin.
 */
function _sasaranGuru(ctx, guruId) {
  if (guruId === undefined || guruId === null || guruId === '' || guruId === ctx.guruId) return ctx.guru;
  if (typeof guruId !== 'string' || !UUID_RE.test(guruId)) throw new AppError('VALIDASI', 'Guru tidak sah.');
  if (!_isAdmin(ctx)) throw new AppError('TIADA_KEBENARAN', 'Anda hanya boleh mengakses profil anda sendiri.');
  var g = getById('guru', guruId);
  if (!g) throw new AppError('TIDAK_JUMPA', 'Guru tidak dijumpai.');
  return g;
}

function _auditJikaOrangLain(ctx, guru, tindakan, butiran) {
  if (guru.id !== ctx.guruId) logAudit(ctx.akaunId, tindakan, guru.guru_kod, butiran);
}

/** Bentuk data guru yang selamat dihantar ke pelayar. */
function _guruUntukPelayar(ctx, guru) {
  var admin = _isAdmin(ctx);
  var out = {
    id: guru.id, guru_kod: guru.guru_kod, nama_penuh: guru.nama_penuh, status_lantikan: guru.status_lantikan,
    jawatan: guru.jawatan, tarikh_lantikan: guru.tarikh_lantikan, tarikh_disahkan: guru.tarikh_disahkan, aktif: guru.aktif,
    ada_telefon: !!guru.no_telefon,
    no_telefon: guru.no_telefon ? (admin ? formatPhone(guru.no_telefon) : maskPhone(guru.no_telefon)) : null,
    telefon_penuh: admin,
    updated_at: guru.updated_at
  };
  if (admin && guru.no_telefon) logAudit(ctx.akaunId, 'BACA_TELEFON_PENUH', guru.guru_kod);
  return out;
}

function _refSenarai(nama) {
  return query(nama, { aktif: true }, { orderBy: 'susunan' }).map(function (r) { return { kod: r.kod, label: r.label }; });
}

function _subjekSenarai() {
  return query('subjek', {}, { orderBy: 'nama' }).map(function (s) { return { id: s.id, nama: s.nama, kod: s.kod, kategori: s.kategori }; });
}

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

function aksiProfilLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = tahunSemasa();
  var subjek = _subjekSenarai();
  var subjekById = {};
  subjek.forEach(function (s) { subjekById[s.id] = s; });

  var opsyen = query('opsyen_guru', { guru_id: guru.id }).map(function (o) {
    var s = subjekById[o.subjek_id] || {};
    return { id: o.id, jenis: o.jenis, subjek_id: o.subjek_id, subjek_nama: s.nama || '(subjek dipadam)' };
  });
  var cerapan = query('cerapan', { guru_id: guru.id }, { orderBy: 'tahun_akademik', desc: true }).map(function (c) {
    return { id: c.id, tahun_akademik: c.tahun_akademik, bilangan_dicerap: c.bilangan_dicerap, pencerap: c.pencerap, catatan: c.catatan };
  });
  var semasa = cerapan.filter(function (c) { return c.tahun_akademik === tahun; })[0] || null;

  return {
    guru: _guruUntukPelayar(ctx, guru),
    milik_sendiri: guru.id === ctx.guruId,
    boleh: { sunting: true, cerapan: true, sahkan_percubaan: _isAdmin(ctx) },
    percubaan: statusPercubaan(guru, hariIni()),
    kelayakan: query('kelayakan', { guru_id: guru.id }, { orderBy: 'tahun_tamat', desc: true }).map(_pilih(['id', 'tahap', 'bidang', 'institusi', 'tahun_tamat'])),
    opsyen: opsyen,
    kursus: query('kursus', { guru_id: guru.id }, { orderBy: 'tarikh_mula', desc: true }).map(_pilih(['id', 'tajuk', 'penganjur', 'tarikh_mula', 'tarikh_tamat', 'jam', 'tahap'])),
    cerapan: { tahun: tahun, semasa: semasa, sejarah: cerapan },
    ref: {
      status_lantikan: _refSenarai('ref_status_lantikan'),
      tahap_kelayakan: _refSenarai('ref_tahap_kelayakan'),
      jenis_opsyen: _refSenarai('ref_jenis_opsyen'),
      peringkat_kursus: _refSenarai('ref_peringkat_kursus'),
      subjek: subjek
    }
  };
}

function _pilih(cols) {
  return function (row) { var o = {}; cols.forEach(function (c) { o[c] = row[c]; }); return o; };
}

function aksiProfilSimpanTeras(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var patch = {
    nama_penuh: pStr(params, 'nama_penuh', { label: 'Nama penuh', min: 3, max: 150 }),
    status_lantikan: pStr(params, 'status_lantikan', { label: 'Status lantikan', max: 30 }),
    jawatan: pStr(params, 'jawatan', { label: 'Jawatan', max: 100, optional: true }),
    tarikh_lantikan: pStr(params, 'tarikh_lantikan', { label: 'Tarikh lantikan', max: 10, optional: true })
  };
  if (patch.tarikh_lantikan && patch.tarikh_lantikan > hariIni()) {
    throw new AppError('VALIDASI', 'Tarikh lantikan tidak boleh pada masa depan.', { field: 'tarikh_lantikan' });
  }
  if (guru.status_lantikan === 'percubaan' && patch.status_lantikan === 'tetap') {
    if (!_isAdmin(ctx)) {
      throw new AppError('VALIDASI', 'Pengesahan ke guru tetap dibuat oleh pentadbir selepas tempoh percubaan 6 bulan.', { field: 'status_lantikan' });
    }
    patch.tarikh_disahkan = hariIni();
  }
  if (params.padam_telefon === true) {
    patch.no_telefon = null;
  } else if (params.no_telefon_baru !== undefined && params.no_telefon_baru !== null && String(params.no_telefon_baru).trim() !== '') {
    var tel = normalizePhone(String(params.no_telefon_baru));
    if (!tel) throw new AppError('VALIDASI', 'Nombor telefon tidak sah. Contoh: 012-3456789.', { field: 'no_telefon_baru' });
    patch.no_telefon = tel;
  }
  var baru = update('guru', guru.id, patch, { actorId: ctx.akaunId });
  _auditJikaOrangLain(ctx, guru, 'SUNTING_PROFIL_GURU', 'maklumat teras');
  return _guruUntukPelayar(ctx, baru);
}

// ---------------------------------------------------------------------------
// Rekod anak: kelayakan, kursus, opsyen_guru
// ---------------------------------------------------------------------------

/** Lajur yang boleh diisi oleh pengguna bagi setiap jadual. guru_id SENTIASA ditentukan oleh server. */
var REKOD_GURU = {
  kelayakan: ['tahap', 'bidang', 'institusi', 'tahun_tamat'],
  tugasan_guru: ['tahun_akademik', 'jenis_tugasan', 'kumpulan', 'nama_tugasan', 'subjek_id', 'bilangan_kelas', 'jabatan', 'jam_kredit'],
  kursus: ['tajuk', 'penganjur', 'tarikh_mula', 'tarikh_tamat', 'jam', 'tahap'],
  opsyen_guru: ['jenis', 'subjek_id']
};

function _jadualRekod(params) {
  var j = params.jadual;
  if (typeof j !== 'string' || !Object.prototype.hasOwnProperty.call(REKOD_GURU, j)) throw new AppError('VALIDASI', 'Jenis rekod tidak sah.');
  return j;
}

function _dataRekod(jadual, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AppError('VALIDASI', 'Data tidak sah.');
  var out = {};
  Object.keys(data).forEach(function (k) {
    if (REKOD_GURU[jadual].indexOf(k) === -1) throw new AppError('VALIDASI', 'Medan "' + k + '" tidak dibenarkan.', { field: k });
    out[k] = data[k];
  });
  return out;
}

function _semakRekod(jadual, row) {
  if (jadual === 'tugasan_guru') {
    if (row.jenis_tugasan === 'tidak_berjadual') {
      if (row.kumpulan !== 'tugasan_tidak_berjadual') throw new AppError('VALIDASI', 'Tugasan tidak berjadual mesti dalam kumpulan "Tugasan tidak berjadual".', { field: 'kumpulan' });
      if (!row.jabatan) throw new AppError('VALIDASI', 'Pilih jabatan untuk tugasan tidak berjadual.', { field: 'jabatan' });
    } else if (row.kumpulan === 'tugasan_tidak_berjadual') {
      throw new AppError('VALIDASI', 'Kumpulan ini hanya untuk tugasan tidak berjadual.', { field: 'kumpulan' });
    }
  }
  if (jadual === 'kursus' && row.tarikh_mula && row.tarikh_tamat && row.tarikh_tamat < row.tarikh_mula) {
    throw new AppError('VALIDASI', 'Tarikh tamat tidak boleh sebelum tarikh mula.', { field: 'tarikh_tamat' });
  }
  if (jadual === 'kelayakan' && row.tahun_tamat && (+row.tahun_tamat < 1950 || +row.tahun_tamat > +tahunSemasa() + 1)) {
    throw new AppError('VALIDASI', 'Tahun tamat tidak munasabah.', { field: 'tahun_tamat' });
  }
}

/** Tugasan guru diisi oleh pentadbir sahaja (keputusan pemilik): guru tidak perlu mengisi satu persatu. */
function _semakPenulisTugasan(ctx, jadual) {
  if (jadual === 'tugasan_guru' && !_isAdmin(ctx)) throw new AppError('TIADA_KEBENARAN', 'Tugasan diisi oleh pentadbir. Hubungi pentadbir jika ada pembetulan.');
}

function aksiRekodSimpan(ctx, params) {
  var jadual = _jadualRekod(params);
  _semakPenulisTugasan(ctx, jadual);
  var data = _dataRekod(jadual, params.data);
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Rekod');
    var lama = getById(jadual, id);
    if (!lama) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
    var guru = _sasaranGuru(ctx, lama.guru_id); // semakan pemilikan rekod sedia ada
    var gabung = {};
    Object.keys(lama).forEach(function (k) { gabung[k] = lama[k]; });
    Object.keys(data).forEach(function (k) { gabung[k] = data[k]; });
    _semakRekod(jadual, gabung);
    hasil = update(jadual, id, data, { actorId: ctx.akaunId });
    _auditJikaOrangLain(ctx, guru, 'SUNTING_PROFIL_GURU', jadual + ' dikemas kini');
  } else {
    var g = _sasaranGuru(ctx, params.guru_id);
    if (query(jadual, { guru_id: g.id }).length >= 200) throw new AppError('VALIDASI', 'Had bilangan rekod dicapai.');
    data.guru_id = g.id;
    _semakRekod(jadual, data);
    hasil = insert(jadual, data, { actorId: ctx.akaunId });
    _auditJikaOrangLain(ctx, g, 'SUNTING_PROFIL_GURU', jadual + ' ditambah');
  }
  var out = _pilih(['id'].concat(REKOD_GURU[jadual]))(hasil);
  if (jadual === 'opsyen_guru') { var s = getById('subjek', out.subjek_id); out.subjek_nama = s ? s.nama : ''; }
  return out;
}

function aksiRekodPadam(ctx, params) {
  var jadual = _jadualRekod(params);
  _semakPenulisTugasan(ctx, jadual);
  var id = pUuid(params, 'id', 'Rekod');
  var lama = getById(jadual, id);
  if (!lama) throw new AppError('TIDAK_JUMPA', 'Rekod tidak dijumpai.');
  var guru = _sasaranGuru(ctx, lama.guru_id);
  remove(jadual, id, { actorId: ctx.akaunId });
  _auditJikaOrangLain(ctx, guru, 'SUNTING_PROFIL_GURU', jadual + ' dipadam');
  return { dipadam: true };
}

// ---------------------------------------------------------------------------
// Tempoh percubaan
// ---------------------------------------------------------------------------

var BULAN_PERCUBAAN = 6;

/** Tarikh hari ini (ISO) dalam zon Malaysia. */
function hariIni() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

/** "2026-01-31" + 6 bulan -> "2026-07-31"; "2026-08-31" -> "2027-02-28" (hari dihadkan kepada hujung bulan). */
function tarikhTamatPercubaan(tarikhLantikan) {
  if (!tarikhLantikan || !isIsoDate(tarikhLantikan)) return null;
  var y = +tarikhLantikan.slice(0, 4), m = +tarikhLantikan.slice(5, 7) + BULAN_PERCUBAAN, d = +tarikhLantikan.slice(8, 10);
  y += Math.floor((m - 1) / 12);
  m = ((m - 1) % 12) + 1;
  var akhirBulan = new Date(Date.UTC(y, m, 0)).getUTCDate();
  d = Math.min(d, akhirBulan);
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}

/** null jika bukan percubaan; jika ya { tarikh_tamat, tamat, perlu_tarikh_lantikan }. */
function statusPercubaan(guru, hari) {
  if (!guru || guru.status_lantikan !== 'percubaan') return null;
  var tamat = tarikhTamatPercubaan(guru.tarikh_lantikan);
  return { tarikh_tamat: tamat, tamat: !!tamat && hari >= tamat, perlu_tarikh_lantikan: !tamat };
}

function aksiPercubaanSahkan(ctx, params) {
  var guru = _sasaranGuru(ctx, pUuid(params, 'guru_id', 'Guru'));
  if (guru.status_lantikan !== 'percubaan') throw new AppError('VALIDASI', 'Guru ini bukan dalam tempoh percubaan.');
  var baru = update('guru', guru.id, { status_lantikan: 'tetap', tarikh_disahkan: hariIni() }, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'SAHKAN_GURU_TETAP', guru.guru_kod, 'tamat percubaan: ' + (tarikhTamatPercubaan(guru.tarikh_lantikan) || '-'));
  return _guruUntukPelayar(ctx, baru);
}

// ---------------------------------------------------------------------------
// Cerapan: guru sendiri, atau pentadbir (GK, PK, Pengetua) bagi pihak guru
// ---------------------------------------------------------------------------

function aksiCerapanSimpan(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = pStr(params, 'tahun_akademik', { label: 'Tahun', max: 4, re: /^\d{4}$/ });
  var row = {
    bilangan_dicerap: params.bilangan_dicerap,
    pencerap: pStr(params, 'pencerap', { label: 'Pencerap', max: 200, optional: true }),
    catatan: pStr(params, 'catatan', { label: 'Catatan', max: 1000, optional: true })
  };
  var ada = query('cerapan', { guru_id: guru.id, tahun_akademik: tahun })[0];
  var hasil = ada
    ? update('cerapan', ada.id, row, { actorId: ctx.akaunId })
    : insert('cerapan', { guru_id: guru.id, tahun_akademik: tahun, bilangan_dicerap: row.bilangan_dicerap, pencerap: row.pencerap, catatan: row.catatan }, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'CERAPAN_SIMPAN', guru.guru_kod, tahun + ': ' + hasil.bilangan_dicerap + ' kali' + (guru.id !== ctx.guruId ? ' (bagi pihak guru)' : ''));
  return _pilih(['id', 'tahun_akademik', 'bilangan_dicerap', 'pencerap', 'catatan'])(hasil);
}

// ---------------------------------------------------------------------------
// Senarai guru (pentadbir) dan subjek
// ---------------------------------------------------------------------------

function aksiGuruSenarai(ctx) {
  var tahun = tahunSemasa(), hari = hariIni();
  var cerap = {};
  query('cerapan', { tahun_akademik: tahun }).forEach(function (c) { cerap[c.guru_id] = c.bilangan_dicerap; });
  var tugasan = {};
  query('tugasan_guru', { tahun_akademik: tahun }).forEach(function (t) { (tugasan[t.guru_id] = tugasan[t.guru_id] || []).push(t); });
  var had = hadJamKredit(tahun);
  return {
    tahun: tahun,
    had: had,
    guru: query('guru', {}, { orderBy: 'nama_penuh' }).map(function (g) {
      var jam = kiraJamKredit(tugasan[g.id] || []);
      return {
        id: g.id, guru_kod: g.guru_kod, nama_penuh: g.nama_penuh, jawatan: g.jawatan, status_lantikan: g.status_lantikan,
        aktif: g.aktif, cerapan_tahun_ini: cerap[g.id] || 0, percubaan: statusPercubaan(g, hari),
        jam_berjadual: jam.berjadual, jam_tidak_berjadual: jam.tidak_berjadual,
        status_beban: statusBebanKeseluruhan(jam, had)
      };
    }),
    ref: { status_lantikan: _refSenarai('ref_status_lantikan') }
  };
}

function aksiSubjekSenarai() {
  return { subjek: _subjekSenarai(), kategori: _refSenarai('ref_kategori_subjek') };
}

function aksiSubjekSimpan(ctx, params) {
  var row = {
    nama: pStr(params, 'nama', { label: 'Nama subjek', min: 2, max: 120 }),
    kod: pStr(params, 'kod', { label: 'Kod', max: 20, optional: true }),
    kategori: pStr(params, 'kategori', { label: 'Kategori', max: 40 })
  };
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Subjek');
    if (!getById('subjek', id)) throw new AppError('TIDAK_JUMPA', 'Subjek tidak dijumpai.');
    hasil = update('subjek', id, row, { actorId: ctx.akaunId });
  } else {
    hasil = insert('subjek', row, { actorId: ctx.akaunId });
  }
  logAudit(ctx.akaunId, 'SUBJEK_SIMPAN', row.nama);
  return _pilih(['id', 'nama', 'kod', 'kategori'])(hasil);
}
