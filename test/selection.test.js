import test from 'node:test';
import assert from 'node:assert/strict';
import { models } from '../models.js';
import { DIRECTIONS, modelJumps, delta } from '../selection.js';

const entry = (id, intelligence, usdPerTask, timeSeconds = 10) => ({
  id, label: 'Synthetic Model ' + id, effort: 'medium',
  intelligence, usdPerTask, timeSeconds,
});
const current = entry('current', 50, 10);
const choose = (candidates, strategy = 'conservative', index = 0) =>
  modelJumps([current, ...candidates], current.id, strategy)[index];

test('synthetic dataset has ten labelled configurations, effort levels and missing data', () => {
  assert.equal(models.length, 10);
  assert.equal(new Set(models.map(model => model.id)).size, models.length);
  assert.ok(models.every(model => model.label.startsWith('Synthetic Model ')));
  assert.ok(new Set(models.map(model => model.effort)).size >= 3);
  assert.ok(models.filter(model => Object.values(model).includes(null)).length >= 2);
});

for (const strategy of ['conservative', 'best-value']) {
  test(strategy + ': all four directions are demonstrated and every target meets constraints', () => {
    const demo = modelJumps(models, 'synthetic-a-medium', strategy);
    assert.deepEqual(demo.map(result => result.direction), DIRECTIONS);
    assert.ok(demo.every(result => result.targetId !== null));
    for (const source of models.filter(model => model.intelligence !== null && model.timeSeconds !== null)) {
      for (const result of modelJumps(models, source.id, strategy)) {
        assert.equal(typeof result.reasoning, 'string');
        assert.ok(result.reasoning.length > 0);
        assert.equal(typeof result.direct, 'boolean');
        if (result.targetId === null) continue;
        assert.notEqual(result.targetId, source.id);
        const target = models.find(model => model.id === result.targetId);
        assert.ok(Number.isFinite(target.intelligence));
        assert.ok(Number.isFinite(target.usdPerTask));
        assert.ok(Number.isFinite(target.timeSeconds) && target.timeSeconds > 0);
        if (result.direction.startsWith('more-capable')) {
          assert.ok(target.intelligence > source.intelligence);
          assert.equal(result.direct, target.usdPerTask <= source.usdPerTask);
        } else {
          assert.ok(target.usdPerTask < source.usdPerTask);
          assert.equal(result.direct, target.intelligence >= source.intelligence);
        }
        if (result.direction.endsWith('no-slower')) assert.ok(target.timeSeconds <= source.timeSeconds);
      }
    }
  });

  test(strategy + ': no-slower is a hard filter and equal time is eligible', () => {
    const candidates = [
      entry('slow-up', 100, 1, 11), entry('equal-up', 60, 9, 10),
      entry('slow-saving', 50, 0, 11), entry('equal-saving', 50, 2, 10),
    ];
    const results = modelJumps([current, ...candidates], current.id, strategy);
    assert.deepEqual(results.map(result => result.targetId),
      ['slow-up', 'equal-up', 'slow-saving', 'equal-saving']);
  });

  test(strategy + ': direct upgrades rank score before cost; direct savings rank cost before score', () => {
    const candidates = [
      entry('score', 70, 9), entry('cost', 60, 1),
      entry('equal-cost', 80, 10),
    ];
    assert.equal(choose(candidates, strategy).targetId, 'equal-cost');
    assert.equal(choose(candidates, strategy, 2).targetId, 'cost');
  });

  test(strategy + ': exact metric ties resolve by time and then lexicographic ID', () => {
    const candidates = [
      entry('z', 60, 9, 8), entry('a', 60, 9, 9),
      entry('b', 60, 9, 8), entry('A', 60, 9, 8),
    ];
    for (const result of modelJumps([current, ...candidates], current.id, strategy)) {
      assert.equal(result.targetId, 'A');
    }
  });

  test(strategy + ': missing and nonfinite measurements and nonpositive time are excluded', () => {
    const invalid = [];
    for (const field of ['intelligence', 'usdPerTask', 'timeSeconds']) {
      for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
        invalid.push({ ...entry(field + String(value), 100, 0, 1), [field]: value });
      }
    }
    invalid.push(entry('zero-time', 100, 0, 0), entry('negative-time', 100, 0, -1));
    const results = modelJumps([current, ...invalid], current.id, strategy);
    assert.ok(results.every(result => result.targetId === null && result.direct === false));
    for (const bad of invalid) {
      assert.ok(modelJumps([bad], bad.id, strategy).every(result =>
        result.targetId === null && /missing or invalid/.test(result.reasoning)));
    }
  });

  test(strategy + ': equal intelligence saving is direct and outputs contain no nonfinite values', () => {
    const results = modelJumps([current, entry('equal', 50, 8), entry('loss', 49, 1)],
      current.id, strategy);
    assert.deepEqual(results.map(result => result.targetId), [null, null, 'equal', 'equal']);
    assert.ok(results.slice(2).every(result => result.direct));
    for (const result of results) {
      for (const value of Object.values(result)) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value));
        if (typeof value === 'string') assert.doesNotMatch(value, /Infinity|NaN/);
      }
    }
  });

  test(strategy + ': absent current and empty directions return four explanatory null results', () => {
    for (const data of [[], [current]]) {
      const results = modelJumps(data, 'unknown', strategy);
      assert.deepEqual(results.map(result => result.direction), DIRECTIONS);
      assert.ok(results.every(result => result.targetId === null && /unknown/.test(result.reasoning)));
    }
    assert.ok(modelJumps([current], current.id, strategy).every(result =>
      result.targetId === null && /No eligible/.test(result.reasoning)));
  });
}

