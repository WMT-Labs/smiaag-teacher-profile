'use strict';
// Tiruan ringkas perkhidmatan Google Apps Script supaya fail .gs boleh diuji di Node.
// Sheets disimpan dalam memori; tiada apa-apa dihantar ke Google.

const crypto = require('node:crypto');

function chain() { // objek yang menerima apa-apa panggilan pemformatan dan memulangkan dirinya
  const p = new Proxy(function () {}, { get: () => p, apply: () => p });
  return p;
}

class FakeSheet {
  constructor(name) { this.name = name; this.grid = []; this.maxRows = 1000; }
  getLastRow() { return this.grid.length; }
  getMaxColumns() { return 26; }
  insertColumnBefore(c) { this.grid.forEach((row) => row.splice(c - 1, 0, '')); }
  insertColumnAfter(c) { this.grid.forEach((row) => row.splice(c, 0, '')); }
  getLastColumn() { return this.grid.reduce((m, r) => Math.max(m, r.length), 0); }
  getMaxRows() { return this.maxRows; }
  insertRowsAfter() { this.maxRows++; }
  deleteRow(n) { this.grid.splice(n - 1, 1); }
  setFrozenRows() {} setTabColor() {}
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this;
    return {
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = [];
          for (let j = 0; j < nc; j++) { const v = (sh.grid[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); }
          out.push(row);
        }
        return out;
      },
      setValues(vals) {
        vals.forEach((row, i) => {
          sh.grid[r - 1 + i] = sh.grid[r - 1 + i] || [];
          row.forEach((v, j) => { sh.grid[r - 1 + i][c - 1 + j] = v; });
        });
        return this;
      },
      clearContent() {
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (sh.grid[r - 1 + i]) sh.grid[r - 1 + i][c - 1 + j] = '';
        // buang baris kosong di hujung supaya getLastRow() tepat (seperti Sheets)
        while (sh.grid.length && sh.grid[sh.grid.length - 1].every((x) => x === '' || x === undefined)) sh.grid.pop();
        return this;
      },
      setNumberFormat() { return this; }, setBackground() { return this; },
      setFontColor() { return this; }, setFontWeight() { return this; }
    };
  }
}

class FakeSpreadsheet {
  constructor() { this.sheets = new Map(); this.id = 'ss-contoh'; this.sheets.set('Sheet1', new FakeSheet('Sheet1')); }
  getId() { return this.id; }
  getName() { return 'Sheet Contoh'; }
  setSpreadsheetTimeZone(tz) { this.tz = tz; }
  getSheets() { return [...this.sheets.values()]; }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  insertSheet(n) { const s = new FakeSheet(n); this.sheets.set(n, s); return s; }
  deleteSheet(s) { this.sheets.delete(s.name); }
}

function pad(n) { return String(n).padStart(2, '0'); }

function createEnv(opts = {}) {
  const ss = new FakeSpreadsheet();
  const props = {};
  const logs = [];
  const cache = new Map();
  const drive = { folders: new Map(), files: new Map() };
  const makeFolder = (id, name) => ({
    id, name, getId: () => id,
    createFile: (blob) => {
      const fid = 'file-' + (drive.files.size + 1);
      const f = { id: fid, folder: id, blob, trashed: false, getId: () => fid, getBlob: () => blob, setTrashed(t) { this.trashed = t; } };
      drive.files.set(fid, f); return f;
    }
  });
  const now = () => (clock ? clock.getTime() : Date.now());
  let clock = new Date('2026-11-06T10:30:00Z');
  const env = {
    ss, props, logs,
    setNow(d) { clock = new Date(d); },
    advance(ms) { clock = new Date(clock.getTime() + ms); },
    console,
    Logger: { log: (m) => logs.push(m) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    cache,
    drive,
    DriveApp: {
      createFolder: (name) => { const id = 'folder-' + (drive.folders.size + 1); const f = makeFolder(id, name); drive.folders.set(id, f); return f; },
      getFolderById: (id) => { const f = drive.folders.get(id); if (!f) throw new Error('tiada folder'); return f; },
      getFileById: (id) => { const f = drive.files.get(id); if (!f) throw new Error('tiada fail'); return f; }
    },
    CacheService: { getScriptCache: () => ({
      get: (k) => { const e = cache.get(k); return e && e.until > now() ? e.v : null; },
      put: (k, v, ttl = 600) => { cache.set(k, { v: String(v), until: now() + Math.min(ttl, 21600) * 1000 }); },
      remove: (k) => { cache.delete(k); },
      getAll: (keys) => { const o = {}; keys.forEach((k) => { const e = cache.get(k); if (e && e.until > now()) o[k] = e.v; }); return o; }
    }) },
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64Decode: (str) => { if (!/^[A-Za-z0-9+/=]*$/.test(str)) throw new Error('base64'); return [...Buffer.from(str, 'base64')].map((b) => (b > 127 ? b - 256 : b)); },
      base64Encode: (bytes) => Buffer.from(bytes.map((b) => (b + 256) % 256)).toString('base64'),
      newBlob: (bytes, type, name) => ({ bytes, type, name, getBytes: () => bytes, getContentType: () => type }),
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      // Apps Script memulangkan bait bertanda (-128..127)
      computeDigest: (alg, value) => [...crypto.createHash(alg).update(String(value), 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
      // Hanya corak yang digunakan oleh sistem; zon waktu tetap +08:00.
      formatDate(d, _tz, fmt) {
        const t = new Date(d.getTime() + 8 * 3600 * 1000);
        const map = { yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()), XXX: '+08:00' };
        return fmt.replace(/'T'/g, 'T').replace(/yyyy|MM|dd|HH|mm|ss|XXX/g, (k) => map[k]);
      }
    },
    Date: class extends Date { constructor(...a) { if (a.length === 0) { super(clock.getTime()); } else { super(...a); } } static now() { return clock.getTime(); } }
  };
  if (opts.realClock) { env.Date = Date; clock = null; env.setNow = env.advance = () => { throw new Error('realClock'); }; }
  return env;
}

module.exports = { createEnv, chain, FakeSheet };
