import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALIASES,
  compact,
  normalize,
  scoreApp,
  searchApps,
} from './search.mjs';

const APPS = [
  {
    id: 'sindig.unesa.ac.id',
    title: 'SIDIA',
    desc: 'Sistem Informasi Sinau Digital UNESA',
    host: 'sindig.unesa.ac.id',
  },
  {
    id: 'melisa.unesa.ac.id',
    title: 'MELISA',
    desc: 'Merdeka Belajar Kampus Merdeka',
    host: 'melisa.unesa.ac.id',
  },
  {
    id: 'ukt.unesa.ac.id',
    title: 'SIM UKT',
    desc: 'Sistem Informasi Manajemen UKT',
    host: 'ukt.unesa.ac.id',
  },
  {
    id: 'konseling.unesa.ac.id',
    title: 'e-Konseling',
    desc: 'Layanan kónséling mahasiswa',
    host: 'konseling.unesa.ac.id',
  },
  {
    id: 'mail.google.com',
    title: 'Gmail',
    desc: 'Email Google',
    host: 'mail.google.com',
  },
];

const melisa = APPS[1];

function titles(results) {
  return results.map((app) => app.title);
}

test('normalize lowercases, strips diacritics and punctuation, collapses space', () => {
  assert.equal(normalize('  Kónséling!  '), 'konseling');
  assert.equal(normalize('e-Konseling'), 'e konseling');
  assert.equal(normalize('SIM   UKT'), 'sim ukt');
  assert.equal(normalize('!!!'), '');
});

test('compact removes normalized whitespace', () => {
  assert.equal(compact('Me Li Sa'), 'melisa');
  assert.equal(compact('e-Konseling'), 'ekonseling');
});

test('typo mehlisa surfaces MELISA', () => {
  const results = searchApps(APPS, 'mehlisa');
  assert.equal(results[0].title, 'MELISA');
});

test('spaced compact query me li sa surfaces MELISA', () => {
  const results = searchApps(APPS, 'me li sa');
  assert.equal(results[0].title, 'MELISA');
});

test('magang alias surfaces MELISA', () => {
  const results = searchApps(APPS, 'magang');
  assert.deepEqual(titles(results), ['MELISA']);
  assert.ok(ALIASES.magang.includes('melisa.unesa.ac.id'));
});

test('MELISA and melisa both return MELISA first', () => {
  assert.equal(searchApps(APPS, 'MELISA')[0].title, 'MELISA');
  assert.equal(searchApps(APPS, 'melisa')[0].title, 'MELISA');
  assert.equal(searchApps(APPS, 'Melisa')[0].title, 'MELISA');
});

test('exact and prefix matches outrank fuzzy matches', () => {
  assert.equal(searchApps(APPS, 'mel')[0].title, 'MELISA');
  assert.equal(searchApps(APPS, 'melis')[0].title, 'MELISA');
  assert.ok(scoreApp(melisa, 'melisa') > scoreApp(melisa, 'mehlisa'));
  assert.ok(scoreApp(melisa, 'melis') > scoreApp(melisa, 'mehlisa'));
  assert.ok(scoreApp(melisa, 'me li sa') > scoreApp(melisa, 'mehlisa'));
});

test('alias matches outrank fuzzy matches', () => {
  assert.ok(scoreApp(melisa, 'magang') > scoreApp(melisa, 'mehlisa'));
});

test('other fixture apps rank on exact title and punctuation-normalized query', () => {
  assert.equal(searchApps(APPS, 'sidia')[0].title, 'SIDIA');
  assert.equal(searchApps(APPS, 'SIM UKT')[0].title, 'SIM UKT');
  assert.equal(searchApps(APPS, 'E-KONSELING!')[0].title, 'e-Konseling');
  assert.equal(searchApps(APPS, 'gmail')[0].title, 'Gmail');
});

test('diacritics in app data match plain ASCII queries', () => {
  assert.equal(searchApps(APPS, 'konseling')[0].title, 'e-Konseling');
});

test('empty or whitespace query keeps input order', () => {
  assert.deepEqual(searchApps(APPS, ''), APPS);
  assert.deepEqual(searchApps(APPS, '   '), APPS);
  assert.deepEqual(searchApps(APPS, '!!!'), APPS);
});

test('no results returns an empty array', () => {
  assert.deepEqual(searchApps(APPS, 'zzzzzz'), []);
});

test('search does not mutate inputs and is deterministic', () => {
  const snapshot = JSON.parse(JSON.stringify(APPS));
  const first = searchApps(APPS, 'melisa');
  const second = searchApps(APPS, 'melisa');

  assert.deepEqual(APPS, snapshot);
  assert.deepEqual(titles(first), titles(second));
  assert.notEqual(first, APPS);
});
