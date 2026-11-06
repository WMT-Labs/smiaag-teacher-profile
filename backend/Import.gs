/**
 * Import.gs — import pukal oleh pentadbir (Fasa 3).
 *
 *  1. Jadual daripada eksport aSc Timetables (XML). Fail dibaca di PELAYAR (js/asc.js), dipadankan
 *     dengan guru/subjek/kelas, dan disemak serta disunting oleh pentadbir. Hanya selepas
 *     "Sahkan dan simpan" barulah slot dihantar ke sini, dalam kumpulan kecil (beberapa guru sekali).
 *  2. Tugasan guru daripada jadual Excel/CSV (salin-tampal). Dipadankan di pelayar, disahkan di sini.
 *
 * Server tetap menyemak SETIAP baris (jenis, julat, rujukan wujud) walaupun pelayar sudah menyemak.
 */

var IMPORT_MAX_BARIS = 600; // setiap panggilan

function aksiImportRujukan(ctx, params) {
  var tahun = _tahunParam(params);
  return {
    tahun: tahun,
    guru: query('guru', { aktif: true }, { orderBy: 'nama_penuh' }).map(_pilih(['id', 'guru_kod', 'nama_penuh'])),
    subjek: _subjekSenarai(),
    kelas: query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'tingkatan'])),
    waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
    hari: _refSenarai('ref_hari'), jabatan: _refSenarai('ref_jabatan'),
    kumpulan: _refSenarai('ref_kumpulan_tugasan'), jenis_tugasan: _refSenarai('ref_jenis_tugasan'),
    had: hadJamKredit(tahun),
    jadual_sedia_ada: query('jadual_slot', { tahun_akademik: tahun }).length,
    tugasan_sedia_ada: query('tugasan_guru', { tahun_akademik: tahun }).length
  };
}

function _senaraiGuruId(params) {
  var ids = params.guru_ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100) throw new AppError('VALIDASI', 'Senarai guru tidak sah.');
  ids.forEach(function (id) { if (typeof id !== 'string' || !UUID_RE.test(id)) throw new AppError('VALIDASI', 'ID guru tidak sah.'); });
  return ids;
}

/**
 * Simpan jadual bagi sekumpulan guru. Jadual tahun itu bagi guru dalam guru_ids DIGANTI sepenuhnya.
 * params: { tahun, guru_ids: [...], slot: [{ guru_id, hari, masa_mula, masa_akhir, subjek_id?, label?, kelas_ids: [] }] }
 */
