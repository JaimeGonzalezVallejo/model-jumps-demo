import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRows } from '../own-data.js';

test('five and four fields parse with optional effort', () => {
  assert.deepEqual(parseRows('Model A, medium, 47.8, 0.21, 14\nModel B, 50.2, 0.32, 39'), {
    models: [
      { id: 'user-1', label: 'Model A', effort: 'medium', intelligence: 47.8, usdPerTask: 0.21, timeSeconds: 14 },
      { id: 'user-2', label: 'Model B', effort: '', intelligence: 50.2, usdPerTask: 0.32, timeSeconds: 39 },
    ], skipped: 0,
  });
  assert.equal(parseRows('A,,1,0,2').models[0].effort, '');
});

test('tab-separated spreadsheet numbers accept comma decimals', () => {
  const result = parseRows('A\tmedium\t47,8\t0,21\t14,5\r\nB\t50.2\t0.32\t39');
  assert.equal(result.skipped, 0);
  assert.deepEqual(result.models.map(({ intelligence, usdPerTask, timeSeconds }) =>
    [intelligence, usdPerTask, timeSeconds]), [[47.8, 0.21, 14.5], [50.2, 0.32, 39]]);
  assert.equal(parseRows('A, medium, 47,8, 0,21, 14,5').skipped, 1);
});

test('blank lines and trimmed comments do not count as skipped', () => {
  const result = parseRows('\n  # name, effort, score, cost, seconds\n  \nA,1,0,2\n\t# ignored\n');
  assert.equal(result.models.length, 1);
  assert.equal(result.skipped, 0);
});

test('missing, nonnumeric and nonfinite measurements skip the whole line', () => {
  for (const bad of ['', ' ', 'abc', 'NaN', 'Infinity', '-Infinity', '1e999', '0x10', '1.2.3']) {
    for (let index = 0; index < 3; index++) {
      const fields = ['1', '0', '2'];
      fields[index] = bad;
      assert.deepEqual(parseRows('A,medium,' + fields.join(',')), { models: [], skipped: 1 });
    }
  }
  for (const line of ['A,1,2', 'A,medium,1,2,3,extra', 'A,1,2,0', 'A,1,2,-1']) {
    assert.deepEqual(parseRows(line), { models: [], skipped: 1 });
  }
});

test('empty and whitespace input never throws', () => {
  for (const input of ['', ' \n\t\r\n  ']) {
    assert.deepEqual(parseRows(input), { models: [], skipped: 0 });
  }
});

test('names and effort are trimmed and empty names are rejected', () => {
  const result = parseRows('  A  , medium ,1,0,2\n ,medium,1,0,2\n\tmedium\t1\t0\t2');
  assert.equal(result.models[0].label, 'A');
  assert.equal(result.models[0].effort, 'medium');
  assert.equal(result.skipped, 2);
});

test('duplicate names are retained with sequential IDs in usable line order', () => {
  const result = parseRows('# comment\nSame,1,0,2\nbroken\nSame,2,1,3\nSame,3,2,4');
  assert.deepEqual(result.models.map(model => model.id), ['user-1', 'user-2', 'user-3']);
  assert.deepEqual(result.models.map(model => model.label), ['Same', 'Same', 'Same']);
  assert.equal(result.skipped, 1);
});

test('markup-like names and effort are preserved as literal data', () => {
  const label = '<img src=x onerror=window.pwned=1>';
  const result = parseRows('<b>Model</b>,<b>high</b>,1,0,2\n' + label + ',2,1,3');
  assert.equal(result.models[0].label, '<b>Model</b>');
  assert.equal(result.models[0].effort, '<b>high</b>');
  assert.equal(result.models[1].label, label);
});

test('negative scores and costs and zero cost are finite, while seconds must be positive', () => {
  const result = parseRows('A,-1,-0.2,.5\nB,+2,0,1e2');
  assert.equal(result.models.length, 2);
  assert.equal(result.skipped, 0);
  assert.equal(result.models[0].timeSeconds, 0.5);
  assert.equal(result.models[1].timeSeconds, 100);
});

test('extra delimiters, quoted comma names and comma names in tab rows are rejected', () => {
  for (const line of ['A,B,medium,1,2,3', '"A,B",medium,1,2,3', 'A,B\tmedium\t1\t2\t3']) {
    assert.deepEqual(parseRows(line), { models: [], skipped: 1 });
  }
});
