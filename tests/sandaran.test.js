'use strict';
// C6: sandaran mingguan ke Spreadsheet berasingan, bergilir 4 salinan, tanpa tab sessions.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupWithSuperadmin } = require('./helpers/auth-helpers');

test('sandaran menyalin semua tab kecuali sessions, dengan data yang sama', () => {
  const w = setupWithSuperadmin();
  w.ciptaGuru('SDN01');
  w.ctx.insert('subjek', { nama: '=HYPERLINK("http://jahat")', kategori: 'subjek' });
  const mesej = w.ctx.sandaranMingguan();
  assert.match(mesej, /Sandaran siap/);
  const ids = JSON.parse(w.env.props.SANDARAN_IDS);
  assert.equal(ids.length, 1);
  const f = w.env.fail.get(ids[0]);
  assert.match(f.getName(), /^SANDARAN Profil Guru SMIAAG \d{4}-\d{2}-\d{2}/);
  assert.equal(f.getSheetByName('sessions'), null, 'token sesi tidak disalin');
  assert.equal(f.getSheetByName('Sheet1'), null, 'tab lalai dibuang');
  const asal = w.env.ss.getSheetByName('guru').grid, salin = f.getSheetByName('guru').grid;
  assert.deepEqual(JSON.parse(JSON.stringify(salin)), JSON.parse(JSON.stringify(asal)));
  assert.ok(salin.some((r) => r.includes('SDN01')));
  assert.ok(f.getSheetByName('subjek').grid.some((r) => r.some((x) => typeof x === 'string' && x.startsWith("'=HYPERLINK"))), 'formula dineutralkan dalam sandaran');
  assert.ok(w.ctx.query('audit_log', { tindakan: 'SANDARAN' }).length === 1);
});

test('sandaran bergilir: maksimum 4 fail, yang paling lama ditulis semula dengan data terkini', () => {
  const w = setupWithSuperadmin();
  for (let i = 0; i < 4; i++) { w.env.advance(7 * 86400000); w.ctx.sandaranMingguan(); }
  const sebelum = JSON.parse(w.env.props.SANDARAN_IDS);
  assert.equal(sebelum.length, 4);
  w.ctx.insert('subjek', { nama: 'Subjek Selepas Sandaran', kategori: 'subjek' });
  w.env.advance(7 * 86400000);
  w.ctx.sandaranMingguan();
  const selepas = JSON.parse(w.env.props.SANDARAN_IDS);
  assert.equal(selepas.length, 4);
  assert.equal(w.env.fail.size, 4, 'tiada fail kelima dicipta');
  assert.equal(selepas[0], sebelum[3], 'fail paling lama diguna semula dan kini terbaru');
  const f = w.env.fail.get(selepas[0]);
  assert.ok(f.getSheetByName('subjek').grid.some((r) => r.includes('Subjek Selepas Sandaran')));
  assert.equal(f.getSheets().some((s) => s.getName().startsWith('~')), false, 'tiada tab sementara tertinggal');
  assert.equal(w.ctx.senaraiSandaran().length, 4);
});
