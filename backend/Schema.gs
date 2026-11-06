/**
 * Schema.gs — definisi semua jadual (tab Sheets) dalam satu tempat.
 *
 * Ini "sumber kebenaran" untuk: pembinaan template Sheets, pengesahan data dalam
 * lapisan repository, ujian automatik, dan (Fasa 7) skrip SQL Supabase.
 *
 * Format setiap lajur: "nama:jenis[julat]!=lalai"
 *   jenis   : text | uuid | int | num | bool | date | time | datetime | year
 *             | fk(jadual)      -> kunci asing, mesti wujud dalam jadual itu
 *             | enum(ref_xxx)   -> nilai mesti ada (lajur `kod`) dalam jadual ref_xxx
 *   [a..b]  : julat dibenarkan untuk int/num
 *   !       : wajib diisi
 *   =lalai  : nilai lalai jika tidak diberi semasa insert (true/false/nombor/teks)
 *
 * Tarikh disimpan sebagai ISO (YYYY-MM-DD), masa sebagai HH:MM, tahun_akademik sebagai "2026".
 * Nama jadual dan lajur: snake_case, tanpa ruang.
 */

var SYSTEM_COLS = ['created_at', 'updated_at', 'updated_by'];

/** Perkataan yang tidak dibenarkan menjadi nama lajur (data yang tidak boleh disimpan). */
var FORBIDDEN_COLUMN_WORDS = ['gaji', 'salary', 'ic', 'no_ic', 'no_kp', 'kad_pengenalan', 'mykad', 'passport', 'pasport'];

