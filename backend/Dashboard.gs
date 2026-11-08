/**
 * Dashboard.gs — paparan seluruh sekolah untuk pentadbir dan superadmin (Fasa 6).
 *
 * Satu panggilan memulangkan satu baris ringkasan bagi setiap guru untuk tahun dipilih.
 * Penapisan (jabatan, status, subjek, tingkatan, unit, nama) dibuat di pelayar kerana data
 * ini memang dibenarkan untuk pentadbir; tiada nombor telefon, hash atau data peribadi lain dihantar.
 */

function aksiDashboard(ctx, params) {
  var tahun = _tahunParam(params);
  var hari = hariIni();
  var had = hadJamKredit(tahun);

  var kelas = query('kelas', { tahun_akademik: tahun });
  var kelasById = {}; kelas.forEach(function (k) { kelasById[k.id] = k; });
  var subjek = _subjekSenarai();
  var units = _unitTahun(tahun);

  var by = function (rows, key) { var o = {}; rows.forEach(function (r) { (o[r[key]] = o[r[key]] || []).push(r); }); return o; };
  var tugasan = by(query('tugasan_guru', { tahun_akademik: tahun }), 'guru_id');
  var slots = _slotTahun(tahun, true);
  var slotGuru = by(slots, 'guru_id');
  var cerapan = {}; query('cerapan', { tahun_akademik: tahun }).forEach(function (c) { cerapan[c.guru_id] = c; });
  var unitGuru = by(query('keahlian_unit', { tahun_akademik: tahun }), 'guru_id');
  var semuaPeranan = query('peranan_hem', { tahun_akademik: tahun });
  var peranan = by(semuaPeranan, 'guru_id');
  var adaGuruKelas = {};
  semuaPeranan.forEach(function (p) { if (p.jenis === 'guru_kelas' && p.kelas_id) adaGuruKelas[p.kelas_id] = true; });
  var pelajar = by(query('kumpulan_usrah_pelajar', { tahun_akademik: tahun }), 'guru_id');
  var rumah = {}; query('guru_rumah', { tahun_akademik: tahun }).forEach(function (r) { rumah[r.guru_id] = r.rumah_sukan_id; });

  // Usrah guru: kumpulan dan peratus kehadiran setiap ahli
  // (setiap jadual dibaca SEKALI sahaja, kemudian dikumpulkan dalam memori)
  var usrah = query('usrah_guru', { tahun_akademik: tahun });
  var idUsrah = usrah.map(function (u) { return u.id; });
  var sesiByUsrah = idUsrah.length ? by(query('sesi_usrah_guru', { usrah_guru_id: idUsrah }), 'usrah_guru_id') : {};
  var semuaSesiId = [];
  Object.keys(sesiByUsrah).forEach(function (k) { sesiByUsrah[k].forEach(function (s) { semuaSesiId.push(s.id); }); });
  var semuaKh = semuaSesiId.length ? query('kehadiran_usrah_guru', { sesi_id: semuaSesiId }) : [];
  var ahliByUsrah = idUsrah.length ? by(query('keahlian_usrah_guru', { usrah_guru_id: idUsrah }), 'usrah_guru_id') : {};
  var usrahGuru = {};
  usrah.forEach(function (u) {
    var sesi = sesiByUsrah[u.id] || [];
    (ahliByUsrah[u.id] || []).forEach(function (a) {
      usrahGuru[a.guru_id] = { kumpulan: u.nama_kumpulan, peratus: kiraKehadiran(sesi, semuaKh, a.guru_id).peratus };
    });
    if (!usrahGuru[u.murabbi_guru_id]) usrahGuru[u.murabbi_guru_id] = { kumpulan: u.nama_kumpulan, murabbi: true, peratus: null };
  });

  var guru = senaraiGuruMengajar().map(function (g) {
    var t = tugasan[g.id] || [];
    var jam = kiraJamKredit(t);
    var subj = {}, ting = {}, jab = {};
    t.forEach(function (x) { if (x.subjek_id) subj[x.subjek_id] = 1; if (x.jabatan) jab[x.jabatan] = 1; });
    (slotGuru[g.id] || []).forEach(function (s) {
      if (s.subjek_id) subj[s.subjek_id] = 1;
      s.kelas_ids.forEach(function (k) { if (kelasById[k]) ting[kelasById[k].tingkatan] = 1; });
    });
    var c = cerapan[g.id];
    return {
      id: g.id, guru_kod: g.guru_kod, nama_penuh: g.nama_penuh, jawatan: g.jawatan, status_lantikan: g.status_lantikan,
      percubaan: statusPercubaan(g, hari), praktikal: statusPraktikal(g, hari),
      jam_berjadual: jam.berjadual, jam_tidak_berjadual: jam.tidak_berjadual,
      status_berjadual: statusBeban(jam.berjadual, had.had_berjadual),
      status_tidak_berjadual: statusBeban(jam.tidak_berjadual, had.had_tidak_berjadual),
      status_beban: statusBebanKeseluruhan(jam, had),
      bilangan_tugasan: t.length, bilangan_slot: (slotGuru[g.id] || []).length,
      jabatan: Object.keys(jab), subjek_ids: Object.keys(subj), tingkatan: Object.keys(ting).map(Number).sort(),
      cerapan: c ? c.bilangan_dicerap : 0, pencerap: c ? c.pencerap : null,
      unit: (unitGuru[g.id] || []).map(function (k) { return { unit_id: k.unit_id, jawatan: k.jawatan }; }),
      rumah_sukan_id: rumah[g.id] || null,
      peranan_hem: (peranan[g.id] || []).map(function (p) { return p.jenis; }),
      murid_usrah: (pelajar[g.id] || []).reduce(function (a, p) { return a + (p.bilangan_murid || 0); }, 0),
      usrah_guru: usrahGuru[g.id] || null
    };
  });

  return {
    tahun: tahun, had: had, dijana: nowIso(),
    guru: guru,
    ref: {
      subjek: subjek, unit: units, rumah: _rumahSemua(),
      tingkatan: Object.keys(kelas.reduce(function (a, k) { a[k.tingkatan] = 1; return a; }, {})).map(Number).sort(),
      jabatan: _refSenarai('ref_jabatan'), status_lantikan: _refSenarai('ref_status_lantikan'),
      jenis_unit: _refSenarai('ref_jenis_unit'), jawatan_unit: _refSenarai('ref_jawatan_unit'), jenis_peranan: _refSenarai('ref_jenis_peranan_hem')
    },
    kelas_tanpa_guru_kelas: kelas.filter(function (k) { return !adaGuruKelas[k.id]; }).length
  };
}