test('strategies differ on upgrade and saving tradeoffs', () => {
  const upgrades = [entry('small', 51, 11), entry('large', 60, 12)];
  assert.equal(choose(upgrades).targetId, 'small');
  assert.equal(choose(upgrades, 'best-value').targetId, 'large');
  const savings = [entry('near', 49, 9), entry('far', 40, 0)];
  assert.equal(choose(savings, 'conservative', 2).targetId, 'near');
  // Increase the saving-to-loss ratio beyond the near candidate.
  savings[1].intelligence = 45;
  assert.equal(choose(savings, 'best-value', 2).targetId, 'far');
});

test('best value prioritises direct improvements over attractive tradeoff ratios', () => {
  assert.equal(choose([entry('direct', 51, 10), entry('ratio', 100, 10.01)],
    'best-value').targetId, 'direct');
  assert.equal(choose([entry('direct', 50, 9.99), entry('ratio', 49.99, 0)],
    'best-value', 2).targetId, 'direct');
});

test('conservative secondary ranks resolve equal scores and equal costs', () => {
  assert.equal(choose([entry('a', 60, 9), entry('b', 60, 8)]).targetId, 'b');
  assert.equal(choose([entry('a', 60, 11), entry('b', 70, 11)]).targetId, 'b');
  assert.equal(choose([entry('a', 50, 5), entry('b', 60, 5)], 'conservative', 2).targetId, 'b');
  assert.equal(choose([entry('a', 49, 5), entry('b', 49, 4)], 'conservative', 2).targetId, 'b');
});

test('best-value equal ratios use time then ID rather than conservative secondary ranks', () => {
  assert.equal(choose([entry('z', 60, 12, 9), entry('b', 55, 11, 8),
    entry('a', 65, 13, 8)], 'best-value').targetId, 'a');
  assert.equal(choose([entry('z', 45, 5, 9), entry('b', 48, 8, 8),
    entry('a', 49, 9, 8)], 'best-value', 2).targetId, 'a');
});

test('engine does not mutate models and returns stable repeated results', () => {
  const data = Object.freeze(models.map(model => Object.freeze({ ...model })));
  const before = JSON.stringify(data);
  assert.deepEqual(modelJumps(data, 'synthetic-a-medium', 'best-value'),
    modelJumps(data, 'synthetic-a-medium', 'best-value'));
  assert.equal(JSON.stringify(data), before);
});

test('delta returns signed unrounded measurement differences', () => {
  const source = entry('source', 42.5, 0.42, 31.2);
  const target = entry('target', 50, 0.30, 20);
  assert.deepEqual(delta(source, target), {
    intelligence: 7.5, usdPerTask: 0.30 - 0.42, timeSeconds: 20 - 31.2,
  });
  assert.deepEqual(delta(source, source), { intelligence: 0, usdPerTask: 0, timeSeconds: 0 });
  assert.deepEqual(delta(target, source), {
    intelligence: -7.5, usdPerTask: 0.42 - 0.30, timeSeconds: 31.2 - 20,
  });
});