var _TABLE_DEFS = {
  // ---- Teras ----
  guru: {
    cols: ['id:uuid!', 'guru_kod:text!', 'nama_penuh:text!', 'status_lantikan:enum(ref_status_lantikan)!',
      'jawatan:text', 'tarikh_lantikan:date', 'no_telefon:text', 'gambar_ref:text', 'aktif:bool!=true'],
    unique: [['guru_kod']]
  },
  akaun: {
    // persetujuan_pdpa_pada ialah tambahan kepada dokumen asal: rekod bila guru bersetuju (Seksyen 9).
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'salt:text!', 'password_hash:text!', 'role:enum(ref_role)!',
      'wajib_tukar_password:bool!=true', 'percubaan_gagal:int[0..1000]!=0', 'persetujuan_pdpa_pada:datetime', 'aktif:bool!=true'],
    unique: [['guru_id']]
  },
  sessions: {
    pk: 'token', audit: false,
    cols: ['token:uuid!', 'akaun_id:fk(akaun)!', 'role:enum(ref_role)!', 'expiry:datetime!']
  },
  kelayakan: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahap:enum(ref_tahap_kelayakan)!', 'bidang:text', 'institusi:text', 'tahun_tamat:year']
  },
  opsyen_guru: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'jenis:enum(ref_jenis_opsyen)!', 'subjek_id:fk(subjek)!'],
    unique: [['guru_id', 'jenis', 'subjek_id']]
  },
  kursus: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tajuk:text!', 'penganjur:text', 'tarikh_mula:date', 'tarikh_tamat:date',
      'jam:num[0..1000]', 'tahap:enum(ref_peringkat_kursus)!']
  },
  cerapan: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'tarikh_dirancang:date', 'tarikh_sebenar:date',
      'pencerap:text', 'subjek_id:fk(subjek)', 'kelas_id:fk(kelas)', 'skor_atau_gred:text', 'ulasan_ringkas:text',
      'status:enum(ref_status_cerapan)!=dirancang']
  },
  sasaran_cerapan: {
    // guru_id kosong = nilai lalai sekolah; ada guru_id = sasaran khusus guru itu.
    cols: ['id:uuid!', 'tahun_akademik:year!', 'guru_id:fk(guru)', 'bilangan_sasaran_setahun:int[0..20]!'],
    unique: [['tahun_akademik', 'guru_id']]
  },
  audit_log: {
    audit: false,
    cols: ['id:uuid!', 'masa:datetime!', 'akaun_id:fk(akaun)', 'tindakan:text!', 'sasaran:text', 'butiran:text']
  },

  // ---- Kurikulum ----
  subjek: {
    cols: ['id:uuid!', 'nama:text!', 'kod:text', 'kategori:enum(ref_kategori_subjek)!=subjek'],
    unique: [['nama']]
  },
  kelas: {
    cols: ['id:uuid!', 'nama:text!', 'tingkatan:int[1..6]!', 'tahun_akademik:year!'],
    unique: [['nama', 'tahun_akademik']]
  },
  tugasan_guru: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'jenis_tugasan:enum(ref_jenis_tugasan)!',
      'kumpulan:enum(ref_kumpulan_tugasan)!', 'nama_tugasan:text!', 'subjek_id:fk(subjek)', 'bilangan_kelas:int[0..50]',
      'jabatan:enum(ref_jabatan)', 'jam_kredit:num[0..40]!']
  },
  jadual_slot: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'hari:enum(ref_hari)!', 'masa_mula:time!', 'masa_akhir:time!',
      'subjek_id:fk(subjek)', 'kelas_id:fk(kelas)', 'tempoh:int[1..20]', 'sumber:enum(ref_sumber_slot)!=manual', 'disahkan:bool!=false']
  },
  had_jam_kredit: {
    cols: ['id:uuid!', 'tahun_akademik:year!', 'had_berjadual:num[0..80]!=22', 'had_tidak_berjadual:num[0..80]!=10'],
    unique: [['tahun_akademik']]
  },

  // ---- Kokurikulum ----
  unit_kokurikulum: {
    cols: ['id:uuid!', 'nama:text!', 'jenis:enum(ref_jenis_unit)!', 'tahun_akademik:year!'],
    unique: [['nama', 'tahun_akademik']]
  },
  keahlian_unit: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'unit_id:fk(unit_kokurikulum)!', 'tahun_akademik:year!', 'jawatan:enum(ref_jawatan_unit)!'],
    unique: [['guru_id', 'unit_id', 'tahun_akademik']]
  },
  rumah_sukan: {
    cols: ['id:uuid!', 'nama:text!', 'warna:text'],
    unique: [['nama']]
  },
  guru_rumah: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'rumah_sukan_id:fk(rumah_sukan)!', 'tahun_akademik:year!', 'jawatan:text'],
    unique: [['guru_id', 'tahun_akademik']]
  },
  juara_rumah_sukan: {
    cols: ['id:uuid!', 'tahun_akademik:year!', 'rumah_sukan_id:fk(rumah_sukan)!', 'kedudukan:int[1..4]!', 'catatan:text'],
    unique: [['tahun_akademik', 'rumah_sukan_id'], ['tahun_akademik', 'kedudukan']]
  },
  pertandingan: {
    cols: ['id:uuid!', 'nama_acara:text!', 'peringkat:enum(ref_peringkat_pertandingan)!', 'tarikh:date', 'bilangan_murid:int[0..2000]',
      'pencapaian:text', 'unit_id:fk(unit_kokurikulum)', 'tahun_akademik:year!']
  },
  penyertaan_pertandingan: {
    cols: ['id:uuid!', 'pertandingan_id:fk(pertandingan)!', 'guru_id:fk(guru)!', 'peranan:enum(ref_peranan_pertandingan)!'],
    unique: [['pertandingan_id', 'guru_id']]
  },

  // ---- HEM ----
  kumpulan_usrah_pelajar: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'nama_kumpulan:text!', 'tingkatan:int[1..6]',
      'hari:enum(ref_hari)', 'bilangan_murid:int[0..500]']
  },
  usrah_guru: {
    cols: ['id:uuid!', 'tahun_akademik:year!', 'murabbi_guru_id:fk(guru)!', 'nama_kumpulan:text!', 'hari:enum(ref_hari)']
  },
  keahlian_usrah_guru: {
    cols: ['id:uuid!', 'usrah_guru_id:fk(usrah_guru)!', 'guru_id:fk(guru)!'],
    unique: [['usrah_guru_id', 'guru_id']]
  },
  kehadiran_usrah_guru: {
    cols: ['id:uuid!', 'usrah_guru_id:fk(usrah_guru)!', 'guru_id:fk(guru)!', 'tarikh:date!', 'hadir:bool!', 'catatan:text'],
    unique: [['usrah_guru_id', 'guru_id', 'tarikh']]
  },
  peranan_hem: {
    cols: ['id:uuid!', 'guru_id:fk(guru)!', 'tahun_akademik:year!', 'jenis:enum(ref_jenis_peranan_hem)!', 'kelas_id:fk(kelas)', 'butiran:text']
  }
};