function aksiJadualImport(ctx, params) {
  var tahun = _tahunParam(params);
  var guruIds = _senaraiGuruId(params);
  var slots = params.slot;
  if (!Array.isArray(slots) || slots.length > IMPORT_MAX_BARIS) throw new AppError('VALIDASI', 'Terlalu banyak slot dalam satu kumpulan (maksimum ' + IMPORT_MAX_BARIS + ').');
  var dibenar = {}; guruIds.forEach(function (id) { dibenar[id] = true; });
  var waktu = query('waktu', { tahun_akademik: tahun });
  var kelasSah = {}; query('kelas', { tahun_akademik: tahun }).forEach(function (k) { kelasSah[k.id] = true; });

  var barisSlot = [], barisKelas = [];
  slots.forEach(function (x, i) {
    var n = 'Slot ' + (i + 1) + ': ';
    if (!x || typeof x !== 'object') throw new AppError('VALIDASI', n + 'data tidak sah.');
    if (!dibenar[x.guru_id]) throw new AppError('VALIDASI', n + 'guru tiada dalam senarai kumpulan ini.');
    if (!TIME_RE.test(x.masa_mula) || !TIME_RE.test(x.masa_akhir) || minitDari(x.masa_akhir) <= minitDari(x.masa_mula)) throw new AppError('VALIDASI', n + 'masa tidak sah.');
    if (!x.subjek_id && !x.label) throw new AppError('VALIDASI', n + 'perlu subjek atau nama aktiviti.');
    var kelasIds = Array.isArray(x.kelas_ids) ? x.kelas_ids : [];
    if (kelasIds.length > 12) throw new AppError('VALIDASI', n + 'terlalu banyak kelas.');
    var id = uuid();
    barisSlot.push({
      id: id, guru_id: x.guru_id, tahun_akademik: tahun, hari: x.hari, masa_mula: x.masa_mula, masa_akhir: x.masa_akhir,
      subjek_id: x.subjek_id || null, label: x.label ? String(x.label).slice(0, 60) : null,
      tempoh: kiraTempoh(waktu, x.masa_mula, x.masa_akhir), sumber: 'asc', disahkan: true
    });
    var seen = {};
    kelasIds.forEach(function (k) {
      if (!kelasSah[k]) throw new AppError('VALIDASI', n + 'kelas tidak wujud untuk tahun ' + tahun + '.');
      if (!seen[k]) { seen[k] = true; barisKelas.push({ slot_id: id, kelas_id: k }); }
    });
  });

  // Ganti: padam slot lama guru-guru ini (dan pautan kelasnya), kemudian tulis yang baharu.
  var lama = query('jadual_slot', { tahun_akademik: tahun, guru_id: guruIds }).map(function (s) { return s.id; });
  if (lama.length) removeWhere('jadual_slot_kelas', { slot_id: lama });
  removeWhere('jadual_slot', { tahun_akademik: tahun, guru_id: guruIds });
  insertMany('jadual_slot', barisSlot, { actorId: ctx.akaunId });
  insertMany('jadual_slot_kelas', barisKelas, { actorId: ctx.akaunId, skipFk: true });
  logAudit(ctx.akaunId, 'JADUAL_IMPORT', tahun, guruIds.length + ' guru, ' + barisSlot.length + ' slot');
  return { guru: guruIds.length, slot: barisSlot.length, diganti: lama.length };
}

/**
 * Simpan tugasan guru secara pukal.
 * params: { tahun, ganti: true|false, tugasan: [{ guru_id, jenis_tugasan, kumpulan, nama_tugasan, subjek_id?, bilangan_kelas?, jabatan?, jam_kredit }] }
 * ganti = true: tugasan tahun itu bagi guru yang ada dalam fail dipadam dahulu.
 */
function aksiTugasanImport(ctx, params) {
  var tahun = _tahunParam(params);
  var list = params.tugasan;
  if (!Array.isArray(list) || !list.length || list.length > IMPORT_MAX_BARIS) throw new AppError('VALIDASI', 'Senarai tugasan tidak sah (1 hingga ' + IMPORT_MAX_BARIS + ' baris).');
  var guruSah = {}; query('guru', {}).forEach(function (g) { guruSah[g.id] = true; });
  var rows = list.map(function (t, i) {
    if (!t || typeof t !== 'object') throw new AppError('VALIDASI', 'Baris ' + (i + 1) + ': data tidak sah.');
    if (!guruSah[t.guru_id]) throw new AppError('VALIDASI', 'Baris ' + (i + 1) + ': guru tidak dijumpai.');
    var row = { guru_id: t.guru_id, tahun_akademik: tahun };
    REKOD_GURU.tugasan_guru.forEach(function (k) { if (k !== 'tahun_akademik' && t[k] !== undefined) row[k] = t[k]; });
    try { _semakRekod('tugasan_guru', row); } catch (e) { e.message = 'Baris ' + (i + 1) + ': ' + e.message; throw e; }
    return row;
  });
  var guruIds = Object.keys(rows.reduce(function (a, r) { a[r.guru_id] = true; return a; }, {}));
  var dipadam = 0;
  if (params.ganti === true) dipadam = removeWhere('tugasan_guru', { tahun_akademik: tahun, guru_id: guruIds });
  insertMany('tugasan_guru', rows, { actorId: ctx.akaunId });
  logAudit(ctx.akaunId, 'TUGASAN_IMPORT', tahun, guruIds.length + ' guru, ' + rows.length + ' tugasan' + (dipadam ? ', ' + dipadam + ' diganti' : ''));
  return { guru: guruIds.length, tugasan: rows.length, diganti: dipadam };
}
