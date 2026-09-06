import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHumanDesign } from '../src/index.js';

test('calculates a focused Human Design chart', () => {
  const chart = calculateHumanDesign('1973-06-14', 23.25, 1);
  assert.equal(chart.type.name, 'Manifesting Generator');
  assert.equal(chart.profile.numbers, '2/4');
  assert.equal(chart.authority.name, 'Emotional Authority');
  assert.equal(chart.variable.determination.tone, 4);
  assert.equal(chart.variable.environment.tone, 3);
});