/**
 * Jadual rujukan (ref_*). Setiap satu: id, kod, label, susunan, aktif (+ lajur audit).
 * Lajur bernilai terhad dalam jadual lain menyimpan `kod`. Kod dalam snake_case
 * (contoh "al-quran-tutorial" dalam dokumen ditulis `al_quran_tutorial`).
 * Superadmin boleh menambah/menyahaktifkan nilai (diurus pada Fasa 1+).
 */
var REF_SEEDS = {
  ref_status_lantikan: [['tetap', 'Tetap'], ['kontrak', 'Kontrak'], ['lain_lain', 'Lain-lain']],
  ref_role: [['guru', 'Guru'], ['pentadbir', 'Pentadbir'], ['superadmin', 'Superadmin']],
  ref_tahap_kelayakan: [['sijil', 'Sijil'], ['diploma', 'Diploma'], ['ijazah_sarjana_muda', 'Ijazah Sarjana Muda'],
    ['ijazah_sarjana', 'Ijazah Sarjana'], ['doktor_falsafah', 'Doktor Falsafah'], ['lain_lain', 'Lain-lain']],
  ref_jenis_opsyen: [['major', 'Major'], ['minor', 'Minor']],
  ref_peringkat_kursus: [['sekolah', 'Sekolah'], ['daerah', 'Daerah'], ['negeri', 'Negeri'], ['kebangsaan', 'Kebangsaan'], ['lain_lain', 'Lain-lain']],
  ref_status_cerapan: [['dirancang', 'Dirancang'], ['selesai', 'Selesai'], ['ditunda', 'Ditunda']],
  ref_kategori_subjek: [['subjek', 'Subjek'], ['al_quran_tutorial', 'Al-Quran / Tutorial'], ['lain', 'Lain']],
  ref_jenis_tugasan: [['berjadual', 'Berjadual'], ['tidak_berjadual', 'Tidak berjadual']],
  ref_kumpulan_tugasan: [['subjek', 'Subjek'], ['al_quran_tutorial', 'Al-Quran / Tutorial'], ['aktiviti_lain', 'Aktiviti lain'],
    ['tugasan_tidak_berjadual', 'Tugasan tidak berjadual']],
  ref_jabatan: [['KURI', 'Kurikulum'], ['HEM', 'Hal Ehwal Murid'], ['KOKU', 'Kokurikulum'], ['lain_lain', 'Lain-lain']],
  ref_hari: [['isnin', 'Isnin'], ['selasa', 'Selasa'], ['rabu', 'Rabu'], ['khamis', 'Khamis'], ['jumaat', 'Jumaat'], ['sabtu', 'Sabtu'], ['ahad', 'Ahad']],
  ref_sumber_slot: [['pdf', 'Import PDF'], ['manual', 'Manual']],
  ref_jenis_unit: [['badan_beruniform', 'Badan beruniform'], ['kelab_persatuan', 'Kelab / persatuan'], ['pasukan_sekolah', 'Pasukan sekolah']],
  ref_jawatan_unit: [['penasihat', 'Penasihat'], ['penyelaras', 'Penyelaras'], ['ajk', 'AJK'], ['lain_lain', 'Lain-lain']],
  ref_peringkat_pertandingan: [['sekolah', 'Sekolah'], ['daerah', 'Daerah'], ['negeri', 'Negeri'], ['kebangsaan', 'Kebangsaan']],
  ref_peranan_pertandingan: [['pengurus', 'Pengurus'], ['jurulatih', 'Jurulatih'], ['pengiring', 'Pengiring'], ['lain_lain', 'Lain-lain']],
  ref_jenis_peranan_hem: [['guru_tarbiah', 'Guru Tarbiah'], ['guru_kelas', 'Guru Kelas'], ['bidang_disiplin', 'Bidang Disiplin']]
};

