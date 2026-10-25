import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber } from '../format.js';

for (const [kind, cases] of [
  ['intelligence', [[55, '55.0'], [0.04, '0.04'], [5, '5.0'], [1.234, '1.23'], [1.235, '1.24'], [1.2, '1.2']]],
  ['cost', [[0.45, '0.45'], [0.006, '0.006'], [0.001, '0.001'], [1.8, '1.80'], [1.23456, '1.2346'], [1.23454, '1.2345'], [1.23, '1.23']]],
  ['time', [[25, '25'], [0.5, '0.5'], [10.25, '10.3'], [10.24, '10.2'], [10, '10']]],
]) {
  test(kind + ': rounds to maximum decimals and trims to its minimum', () => {
    for (const [value, expected] of cases) assert.equal(formatNumber(value, kind), expected);
  });
  test(kind + ': negative values retain sign and precision', () => {
    for (const [value, expected] of cases) assert.equal(formatNumber(-value, kind), '-' + expected);
  });
}

test('small distinct costs remain distinct and nonzero', () => {
  assert.equal(formatNumber(0.001, 'cost'), '0.001');
  assert.equal(formatNumber(0.004, 'cost'), '0.004');
  assert.notEqual(formatNumber(0.001, 'cost'), formatNumber(0.004, 'cost'));
  assert.notEqual(formatNumber(0.001, 'cost'), '0.00');
  assert.notEqual(formatNumber(0.004, 'cost'), '0.00');
});

test('zero and negative zero have no sign and keep the minimum decimals', () => {
  for (const [kind, expected] of [['cost', '0.00'], ['intelligence', '0.0'], ['time', '0']]) {
    assert.equal(formatNumber(0, kind), expected);
    assert.equal(formatNumber(-0, kind), expected);
  }
});

test('rounded zero never has a negative sign while representable losses keep their precision', () => {
  for (const [value, kind, expected] of [
    [-0.0015, 'intelligence', '0.0'],
    [-0.0015, 'time', '0'],
    [-0.0015, 'cost', '-0.0015'],
    [-0.04, 'intelligence', '-0.04'],
    [-0.04, 'time', '0'],
    [-0.4, 'time', '-0.4'],
    [-0.00001, 'cost', '0.00'],
  ]) {
    assert.equal(formatNumber(value, kind), expected);
    assert.equal(formatNumber(Math.abs(value), kind), expected.replace('-', ''));
  }
});

test('no padding beyond minimum or grouping separators', () => {
  assert.equal(formatNumber(1000, 'intelligence'), '1000.0');
  assert.equal(formatNumber(1000, 'cost'), '1000.00');
  assert.equal(formatNumber(1000, 'time'), '1000');
  assert.equal(formatNumber(0.003, 'cost'), '0.003');
  assert.equal(formatNumber(0.4, 'time'), '0.4');
});
