/**
 * Hem.gs — Hal Ehwal Murid (Fasa 5).
 *
 *  - Usrah Murabbi Pelajar (kumpulan_usrah_pelajar): guru isi kumpulan pelajar yang dibawa.
 *  - Peranan HEM (peranan_hem): Guru Tarbiah, Guru Kelas, Bidang Disiplin. BERASINGAN daripada usrah pelajar
 *    kerana jam kredit dan sifatnya berbeza dalam surat tugasan.
 *  - Usrah Guru: pentadbir tetapkan kumpulan, murabbi dan ahli. MURABBI kumpulan itu sahaja yang
 *    merekod sesi dan kehadiran. Sesi direkod mengikut tarikh ia dijalankan (bukan semestinya mingguan).
 *    Ahli melihat kehadiran sendiri; pentadbir melihat semua.
 */

// ---------------------------------------------------------------------------
// Fungsi tulen
// ---------------------------------------------------------------------------

/**
 * Ringkasan kehadiran seorang guru.
 * sesi: [{ id }], kehadiran: [{ sesi_id, guru_id, hadir }] -> { hadir, jumlah, peratus }
 * Sesi tanpa rekod kehadiran guru itu dikira tidak hadir.
 */
function kiraKehadiran(sesi, kehadiran, guruId) {
  var ada = {};
  kehadiran.forEach(function (k) { if (k.guru_id === guruId && k.hadir) ada[k.sesi_id] = true; });
  var hadir = sesi.filter(function (s) { return ada[s.id]; }).length;
  return { hadir: hadir, jumlah: sesi.length, peratus: sesi.length ? Math.round(hadir / sesi.length * 100) : null };
}

// ---------------------------------------------------------------------------
// Bantuan
// ---------------------------------------------------------------------------

function _guruNamaMap() {
  var o = {};
  query('guru', {}).forEach(function (g) { o[g.id] = g.nama_penuh; });
  return o;
}

/** Data lengkap satu kumpulan usrah guru: ahli, sesi, kehadiran. */
function _usrahLengkap(u, guruNama) {
  var ahli = query('keahlian_usrah_guru', { usrah_guru_id: u.id }).map(function (a) { return { id: a.id, guru_id: a.guru_id, nama: guruNama[a.guru_id] || '?' }; })
    .sort(function (a, b) { return a.nama < b.nama ? -1 : 1; });
  var sesi = query('sesi_usrah_guru', { usrah_guru_id: u.id }, { orderBy: 'tarikh', desc: true }).map(_pilih(['id', 'tarikh', 'tajuk', 'catatan']));
  var idSesi = sesi.map(function (s) { return s.id; });
  var kehadiran = idSesi.length ? query('kehadiran_usrah_guru', { sesi_id: idSesi }).map(_pilih(['id', 'sesi_id', 'guru_id', 'hadir', 'catatan'])) : [];
  ahli.forEach(function (a) { a.kehadiran = kiraKehadiran(sesi, kehadiran, a.guru_id); });
  var hadirSemua = ahli.reduce(function (t, a) { return t + a.kehadiran.hadir; }, 0);
  var bolehSemua = ahli.length * sesi.length;
  return {
    id: u.id, nama_kumpulan: u.nama_kumpulan, hari: u.hari, tahun_akademik: u.tahun_akademik,
    murabbi_guru_id: u.murabbi_guru_id, murabbi: guruNama[u.murabbi_guru_id] || '?',
    ahli: ahli, sesi: sesi, kehadiran: kehadiran,
    peratus_kumpulan: bolehSemua ? Math.round(hadirSemua / bolehSemua * 100) : null
  };
}

