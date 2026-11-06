/**
 * Kurikulum.gs — tugasan, jam kredit, jadual waktu, pertindihan dan slot kosong (Fasa 3).
 *
 * Bahagian 1: FUNGSI TULEN (tiada akses Sheets) — mudah diuji di Node.
 * Bahagian 2: AKSI API — guna repository, semak akses.
 *
 * Jam kredit diambil daripada tugasan_guru.jam_kredit (nilai ditetapkan sekolah dalam surat tugasan),
 * BUKAN dikira daripada bilangan slot jadual. Bilangan slot hanya untuk semakan silang.
 */

// ===========================================================================
// Bahagian 1: fungsi tulen
// ===========================================================================

var HAD_LALAI = { had_berjadual: 22, had_tidak_berjadual: 10 };
var NISBAH_HAMPIR = 0.8; // >= 80% had = "hampir had"

function _bundar(n) { return Math.round(n * 100) / 100; }

/** Jumlah jam kredit berjadual dan tidak berjadual daripada senarai tugasan. */
function kiraJamKredit(tugasan) {
  var out = { berjadual: 0, tidak_berjadual: 0 };
  (tugasan || []).forEach(function (t) {
    var j = Number(t.jam_kredit) || 0;
    if (t.jenis_tugasan === 'berjadual') out.berjadual += j;
    else if (t.jenis_tugasan === 'tidak_berjadual') out.tidak_berjadual += j;
  });
  out.berjadual = _bundar(out.berjadual);
  out.tidak_berjadual = _bundar(out.tidak_berjadual);
  return out;
}

/** 'dalam' | 'hampir' | 'lebih' */
function statusBeban(jam, had) {
  if (jam > had) return 'lebih';
  if (jam >= had * NISBAH_HAMPIR) return 'hampir';
  return 'dalam';
}

function statusBebanKeseluruhan(jam, had) {
  var a = statusBeban(jam.berjadual, had.had_berjadual), b = statusBeban(jam.tidak_berjadual, had.had_tidak_berjadual);
  if (a === 'lebih' || b === 'lebih') return 'lebih';
  if (a === 'hampir' || b === 'hampir') return 'hampir';
  return 'dalam';
}

/** "07:40" -> 460 */
function minitDari(hhmm) {
  var m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  return m ? (+m[1]) * 60 + (+m[2]) : NaN;
}

/** Dua slot bertindih jika hari sama dan julat masa bersilang. Bersambung (08:10 tamat, 08:10 mula) TIDAK bertindih. */
function slotBertindih(a, b) {
  return a.hari === b.hari && minitDari(a.masa_mula) < minitDari(b.masa_akhir) && minitDari(b.masa_mula) < minitDari(a.masa_akhir);
}

/**
 * Kesan pertindihan.
 * slots: [{ id, guru_id, hari, masa_mula, masa_akhir, kelas_ids: [] }]
 * Pulangkan [{ jenis: 'guru'|'kelas', a: idSlot, b: idSlot, guru_id?, kelas_id? }]
 *  - 'guru'  : guru yang sama ada dua slot pada masa bertindih
 *  - 'kelas' : kelas yang sama diajar dua guru berbeza pada masa bertindih (amaran sahaja;
 *              boleh jadi sah untuk kelas elektif yang dipecahkan, contoh KMA/EKO)
 */
function kesanPertindihan(slots) {
  var out = [];
  for (var i = 0; i < slots.length; i++) {
    for (var j = i + 1; j < slots.length; j++) {
      var a = slots[i], b = slots[j];
      if (!slotBertindih(a, b)) continue;
      if (a.guru_id === b.guru_id) {
        out.push({ jenis: 'guru', a: a.id, b: b.id, guru_id: a.guru_id });
      } else {
        (a.kelas_ids || []).forEach(function (k) {
          if ((b.kelas_ids || []).indexOf(k) !== -1) out.push({ jenis: 'kelas', a: a.id, b: b.id, kelas_id: k });
        });
      }
    }
  }
  return out;
}

