/**
 * DreamRave tests. The 36-channel table is typed here independently of the
 * engine, and the reference chart's expected values come from a MyBodyGraph
 * "Dream Rave Overview" (birth 25.08.1971 20:37 Hannover): Design moment
 * 18 Aug 1971 12:47 UTC, a single "Light Field activation" — Gate 20 Line 6,
 * Saturn — and the type Reflector.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BODIES, DREAM_CENTERS, DREAM_CHANNELS, DREAM_GATES, DREAM_REALMS, GATE_CENTER,
  calculateBirthPositions, calculateDreamRave, dreamDesignMoment, dreamRaveView, isDreamGate,
} from '../src/index.js';

const CHANNEL_TABLE = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52], [10, 20], [10, 34], [10, 57], [11, 56],
  [12, 22], [13, 33], [16, 48], [17, 62], [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43], [24, 61],
  [25, 51], [26, 44], [27, 50], [28, 38], [29, 46], [30, 41], [32, 54], [34, 57], [35, 36], [37, 40], [39, 55],
  [42, 53], [47, 64],
];
const rnd = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;

test('definition: 15 gates in three realms of five, in five centers, six channels', () => {
  assert.deepEqual(DREAM_REALMS.light.gates, [62, 20, 57, 8, 1]);
  assert.deepEqual(DREAM_REALMS.demon.gates, [19, 53, 42, 38, 28]);
  assert.deepEqual(DREAM_REALMS.earth.gates, [12, 15, 5, 50, 27]);
  assert.equal(new Set(DREAM_GATES).size, 15);
  const perCenter = {};
  for (const g of DREAM_GATES) perCenter[GATE_CENTER[g]] = (perCenter[GATE_CENTER[g]] ?? 0) + 1;
  assert.deepEqual(perCenter, { throat: 4, g: 2, sacral: 3, spleen: 3, root: 3 });
  assert.deepEqual(DREAM_CENTERS, ['throat', 'g', 'sacral', 'spleen', 'root']);
  const expected = CHANNEL_TABLE.filter(([a, b]) => isDreamGate(a) && isDreamGate(b)).map((c) => c.join('-')).sort();
  assert.deepEqual(expected, ['1-8', '20-57', '27-50', '28-38', '42-53', '5-15']);
  assert.deepEqual(DREAM_CHANNELS.map((c) => c.gates.join('-')).sort(), expected);
  for (const c of DREAM_CHANNELS) assert.deepEqual(c.centers, c.gates.map((g) => GATE_CENTER[g]));
});

test('reference chart 25.08.1971 20:37 Hannover (UTC+1): matches MyBodyGraph', () => {
  const r = calculateDreamRave('1971-08-25', 20 + 37 / 60, 1);
  assert.equal(r.designDateTime, '1971-08-18T12:47');
  assert.deepEqual(r.activations.map((a) => [a.body, a.side, a.gate, a.line, a.realm]), [['saturn', 'design', 20, 6, 'light']]);
  assert.deepEqual(r.gates, [20]);
  assert.deepEqual(r.channels, []);
  assert.deepEqual(r.definedCenters, []);
  assert.equal(r.type, 'Reflector');
  assert.deepEqual(Object.keys(r.views.personality.gates), []);
  assert.deepEqual(r.views.design.gates, { 20: 'design' });
});

test('the Design moment: the Moon is 88° (±0.02°) behind its birth position, days not months before', () => {
  const moon = (ms) => {
    const d = new Date(ms);
    return calculateBirthPositions(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours() + d.getUTCMinutes() / 60, 0).moon.longitude;
  };
  const next = rnd(99);
  for (let i = 0; i < 60; i++) {
    const birth = Math.floor((Date.UTC(1900, 0, 1) + next() * (Date.UTC(2024, 11, 31) - Date.UTC(1900, 0, 1))) / 60000) * 60000;
    const design = dreamDesignMoment(birth);
    const arc = (moon(birth) - moon(design) + 360) % 360;
    assert.ok(Math.abs(arc - 88) < 0.02, `${new Date(birth).toISOString()}: arc ${arc}`);
    const days = (birth - design) / 86400000;
    assert.ok(days > 5.5 && days < 8.5, `${days} days`);
  }
});

test('invariants over 200 random charts, every view', () => {
  const next = rnd(321);
  const table = new Set(CHANNEL_TABLE.map((c) => c.join('-')));
  for (let i = 0; i < 200; i++) {
    const t = Date.UTC(1900, 0, 1) + next() * (Date.UTC(2024, 11, 31) - Date.UTC(1900, 0, 1));
    const iso = new Date(t).toISOString();
    const r = calculateDreamRave(iso.slice(0, 10), Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60, 0);
    for (const a of r.activations) {
      assert.ok(isDreamGate(a.gate), iso);
      assert.ok(BODIES.includes(a.body));
      assert.equal(a.center, GATE_CENTER[a.gate]);
      assert.ok(DREAM_REALMS[a.realm].gates.includes(a.gate));
    }
    for (const view of ['both', 'personality', 'design']) {
      const v = r.views[view];
      assert.deepEqual(v, dreamRaveView(r, view));
      for (const [g, side] of Object.entries(v.gates)) {
        assert.ok(isDreamGate(+g));
        if (view !== 'both') assert.equal(side, view);
        assert.ok(r.views.both.gates[g]);
      }
      for (const c of v.channels) {
        assert.ok(table.has(c.gates.join('-')));
        assert.ok(c.gates.every((g) => v.gates[g]), 'a channel needs both gates');
      }
      const onChannels = new Set(v.channels.flatMap((c) => c.centers));
      assert.deepEqual([...v.definedCenters].sort(), [...onChannels].sort());
      for (const k of v.definedCenters) assert.ok(DREAM_CENTERS.includes(k));
    }
    assert.deepEqual(r.gates, Object.keys(r.views.both.gates).map(Number).sort((a, b) => a - b));
    assert.equal(r.type, r.definedCenters.length ? null : 'Reflector');
  }
});