function _usrahDanAkses(ctx, usrahId, tulis) {
  var u = getById('usrah_guru', usrahId);
  if (!u) throw new AppError('TIDAK_JUMPA', 'Kumpulan usrah tidak dijumpai.');
  var murabbi = u.murabbi_guru_id === ctx.guruId;
  if (tulis && !murabbi) throw new AppError('TIADA_KEBENARAN', 'Hanya murabbi kumpulan ini boleh merekod sesi dan kehadiran.');
  if (!tulis && !murabbi && !_isAdmin(ctx) && !query('keahlian_usrah_guru', { usrah_guru_id: usrahId, guru_id: ctx.guruId }).length) {
    throw new AppError('TIADA_KEBENARAN', 'Anda bukan ahli kumpulan ini.');
  }
  return u;
}

// ---------------------------------------------------------------------------
// Aksi: paparan guru
// ---------------------------------------------------------------------------

function aksiHemLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = _tahunParam(params);
  var kelas = query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'tingkatan']));
  var kelasNama = {}; kelas.forEach(function (k) { kelasNama[k.id] = k.nama; });
  var guruNama = _guruNamaMap();

  var usrahTahun = query('usrah_guru', { tahun_akademik: tahun });
  var keahlian = query('keahlian_usrah_guru', { guru_id: guru.id });
  var ahliDalam = usrahTahun.filter(function (u) { return keahlian.some(function (k) { return k.usrah_guru_id === u.id; }); })[0] || null;
  var kumpulanSaya = null;
  if (ahliDalam) {
    var L = _usrahLengkap(ahliDalam, guruNama);
    var mine = L.ahli.filter(function (a) { return a.guru_id === guru.id; })[0];
    var hadirSesi = {};
    L.kehadiran.forEach(function (k) { if (k.guru_id === guru.id) hadirSesi[k.sesi_id] = k; });
    kumpulanSaya = {
      id: L.id, nama_kumpulan: L.nama_kumpulan, hari: L.hari, murabbi: L.murabbi,
      bilangan_ahli: L.ahli.length, kehadiran: mine ? mine.kehadiran : null,
      sesi: L.sesi.map(function (s) { var k = hadirSesi[s.id]; return { tarikh: s.tarikh, tajuk: s.tajuk, hadir: k ? k.hadir : false, catatan: k ? k.catatan : null }; })
    };
  }
  var dibimbing = usrahTahun.filter(function (u) { return u.murabbi_guru_id === guru.id; }).map(function (u) {
    var L = _usrahLengkap(u, guruNama);
    return { id: L.id, nama_kumpulan: L.nama_kumpulan, hari: L.hari, bilangan_ahli: L.ahli.length, bilangan_sesi: L.sesi.length,
      sesi_terakhir: L.sesi[0] ? L.sesi[0].tarikh : null, peratus_kumpulan: L.peratus_kumpulan };
  });

  return {
    guru: { id: guru.id, nama_penuh: guru.nama_penuh, guru_kod: guru.guru_kod },
    milik_sendiri: guru.id === ctx.guruId,
    tahun: tahun,
    usrah_pelajar: query('kumpulan_usrah_pelajar', { guru_id: guru.id, tahun_akademik: tahun }, { orderBy: 'nama_kumpulan' })
      .map(_pilih(['id', 'nama_kumpulan', 'tingkatan', 'hari', 'bilangan_murid'])),
    peranan: query('peranan_hem', { guru_id: guru.id, tahun_akademik: tahun }).map(function (p) {
      var o = _pilih(['id', 'jenis', 'kelas_id', 'butiran'])(p);
      o.kelas_nama = p.kelas_id ? kelasNama[p.kelas_id] || '?' : null;
      return o;
    }),
    usrah_guru: kumpulanSaya,
    usrah_dibimbing: dibimbing,
    ref: { kelas: kelas, hari: _refSenarai('ref_hari'), jenis_peranan: _refSenarai('ref_jenis_peranan_hem') }
  };
}

// ---------------------------------------------------------------------------
// Aksi: sesi dan kehadiran (murabbi)
// ---------------------------------------------------------------------------