/** Senarai guru_id yang TIADA slot bertindih dengan julat yang diberi. */
function cariGuruKosong(guruIds, slots, hari, mula, akhir) {
  var sasaran = { hari: hari, masa_mula: mula, masa_akhir: akhir };
  var sibuk = {};
  slots.forEach(function (s) { if (slotBertindih(s, sasaran)) sibuk[s.guru_id] = true; });
  return guruIds.filter(function (id) { return !sibuk[id]; });
}

/** Bilangan waktu dalam templat yang diliputi oleh julat masa (untuk medan `tempoh`). */
function kiraTempoh(waktu, mula, akhir) {
  var a = minitDari(mula), b = minitDari(akhir);
  var n = (waktu || []).filter(function (w) { return minitDari(w.masa_mula) >= a && minitDari(w.masa_akhir) <= b; }).length;
  return n || null;
}

/** Templat waktu lalai (daripada jadual sekolah 2026). Superadmin boleh ubah di Data rujukan. */
var WAKTU_LALAI = [
  ['07:30', '07:40'], ['07:40', '08:10'], ['08:10', '08:40'], ['08:40', '09:00'], ['09:00', '09:40'], ['09:40', '10:00'],
  ['10:00', '10:30'], ['10:30', '11:00'], ['11:00', '11:30'], ['11:30', '12:00'], ['12:00', '12:30'], ['12:30', '12:55'],
  ['12:55', '13:20'], ['13:20', '13:45'], ['13:45', '14:05'], ['14:05', '14:30'], ['14:30', '15:00'], ['15:00', '15:30']
];

// ===========================================================================
// Bahagian 2: aksi API
// ===========================================================================

function hadJamKredit(tahun) {
  var h = query('had_jam_kredit', { tahun_akademik: tahun })[0];
  return h ? { had_berjadual: h.had_berjadual, had_tidak_berjadual: h.had_tidak_berjadual } : { had_berjadual: HAD_LALAI.had_berjadual, had_tidak_berjadual: HAD_LALAI.had_tidak_berjadual };
}

function _tahunParam(params) {
  if (params.tahun === undefined || params.tahun === null || params.tahun === '') return tahunSemasa();
  return pStr(params, 'tahun', { label: 'Tahun', max: 4, re: /^\d{4}$/ });
}

/** Semua slot sah bagi satu tahun, dengan kelas_ids. Hanya slot `disahkan` digunakan dalam pengiraan. */
function _slotTahun(tahun, hanyaDisahkan) {
  var kelasBySlot = {};
  query('jadual_slot_kelas', {}).forEach(function (r) { (kelasBySlot[r.slot_id] = kelasBySlot[r.slot_id] || []).push(r.kelas_id); });
  var f = { tahun_akademik: tahun };
  if (hanyaDisahkan) f.disahkan = true;
  return query('jadual_slot', f).map(function (s) {
    s.kelas_ids = kelasBySlot[s.id] || [];
    return s;
  });
}

