'use strict';
// Pastikan fail yang dijana (dist/Code.gs, docs/SKEMA.md) tidak ketinggalan berbanding sumber.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build: bundle } = require('../scripts/bundle-gas');
const { build: skema } = require('../scripts/jana-skema-md');

const root = path.join(__dirname, '..');
test('dist/Code.gs sepadan dengan backend/*.gs (jalankan: npm run bundle)', () => {
  assert.equal(fs.readFileSync(path.join(root, 'dist/Code.gs'), 'utf8'), bundle());
});
test('docs/SKEMA.md sepadan dengan Schema.gs (jalankan: npm run skema-md)', () => {
  assert.equal(fs.readFileSync(path.join(root, 'docs/SKEMA.md'), 'utf8'), skema());
});
test('dist/Code.gs boleh dimuat sebagai satu skrip (tiada pengisytiharan bertindih)', () => {
  const vm = require('node:vm');
  const { createEnv } = require('./helpers/gas-mock');
  const ctx = vm.createContext(createEnv());
  vm.runInContext(fs.readFileSync(path.join(root, 'dist/Code.gs'), 'utf8'), ctx);
  assert.equal(typeof ctx.doPost, 'function');
  assert.equal(typeof ctx.setupTemplate, 'function');
});
test('tiada rahsia atau ID Sheet sebenar dalam repo', () => {
  const bad = /AKfycb[\w-]{20,}|AIza[\w-]{30,}|sk-ant-[\w-]+|spreadsheets\/d\/[\w-]{25,}/;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (['.git', 'node_modules'].includes(e.name)) return [];
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : /\.(png|jpg)$/.test(e.name) ? [] : [p];
  });
  walk(root).forEach((f) => assert.doesNotMatch(fs.readFileSync(f, 'utf8'), bad, f));
});
