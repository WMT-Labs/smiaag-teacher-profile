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
      setNumberFormat() { return this; }, setBackground() { return this; },
      setFontColor() { return this; }, setFontWeight() { return this; }
    };
  }
}

class FakeSpreadsheet {
  constructor() { this.sheets = new Map(); this.id = 'ss-contoh'; this.sheets.set('Sheet1', new FakeSheet('Sheet1')); }
  getId() { return this.id; }
  getName() { return 'Sheet Contoh'; }
  getSheets() { return [...this.sheets.values()]; }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  insertSheet(n) { const s = new FakeSheet(n); this.sheets.set(n, s); return s; }
  deleteSheet(s) { this.sheets.delete(s.name); }
}

function pad(n) { return String(n).padStart(2, '0'); }

function createEnv() {
  const ss = new FakeSpreadsheet();
  const props = {};
  const logs = [];
  let clock = new Date('2026-11-06T10:30:00Z');
  const env = {
    ss, props, logs,
    setNow(d) { clock = new Date(d); },
    console,
    Logger: { log: (m) => logs.push(m) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => { const m = new Map(); return { get: (k) => m.get(k) || null, put: (k, v) => m.set(k, v), remove: (k) => m.delete(k) }; } },
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      // Hanya corak yang digunakan oleh sistem; zon waktu tetap +08:00.
      formatDate(d, _tz, fmt) {
        const t = new Date(d.getTime() + 8 * 3600 * 1000);
        const map = { yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds()), XXX: '+08:00' };
        return fmt.replace(/'T'/g, 'T').replace(/yyyy|MM|dd|HH|mm|ss|XXX/g, (k) => map[k]);
      }
    },
    Date: class extends Date { constructor(...a) { if (a.length === 0) { super(clock.getTime()); } else { super(...a); } } static now() { return clock.getTime(); } }
  };
  return env;
}

module.exports = { createEnv, chain, FakeSheet };