function aksiKurikulumLihat(ctx, params) {
  var guru = _sasaranGuru(ctx, params.guru_id);
  var tahun = _tahunParam(params);
  var had = hadJamKredit(tahun);
  var tugasan = query('tugasan_guru', { guru_id: guru.id, tahun_akademik: tahun });
  var jam = kiraJamKredit(tugasan);
  var semua = _slotTahun(tahun, true);
  var milik = semua.filter(function (s) { return s.guru_id === guru.id; });
  var idMilik = {};
  milik.forEach(function (s) { idMilik[s.id] = true; });
  var pertindihan = kesanPertindihan(semua).filter(function (p) { return idMilik[p.a] || idMilik[p.b]; });

  var kelas = query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' });
  var kelasNama = {}; kelas.forEach(function (k) { kelasNama[k.id] = k.nama; });
  var subjek = _subjekSenarai();
  var subjekById = {}; subjek.forEach(function (s) { subjekById[s.id] = s; });
  var guruNama = {};
  if (pertindihan.length) query('guru', {}).forEach(function (g) { guruNama[g.id] = g.nama_penuh; });
  var slotById = {}; semua.forEach(function (s) { slotById[s.id] = s; });
  var huraiSlot = function (s) {
    return {
      id: s.id, hari: s.hari, masa_mula: s.masa_mula, masa_akhir: s.masa_akhir, tempoh: s.tempoh,
      subjek_id: s.subjek_id, subjek: s.subjek_id && subjekById[s.subjek_id] ? (subjekById[s.subjek_id].kod || subjekById[s.subjek_id].nama) : null,
      label: s.label, kelas_ids: s.kelas_ids, kelas: s.kelas_ids.map(function (k) { return kelasNama[k] || '?'; }), sumber: s.sumber,
      milik: !!idMilik[s.id], guru: s.guru_id === guru.id ? null : (guruNama[s.guru_id] || null)
    };
  };

  // Semakan opsyen: subjek diajar (tugasan atau jadual) yang bukan opsyen guru. Maklumat sahaja.
  var opsyen = {};
  query('opsyen_guru', { guru_id: guru.id }).forEach(function (o) { opsyen[o.subjek_id] = true; });
  var diajar = {};
  tugasan.forEach(function (t) { if (t.subjek_id) diajar[t.subjek_id] = true; });
  milik.forEach(function (s) { if (s.subjek_id) diajar[s.subjek_id] = true; });
  var luarOpsyen = Object.keys(diajar).filter(function (id) { return !opsyen[id]; })
    .map(function (id) { return subjekById[id] ? subjekById[id].nama : '?'; });

  var minitJadual = milik.reduce(function (a, s) { return a + (minitDari(s.masa_akhir) - minitDari(s.masa_mula)); }, 0);

  return {
    guru: { id: guru.id, nama_penuh: guru.nama_penuh, guru_kod: guru.guru_kod },
    milik_sendiri: guru.id === ctx.guruId,
    tahun: tahun,
    had: had,
    jam: jam,
    status: { berjadual: statusBeban(jam.berjadual, had.had_berjadual), tidak_berjadual: statusBeban(jam.tidak_berjadual, had.had_tidak_berjadual) },
    tugasan: tugasan.map(_pilih(['id'].concat(REKOD_GURU.tugasan_guru))).map(function (t) {
      t.subjek_nama = t.subjek_id && subjekById[t.subjek_id] ? subjekById[t.subjek_id].nama : null;
      return t;
    }),
    slot: milik.map(huraiSlot),
    pertindihan: pertindihan.map(function (p) {
      var a = slotById[p.a], b = slotById[p.b];
      return { jenis: p.jenis, kelas: p.kelas_id ? kelasNama[p.kelas_id] : null, a: huraiSlot(a), b: huraiSlot(b) };
    }),
    luar_opsyen: luarOpsyen,
    semakan_silang: { bilangan_slot: milik.length, waktu: milik.reduce(function (a, s) { return a + (s.tempoh || 0); }, 0), jam_jadual: _bundar(minitJadual / 60) },
    ref: {
      subjek: subjek, kelas: kelas.map(_pilih(['id', 'nama', 'tingkatan'])),
      waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
      hari: _refSenarai('ref_hari'), jenis_tugasan: _refSenarai('ref_jenis_tugasan'),
      kumpulan: _refSenarai('ref_kumpulan_tugasan'), jabatan: _refSenarai('ref_jabatan')
    }
  };
}

function _kelasIds(params) {
  var ids = params.kelas_ids === undefined || params.kelas_ids === null ? [] : params.kelas_ids;
  if (!Array.isArray(ids) || ids.length > 12) throw new AppError('VALIDASI', 'Senarai kelas tidak sah.', { field: 'kelas_ids' });
  var seen = {};
  return ids.filter(function (k) {
    if (typeof k !== 'string' || !UUID_RE.test(k)) throw new AppError('VALIDASI', 'Kelas tidak sah.', { field: 'kelas_ids' });
    if (!getById('kelas', k)) throw new AppError('VALIDASI', 'Kelas tidak wujud.', { field: 'kelas_ids' });
    if (seen[k]) return false;
    seen[k] = true; return true;
  });
}

function aksiSlotSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = {
    hari: pStr(params, 'hari', { label: 'Hari', max: 20 }),
    masa_mula: pStr(params, 'masa_mula', { label: 'Masa mula', max: 5, re: TIME_RE, reMsg: 'Masa mula tidak sah (JJ:MM).' }),
    masa_akhir: pStr(params, 'masa_akhir', { label: 'Masa akhir', max: 5, re: TIME_RE, reMsg: 'Masa akhir tidak sah (JJ:MM).' }),
    subjek_id: params.subjek_id ? pUuid(params, 'subjek_id', 'Subjek') : null,
    label: pStr(params, 'label', { label: 'Aktiviti', max: 60, optional: true })
  };
  if (minitDari(row.masa_akhir) <= minitDari(row.masa_mula)) throw new AppError('VALIDASI', 'Masa akhir mesti selepas masa mula.', { field: 'masa_akhir' });
  if (!row.subjek_id && !row.label) throw new AppError('VALIDASI', 'Pilih subjek atau isi nama aktiviti (contoh Perhimpunan).', { field: 'subjek_id' });
  var kelasIds = _kelasIds(params);
  row.tempoh = kiraTempoh(query('waktu', { tahun_akademik: tahun }), row.masa_mula, row.masa_akhir);

  var slot, guru;
  if (params.id) {
    var id = pUuid(params, 'id', 'Slot');
    var lama = getById('jadual_slot', id);
    if (!lama) throw new AppError('TIDAK_JUMPA', 'Slot tidak dijumpai.');
    guru = _sasaranGuru(ctx, lama.guru_id);
    row.disahkan = true;
    slot = update('jadual_slot', id, row, { actorId: ctx.akaunId });
    query('jadual_slot_kelas', { slot_id: id }).forEach(function (r) { remove('jadual_slot_kelas', r.id); });
  } else {
    guru = _sasaranGuru(ctx, params.guru_id);
    row.guru_id = guru.id; row.tahun_akademik = tahun; row.sumber = 'manual'; row.disahkan = true;
    slot = insert('jadual_slot', row, { actorId: ctx.akaunId });
  }
  kelasIds.forEach(function (k) { insert('jadual_slot_kelas', { slot_id: slot.id, kelas_id: k }, { actorId: ctx.akaunId, skipFk: true }); });
  _auditJikaOrangLain(ctx, guru, 'SUNTING_JADUAL_GURU', row.hari + ' ' + row.masa_mula);

  // Amaran pertindihan yang melibatkan slot ini
  var semua = _slotTahun(slot.tahun_akademik, true);
  var amaran = kesanPertindihan(semua).filter(function (p) { return p.a === slot.id || p.b === slot.id; });
  return { id: slot.id, amaran: amaran.length };
}

function aksiSlotPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Slot');
  var lama = getById('jadual_slot', id);
  if (!lama) throw new AppError('TIDAK_JUMPA', 'Slot tidak dijumpai.');
  var guru = _sasaranGuru(ctx, lama.guru_id);
  query('jadual_slot_kelas', { slot_id: id }).forEach(function (r) { remove('jadual_slot_kelas', r.id); });
  remove('jadual_slot', id);
  _auditJikaOrangLain(ctx, guru, 'SUNTING_JADUAL_GURU', 'slot dipadam');
  return { dipadam: true };
}

