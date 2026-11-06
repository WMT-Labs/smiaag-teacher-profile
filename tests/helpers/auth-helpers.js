'use strict';
const { loadReady } = require('./load-gas');

/** Backend siap dengan seorang superadmin aktif (sudah tukar password dan bersetuju PDPA). */
function setupWithSuperadmin() {
  const b = loadReady();
  const { ctx } = b;
  const call = (action, params, token) => ctx.handleRequest(JSON.stringify({ action, params, token }));
  const r = ctx._ciptaAkaunDalaman('SA001', 'Superadmin Contoh', 'tetap', 'superadmin', 'setup');
  const login = (kod, pw) => call('LOGIN', { guru_kod: kod, password: pw });
  /** Log masuk dan selesaikan langkah wajib (PDPA + tukar password). Pulangkan token. */
  const siapkan = (kod, tempPw, baru = 'KataLaluanBaru1') => {
    const l = login(kod, tempPw);
    if (!l.ok) throw new Error('login gagal: ' + l.message);
    const t = l.data.token;
    if (!call('SETUJU_PDPA', { setuju: true }, t).ok) throw new Error('pdpa');
    const tp = call('TUKAR_PASSWORD', { password_lama: tempPw, password_baru: baru }, t);
    if (!tp.ok) throw new Error('tukar: ' + tp.message);
    return t;
  };
  const superToken = siapkan('SA001', r.password, 'SuperRahsia99');
  /** Superadmin cipta akaun guru baharu dan siapkan. */
  const ciptaGuru = (kod, role = 'guru') => {
    const c = call('AKAUN_CIPTA', { guru_kod: kod, nama_penuh: 'Guru Contoh ' + kod, status_lantikan: 'tetap', role }, superToken);
    if (!c.ok) throw new Error(c.message);
    return { akaunId: c.data.akaun.akaun_id, temp: c.data.password_sementara, token: siapkan(kod, c.data.password_sementara) };
  };
  return { ...b, call, login, siapkan, superToken, ciptaGuru };
}

module.exports = { setupWithSuperadmin };