function aksiUsrahSesiLihat(ctx, params) {
  var u = _usrahDanAkses(ctx, pUuid(params, 'usrah_guru_id', 'Kumpulan'), false);
  var L = _usrahLengkap(u, _guruNamaMap());
  L.boleh_rekod = u.murabbi_guru_id === ctx.guruId;
  if (!L.boleh_rekod && !_isAdmin(ctx)) {
    // Ahli biasa: hanya kehadiran sendiri
    L.kehadiran = L.kehadiran.filter(function (k) { return k.guru_id === ctx.guruId; });
    L.ahli = L.ahli.filter(function (a) { return a.guru_id === ctx.guruId; });
  }
  return L;
}

/**
 * Simpan satu sesi dan kehadirannya (murabbi sahaja).
 * params: { usrah_guru_id, id?, tarikh, tajuk?, catatan?, kehadiran: [{ guru_id, hadir, catatan? }] }
 */
function aksiUsrahSesiSimpan(ctx, params) {
  var u = _usrahDanAkses(ctx, pUuid(params, 'usrah_guru_id', 'Kumpulan'), true);
  var tarikh = pStr(params, 'tarikh', { label: 'Tarikh', max: 10 });
  if (!isIsoDate(tarikh)) throw new AppError('VALIDASI', 'Tarikh tidak sah.', { field: 'tarikh' });
  if (tarikh > hariIni()) throw new AppError('VALIDASI', 'Tarikh sesi tidak boleh pada masa depan.', { field: 'tarikh' });
  if (tarikh.slice(0, 4) !== u.tahun_akademik) throw new AppError('VALIDASI', 'Tarikh mesti dalam tahun ' + u.tahun_akademik + '.', { field: 'tarikh' });
  var row = { tarikh: tarikh, tajuk: pStr(params, 'tajuk', { label: 'Tajuk', max: 200, optional: true }), catatan: pStr(params, 'catatan', { label: 'Catatan', max: 1000, optional: true }) };

  var ahli = {};
  query('keahlian_usrah_guru', { usrah_guru_id: u.id }).forEach(function (a) { ahli[a.guru_id] = true; });
  var list = params.kehadiran;
  if (!Array.isArray(list)) throw new AppError('VALIDASI', 'Senarai kehadiran tidak sah.');
  var dilihat = {};
  list.forEach(function (k) {
    if (!k || !ahli[k.guru_id]) throw new AppError('VALIDASI', 'Kehadiran hanya untuk ahli kumpulan ini.');
    if (dilihat[k.guru_id]) throw new AppError('VALIDASI', 'Ahli berulang dalam senarai kehadiran.');
    if (k.hadir !== true && k.hadir !== false) throw new AppError('VALIDASI', 'Status hadir mesti ya atau tidak.');
    dilihat[k.guru_id] = true;
  });

  var sesi;
  if (params.id) {
    var id = pUuid(params, 'id', 'Sesi');
    var lama = getById('sesi_usrah_guru', id);
    if (!lama || lama.usrah_guru_id !== u.id) throw new AppError('TIDAK_JUMPA', 'Sesi tidak dijumpai.');
    try { sesi = update('sesi_usrah_guru', id, row, { actorId: ctx.akaunId }); }
    catch (e) {
      if (e && e.code === 'DUPLIKAT') throw new AppError('DUPLIKAT', 'Sudah ada sesi lain pada tarikh ' + tarikh.split('-').reverse().join('/') + '.', { field: 'tarikh' });
      throw e;
    }
  } else {
    row.usrah_guru_id = u.id;
    try { sesi = insert('sesi_usrah_guru', row, { actorId: ctx.akaunId }); }
    catch (e) {
      if (e && e.code === 'DUPLIKAT') throw new AppError('DUPLIKAT', 'Sesi pada ' + tarikh.split('-').reverse().join('/') + ' sudah direkod. Tekan tarikh itu dalam jadual kehadiran untuk menyuntingnya.', { field: 'tarikh' });
      throw e;
    }
  }
  var baris = list.map(function (k) { return { sesi_id: sesi.id, guru_id: k.guru_id, hadir: k.hadir, catatan: k.catatan ? String(k.catatan).slice(0, 200) : null }; });
  replaceWhere('kehadiran_usrah_guru', { sesi_id: sesi.id }, baris, { actorId: ctx.akaunId, skipFk: true });
  logAudit(ctx.akaunId, 'USRAH_SESI_SIMPAN', u.nama_kumpulan, tarikh + ': ' + baris.filter(function (b) { return b.hadir; }).length + '/' + baris.length + ' hadir');
  return { id: sesi.id, hadir: baris.filter(function (b) { return b.hadir; }).length, jumlah: baris.length };
}

function aksiUsrahSesiPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Sesi');
  var s = getById('sesi_usrah_guru', id);
  if (!s) throw new AppError('TIDAK_JUMPA', 'Sesi tidak dijumpai.');
  _usrahDanAkses(ctx, s.usrah_guru_id, true);
  removeWhere('kehadiran_usrah_guru', { sesi_id: id });
  remove('sesi_usrah_guru', id);
  return { dipadam: true };
}

// ---------------------------------------------------------------------------
// Aksi: urus (pentadbir)
// ---------------------------------------------------------------------------

function aksiHemUrus(ctx, params) {
  var tahun = _tahunParam(params);
  var guruNama = _guruNamaMap();
  var guruAktif = senaraiGuruMengajar().map(_pilih(['id', 'nama_penuh', 'guru_kod']));
  var usrah = query('usrah_guru', { tahun_akademik: tahun }, { orderBy: 'nama_kumpulan' }).map(function (u) {
    var L = _usrahLengkap(u, guruNama);
    delete L.kehadiran;
    L.sesi_terakhir = L.sesi[0] ? L.sesi[0].tarikh : null;
    L.bilangan_sesi = L.sesi.length;
    delete L.sesi;
    return L;
  });
  var berkumpulan = {};
  usrah.forEach(function (u) { berkumpulan[u.murabbi_guru_id] = true; u.ahli.forEach(function (a) { berkumpulan[a.guru_id] = true; }); });
  var kelas = query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' });
  var kelasNama = {}; kelas.forEach(function (k) { kelasNama[k.id] = k.nama; });
  var peranan = query('peranan_hem', { tahun_akademik: tahun }).map(function (p) {
    return { id: p.id, guru_id: p.guru_id, nama: guruNama[p.guru_id] || '?', jenis: p.jenis, kelas_id: p.kelas_id, kelas_nama: p.kelas_id ? kelasNama[p.kelas_id] : null, butiran: p.butiran };
  });
  var adaGuruKelas = {};
  peranan.forEach(function (p) { if (p.jenis === 'guru_kelas' && p.kelas_id) adaGuruKelas[p.kelas_id] = true; });
  var pelajar = query('kumpulan_usrah_pelajar', { tahun_akademik: tahun });
  return {
    tahun: tahun,
    usrah_guru: usrah,
    guru_tanpa_usrah: guruAktif.filter(function (g) { return !berkumpulan[g.id]; }),
    peranan: peranan,
    kelas_tanpa_guru_kelas: kelas.filter(function (k) { return !adaGuruKelas[k.id]; }).map(function (k) { return k.nama; }),
    usrah_pelajar: { kumpulan: pelajar.length, murid: pelajar.reduce(function (a, p) { return a + (p.bilangan_murid || 0); }, 0),
      guru: Object.keys(pelajar.reduce(function (a, p) { a[p.guru_id] = 1; return a; }, {})).length },
    ref: { guru: guruAktif, hari: _refSenarai('ref_hari'), jenis_peranan: _refSenarai('ref_jenis_peranan_hem') }
  };
}

function aksiUsrahGuruSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = {
    nama_kumpulan: pStr(params, 'nama_kumpulan', { label: 'Nama kumpulan', min: 2, max: 100 }),
    murabbi_guru_id: pUuid(params, 'murabbi_guru_id', 'Murabbi'),
    hari: pStr(params, 'hari', { label: 'Hari', max: 20, optional: true })
  };
  var hasil;
  if (params.id) {
    var id = pUuid(params, 'id', 'Kumpulan');
    if (!getById('usrah_guru', id)) throw new AppError('TIDAK_JUMPA', 'Kumpulan tidak dijumpai.');
    if (query('keahlian_usrah_guru', { usrah_guru_id: id, guru_id: row.murabbi_guru_id }).length) throw new AppError('VALIDASI', 'Murabbi tidak boleh juga menjadi ahli kumpulan yang sama.');
    hasil = update('usrah_guru', id, row, { actorId: ctx.akaunId });
  } else {
    row.tahun_akademik = tahun;
    hasil = insert('usrah_guru', row, { actorId: ctx.akaunId });
  }
  logAudit(ctx.akaunId, 'USRAH_GURU_SIMPAN', row.nama_kumpulan, tahun);
  return _pilih(['id', 'nama_kumpulan', 'murabbi_guru_id', 'hari', 'tahun_akademik'])(hasil);
}

/** Tetapkan ahli kumpulan (ganti senarai). Seorang guru hanya boleh dalam satu kumpulan bagi setiap tahun. */
function aksiUsrahAhliSimpan(ctx, params) {
  var id = pUuid(params, 'usrah_guru_id', 'Kumpulan');
  var u = getById('usrah_guru', id);
  if (!u) throw new AppError('TIDAK_JUMPA', 'Kumpulan tidak dijumpai.');
  var ids = params.guru_ids;
  if (!Array.isArray(ids) || ids.length > 60) throw new AppError('VALIDASI', 'Senarai ahli tidak sah.');
  var lain = {};
  query('usrah_guru', { tahun_akademik: u.tahun_akademik }).forEach(function (x) {
    if (x.id === id) return;
    query('keahlian_usrah_guru', { usrah_guru_id: x.id }).forEach(function (k) { lain[k.guru_id] = x.nama_kumpulan; });
  });
  var guruNama = _guruNamaMap();
  var seen = {};
  ids.forEach(function (g) {
    if (typeof g !== 'string' || !guruNama[g]) throw new AppError('VALIDASI', 'Guru tidak dijumpai.');
    if (g === u.murabbi_guru_id) throw new AppError('VALIDASI', 'Murabbi tidak perlu disenaraikan sebagai ahli.');
    if (lain[g]) throw new AppError('VALIDASI', guruNama[g] + ' sudah dalam kumpulan ' + lain[g] + '.');
    if (seen[g]) throw new AppError('VALIDASI', 'Ahli berulang.');
    seen[g] = true;
  });
  replaceWhere('keahlian_usrah_guru', { usrah_guru_id: id }, ids.map(function (g) { return { usrah_guru_id: id, guru_id: g }; }), { actorId: ctx.akaunId, skipFk: true });
  logAudit(ctx.akaunId, 'USRAH_AHLI_SIMPAN', u.nama_kumpulan, ids.length + ' ahli');
  return { ahli: ids.length };
}

function aksiUsrahGuruPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Kumpulan');
  if (!getById('usrah_guru', id)) throw new AppError('TIDAK_JUMPA', 'Kumpulan tidak dijumpai.');
  if (query('sesi_usrah_guru', { usrah_guru_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Kumpulan ini sudah ada rekod sesi. Tidak boleh dipadam supaya sejarah kehadiran kekal.');
  removeWhere('keahlian_usrah_guru', { usrah_guru_id: id });
  remove('usrah_guru', id);
  return { dipadam: true };
}