/** Cari guru yang tiada kelas pada hari dan masa tertentu (untuk guru ganti). Pentadbir sahaja. */
function aksiSlotKosong(ctx, params) {
  var tahun = _tahunParam(params);
  var hari = pStr(params, 'hari', { label: 'Hari', max: 20 });
  var mula = pStr(params, 'masa_mula', { label: 'Masa mula', max: 5, re: TIME_RE });
  var akhir = pStr(params, 'masa_akhir', { label: 'Masa akhir', max: 5, re: TIME_RE });
  if (minitDari(akhir) <= minitDari(mula)) throw new AppError('VALIDASI', 'Masa akhir mesti selepas masa mula.');
  var subjekId = params.subjek_id ? pUuid(params, 'subjek_id', 'Subjek') : null;
  var jabatan = pStr(params, 'jabatan', { label: 'Jabatan', max: 20, optional: true });

  var guru = query('guru', { aktif: true }, { orderBy: 'nama_penuh' });
  var kosong = cariGuruKosong(guru.map(function (g) { return g.id; }), _slotTahun(tahun, true), hari, mula, akhir);
  var set = {}; kosong.forEach(function (id) { set[id] = true; });

  var opsyenGuru = {};
  query('opsyen_guru', {}).forEach(function (o) { (opsyenGuru[o.guru_id] = opsyenGuru[o.guru_id] || {})[o.subjek_id] = o.jenis; });
  var jabatanGuru = {};
  query('tugasan_guru', { tahun_akademik: tahun }).forEach(function (t) { if (t.jabatan) (jabatanGuru[t.guru_id] = jabatanGuru[t.guru_id] || {})[t.jabatan] = true; });
  var tugasan = {};
  query('tugasan_guru', { tahun_akademik: tahun }).forEach(function (t) { (tugasan[t.guru_id] = tugasan[t.guru_id] || []).push(t); });

  var hasil = guru.filter(function (g) {
    if (!set[g.id]) return false;
    if (subjekId && !(opsyenGuru[g.id] && opsyenGuru[g.id][subjekId])) return false;
    if (jabatan && !(jabatanGuru[g.id] && jabatanGuru[g.id][jabatan])) return false;
    return true;
  }).map(function (g) {
    return {
      id: g.id, nama_penuh: g.nama_penuh, guru_kod: g.guru_kod, jawatan: g.jawatan,
      opsyen: subjekId && opsyenGuru[g.id] ? opsyenGuru[g.id][subjekId] : null,
      jam_berjadual: kiraJamKredit(tugasan[g.id] || []).berjadual
    };
  });
  // Guru paling ringan beban didahulukan
  hasil.sort(function (a, b) { return a.jam_berjadual - b.jam_berjadual; });
  return { tahun: tahun, guru: hasil, jumlah_guru_aktif: guru.length };
}

/** Data untuk borang carian slot kosong. */
function aksiSlotKosongRujukan(ctx, params) {
  var tahun = _tahunParam(params);
  return {
    tahun: tahun,
    waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
    hari: _refSenarai('ref_hari'), jabatan: _refSenarai('ref_jabatan'), subjek: _subjekSenarai()
  };
}

// ---------------------------------------------------------------------------
// Data rujukan kurikulum (superadmin): kelas, waktu, had jam kredit
// ---------------------------------------------------------------------------

function aksiKurikulumRujukan(ctx, params) {
  var tahun = _tahunParam(params);
  return {
    tahun: tahun,
    kelas: query('kelas', { tahun_akademik: tahun }, { orderBy: 'nama' }).map(_pilih(['id', 'nama', 'tingkatan'])),
    waktu: query('waktu', { tahun_akademik: tahun }, { orderBy: 'nombor' }).map(_pilih(['nombor', 'masa_mula', 'masa_akhir'])),
    had: hadJamKredit(tahun)
  };
}

/** Tambah kelas secara pukal: satu kelas setiap baris, contoh "1 Tabari". Tingkatan diambil daripada nombor di depan. */
function aksiKelasPukal(ctx, params) {
  var tahun = _tahunParam(params);
  var teks = pStr(params, 'teks', { label: 'Senarai kelas', max: 5000 });
  var ada = {};
  query('kelas', { tahun_akademik: tahun }).forEach(function (k) { ada[k.nama.toLowerCase()] = true; });
  var ditambah = [], dilangkau = [], ralat = [];
  teks.split(/\r?\n/).map(function (x) { return x.trim().replace(/\s+/g, ' '); }).filter(Boolean).forEach(function (nama) {
    var m = /^([1-6])\s*\S/.exec(nama);
    if (!m) { ralat.push(nama + ' (mesti bermula dengan tingkatan 1-6)'); return; }
    if (ada[nama.toLowerCase()]) { dilangkau.push(nama); return; }
    insert('kelas', { nama: nama.slice(0, 60), tingkatan: +m[1], tahun_akademik: tahun }, { actorId: ctx.akaunId });
    ada[nama.toLowerCase()] = true;
    ditambah.push(nama);
  });
  logAudit(ctx.akaunId, 'KELAS_PUKAL', tahun, ditambah.length + ' kelas');
  return { ditambah: ditambah, dilangkau: dilangkau, ralat: ralat };
}