var REF_COLS = ['id:uuid!', 'kod:text!', 'label:text!', 'susunan:int[0..1000]!=0', 'aktif:bool!=true'];

/** Jenis lajur teks yang dianggap "medan bebas" dan dihadkan lebih panjang. */
var LONG_TEXT_COLS = ['ulasan_ringkas', 'butiran', 'catatan', 'pencapaian'];
var MAX_TEXT = 200;
var MAX_LONG_TEXT = 1000;

/** Hasil parse: SCHEMA[jadual] = {name, pk, audit, isRef, columns[], defs{}, unique[]} */
var SCHEMA = (function () {
  function parseCol(spec, table) {
    var m = /^([a-z0-9_]+):([^!=]+?)(!)?(?:=(.*))?$/.exec(spec);
    if (!m) throw new Error('Spesifikasi lajur tidak sah: ' + table + '.' + spec);
    var def = { name: m[1], type: 'text', required: !!m[3], fk: null, ref: null, min: null, max: null, def: undefined };
    var t = m[2], r;
    if ((r = /^fk\(([a-z0-9_]+)\)$/.exec(t))) { def.type = 'uuid'; def.fk = r[1]; }
    else if ((r = /^enum\(([a-z0-9_]+)\)$/.exec(t))) { def.type = 'text'; def.ref = r[1]; }
    else if ((r = /^(int|num)\[(-?[\d.]+)\.\.(-?[\d.]+)\]$/.exec(t))) { def.type = r[1]; def.min = +r[2]; def.max = +r[3]; }
    else def.type = t;
    if (m[4] !== undefined) {
      var d = m[4];
      def.def = d === 'true' ? true : d === 'false' ? false : (/^-?\d+(\.\d+)?$/.test(d) ? +d : d);
    }
    if (def.name === 'id' || def.name === 'token') def.required = true;
    return def;
  }
  function build(name, d, isRef) {
    var cols = d.cols.slice();
    var audit = d.audit !== false;
    var defs = {}, names = [];
    function add(spec) { var c = parseCol(spec, name); defs[c.name] = c; names.push(c.name); }
    cols.forEach(add);
    if (audit) { add('created_at:datetime'); add('updated_at:datetime'); add('updated_by:text'); }
    return { name: name, pk: d.pk || 'id', audit: audit, isRef: !!isRef, columns: names, defs: defs, unique: d.unique || [] };
  }
  var out = {};
  Object.keys(REF_SEEDS).forEach(function (n) { out[n] = build(n, { cols: REF_COLS, unique: [['kod']] }, true); });
  Object.keys(_TABLE_DEFS).forEach(function (n) { out[n] = build(n, _TABLE_DEFS[n], false); });
  return out;
})();

/** Urutan tab dalam Sheets: ref_* dahulu, kemudian jadual data. */
var TABLE_ORDER = Object.keys(SCHEMA);

function getTableSchema(table) {
  var s = SCHEMA[table];
  if (!s) throw new AppError('JADUAL_TIDAK_WUJUD', 'Jadual tidak dikenali: ' + table);
  return s;
}
