'use strict';
// Muat semua fail backend/*.gs ke dalam satu konteks vm, seperti Apps Script menggabungkannya.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createEnv } = require('./gas-mock');

const BACKEND = path.join(__dirname, '..', '..', 'backend');
const ORDER = ['Config.gs', 'Util.gs', 'Schema.gs', 'Repository.gs', 'Setup.gs', 'Auth.gs', 'Akaun.gs', 'Guru.gs', 'Kurikulum.gs', 'Import.gs', 'Kokurikulum.gs', 'Hem.gs', 'Dashboard.gs', 'Ganti.gs', 'Pdpa.gs', 'Ecuti.gs', 'Api.gs'];

function loadBackend(extraFiles = [], opts = {}) {
  const env = createEnv(opts);
  const ctx = vm.createContext(env);
  ORDER.concat(extraFiles).forEach((f) => {
    const p = path.join(BACKEND, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
  });
  return { ctx, env };
}

/** Backend yang sudah disediakan (setupTemplate telah dijalankan). */
function loadReady(opts = {}) {
  const b = loadBackend([], opts);
  b.ctx.setupTemplate();
  return b;
}

module.exports = { loadBackend, loadReady, ORDER, BACKEND };