function aksiKelasPadam(ctx, params) {
  var id = pUuid(params, 'id', 'Kelas');
  if (!getById('kelas', id)) throw new AppError('TIDAK_JUMPA', 'Kelas tidak dijumpai.');
  if (query('jadual_slot_kelas', { kelas_id: id }).length) throw new AppError('TIDAK_DIBENARKAN', 'Kelas ini masih digunakan dalam jadual. Buang daripada slot dahulu.');
  remove('kelas', id);
  return { dipadam: true };
}

/** Tambah subjek pukal: "KOD - Nama subjek" atau "Nama subjek" setiap baris. */
function aksiSubjekPukal(ctx, params) {
  var teks = pStr(params, 'teks', { label: 'Senarai subjek', max: 5000 });
  var ada = {};
  query('subjek', {}).forEach(function (s) { ada[s.nama.toLowerCase()] = true; });
  var ditambah = [], dilangkau = [];
  teks.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (baris) {
    var m = /^([A-Za-z0-9/]{1,15})\s+-\s+(.+)$/.exec(baris);
    var kod = m ? m[1].toUpperCase() : null, nama = (m ? m[2] : baris).trim().slice(0, 120);
    if (ada[nama.toLowerCase()]) { dilangkau.push(nama); return; }
    insert('subjek', { nama: nama, kod: kod, kategori: 'subjek' }, { actorId: ctx.akaunId });
    ada[nama.toLowerCase()] = true;
    ditambah.push(nama);
  });
  logAudit(ctx.akaunId, 'SUBJEK_PUKAL', null, ditambah.length + ' subjek');
  return { ditambah: ditambah, dilangkau: dilangkau };
}

/** Ganti templat waktu bagi satu tahun. waktu: [{ masa_mula, masa_akhir }] mengikut urutan. */
function aksiWaktuSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var list = params.waktu;
  if (!Array.isArray(list) || !list.length || list.length > 30) throw new AppError('VALIDASI', 'Senarai waktu tidak sah.');
  list.forEach(function (w, i) {
    if (!w || !TIME_RE.test(w.masa_mula) || !TIME_RE.test(w.masa_akhir) || minitDari(w.masa_akhir) <= minitDari(w.masa_mula)) {
      throw new AppError('VALIDASI', 'Waktu ' + (i + 1) + ' tidak sah.');
    }
    if (i > 0 && minitDari(w.masa_mula) < minitDari(list[i - 1].masa_akhir)) throw new AppError('VALIDASI', 'Waktu ' + (i + 1) + ' bertindih dengan waktu sebelumnya.');
  });
  query('waktu', { tahun_akademik: tahun }).forEach(function (w) { remove('waktu', w.id); });
  list.forEach(function (w, i) { insert('waktu', { tahun_akademik: tahun, nombor: i + 1, masa_mula: w.masa_mula, masa_akhir: w.masa_akhir }, { actorId: ctx.akaunId }); });
  logAudit(ctx.akaunId, 'WAKTU_SIMPAN', tahun, list.length + ' waktu');
  return { bilangan: list.length };
}

function aksiHadSimpan(ctx, params) {
  var tahun = _tahunParam(params);
  var row = { had_berjadual: params.had_berjadual, had_tidak_berjadual: params.had_tidak_berjadual };
  var ada = query('had_jam_kredit', { tahun_akademik: tahun })[0];
  if (ada) update('had_jam_kredit', ada.id, row, { actorId: ctx.akaunId });
  else { row.tahun_akademik = tahun; insert('had_jam_kredit', row, { actorId: ctx.akaunId }); }
  logAudit(ctx.akaunId, 'HAD_JAM_SIMPAN', tahun, row.had_berjadual + '/' + row.had_tidak_berjadual);
  return hadJamKredit(tahun);
}

/** Sediakan templat waktu lalai untuk tahun semasa (dipanggil oleh setupTemplate). */
function _seedWaktu() {
  var tahun = tahunSemasa();
  if (query('waktu', { tahun_akademik: tahun }).length) return 'Templat waktu ' + tahun + ': sedia ada';
  WAKTU_LALAI.forEach(function (w, i) { insert('waktu', { tahun_akademik: tahun, nombor: i + 1, masa_mula: w[0], masa_akhir: w[1] }, { actorId: 'setup' }); });
  return 'Templat waktu ' + tahun + ': ' + WAKTU_LALAI.length + ' waktu';
}
