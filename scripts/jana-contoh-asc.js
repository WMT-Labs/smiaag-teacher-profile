#!/usr/bin/env node
'use strict';
// Jana fail contoh eksport aSc (frontend/contoh/asc-contoh.xml) dengan guru PALSU, untuk demo dan ujian.
const fs = require('node:fs');
const path = require('node:path');
const WAKTU = [['7:30', '7:40'], ['7:40', '8:10'], ['8:10', '8:40'], ['8:40', '9:00'], ['9:00', '9:40'], ['9:40', '10:00'], ['10:00', '10:30'], ['10:30', '11:00'], ['11:00', '11:30'],
  ['11:30', '12:00'], ['12:00', '12:30'], ['12:30', '12:55'], ['12:55', '13:20'], ['13:20', '13:45'], ['13:45', '14:05'], ['14:05', '14:30'], ['14:30', '15:00'], ['15:00', '15:30']];
const HARI = [['Isnin', '10000'], ['Selasa', '01000'], ['Rabu', '00100'], ['Khamis', '00010'], ['Jumaat', '00001']];
const SUBJ = [['PI', 'Pendidikan Islam'], ['DQT/J', 'Dirasat Al-Quran Tilawah dan Tajwid'], ['PIW', 'Pendidikan Ilmu Wahyu'], ['PQS', 'Pendidikan Al-Quran dan As-Sunnah'],
  ['MAT', 'Matematik'], ['SNS', 'Sains'], ['PHM', 'Perhimpunan'], ['KOKU', 'Kokurikulum'], ['USR', 'Usrah'], ['TMK', 'Teknologi Maklumat']];
const KELAS = ['1 Abu Bakar', '1 Umar', '2 Uthman', '2 Ali', '3 Hamzah', '4 Khalid', '5 Bilal', '6 Rekaan'];
const GURU = [['Guru Contoh Satu', 'SM901'], ['Pentadbir Contoh', 'AD901'], ['Guru Contoh Dua', 'SM902'], ['Guru Rekaan Tiada Dalam Sistem', 'XX99']];
// [guru, subjek, kelas[], hari, waktu[]]
const PELAJARAN = [
  [0, 'PHM', [], 0, [1, 2, 3]], [0, 'DQT/J', ['1 Abu Bakar', '1 Umar'], 0, [4, 5]], [0, 'PI', ['2 Uthman'], 0, [9, 10, 11]],
  [0, 'PI', ['2 Ali'], 1, [7, 8]], [0, 'USR', [], 1, [17, 18]], [0, 'PIW', ['2 Uthman', '2 Ali'], 2, [3, 4]], [0, 'KOKU', [], 2, [17, 18]],
  [0, 'PI', ['2 Uthman'], 3, [2, 3]], [0, 'PQS', ['5 Bilal'], 3, [12, 13]], [0, 'DQT/J', ['3 Hamzah'], 4, [3, 4]],
  [1, 'PHM', [], 0, [1, 2, 3]], [1, 'MAT', ['2 Ali'], 1, [8]], [1, 'MAT', ['4 Khalid'], 2, [7, 8, 9]], [1, 'MAT', ['5 Bilal'], 3, [5, 6]],
  [2, 'PHM', [], 0, [1, 2, 3]], [2, 'SNS', ['1 Abu Bakar'], 0, [4, 5]], [2, 'SNS', ['1 Umar'], 1, [2, 3]], [2, 'SNS', ['6 Rekaan'], 2, [9, 10]],
  [2, 'TMK', ['3 Hamzah'], 3, [7, 8]], [2, 'SNS', ['1 Abu Bakar'], 4, [3, 4]],
  [3, 'PI', ['4 Khalid'], 0, [7, 8]], [3, 'PI', ['5 Bilal'], 2, [11, 12]]
];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const L = ['<?xml version="1.0" encoding="UTF-8"?>', '<timetable ascttversion="2024.0" importtype="database" options="idprefix:CONTOH" displayname="Contoh SMIAAG (data palsu)">'];
L.push(' <periods columns="period,name,short,starttime,endtime">');
WAKTU.forEach(([a, b], i) => L.push(`  <period name="${i + 1}" short="${i + 1}" period="${i + 1}" starttime="${a}" endtime="${b}"/>`));
L.push(' </periods>', ' <daysdefs columns="id,name,short,days">');
HARI.forEach(([n, d], i) => L.push(`  <daysdef id="D${i + 1}" name="${n}" short="${n.slice(0, 3).toUpperCase()}" days="${d}"/>`));
L.push(' </daysdefs>', ' <subjects columns="id,name,short">');
SUBJ.forEach(([k, n], i) => L.push(`  <subject id="S${i + 1}" name="${esc(n)}" short="${esc(k)}"/>`));
L.push(' </subjects>', ' <teachers columns="id,name,short">');
GURU.forEach(([n, k], i) => L.push(`  <teacher id="T${i + 1}" name="${esc(n)}" short="${k}"/>`));
L.push(' </teachers>', ' <classes columns="id,name,short">');
KELAS.forEach((n, i) => L.push(`  <class id="C${i + 1}" name="${esc(n)}" short="${n.replace(/\s/g, '').slice(0, 5).toUpperCase()}"/>`));
L.push(' </classes>', ' <lessons columns="id,subjectid,classids,teacherids,periodspercard,periodsperweek">');
PELAJARAN.forEach(([g, s, k, , w], i) => L.push(`  <lesson id="L${i + 1}" subjectid="S${SUBJ.findIndex((x) => x[0] === s) + 1}" classids="${k.map((n) => 'C' + (KELAS.indexOf(n) + 1)).join(',')}" teacherids="T${g + 1}" periodspercard="${w.length}" periodsperweek="${w.length}"/>`));
L.push(' </lessons>', ' <cards columns="lessonid,period,days,weeks">');
PELAJARAN.forEach(([, , , h, w], i) => w.forEach((p) => L.push(`  <card lessonid="L${i + 1}" period="${p}" days="${HARI[h][1]}" weeks="1"/>`)));
L.push(' </cards>', '</timetable>', '');
const out = path.join(__dirname, '..', 'frontend', 'contoh', 'asc-contoh.xml');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, L.join('\n'));
console.log('Siap: frontend/contoh/asc-contoh.xml');
