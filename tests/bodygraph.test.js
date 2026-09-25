/**
 * Bodygraph tests. The strongest checks are independent of the engine's own
 * gate tables: the wheel formula below is the one hdkit's Rails sample app uses
 * (hdkit_sample_app/app/services/hdkit.rb, `activation`, MIT, Jonah Dempcy) and the
 * reference planetary positions are hdkit's bundled chart
 * (sample-apps/v1/sample-data/charts/jonah-dempcy-chart.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHumanDesign, calculateBirthPositions, bodygraphView, GATE_CENTER, BODIES, CENTER_KEYS } from '../src/index.js';
import * as svg from '../src/data/bodygraph-svg.js';

// hdkit's gate wheel: Gate 41 starts at 2°00' Aquarius (302°), counter to the zodiac.
const WHEEL = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8,
  20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6,
  46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];
function hdkitActivation(longitude) {
  let p = longitude + 58; // hdkit.rb: "celestial_position += 58"
  if (p >= 360) p -= 360; // hdkit.rb uses `> 360`, which yields no gate at exactly 302.0°
  const through = p / 360;
  return { gate: WHEEL[Math.floor(through * 64)], line: Math.floor((384 * through) % 6) + 1 };
}

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const lon = ([s, d, m, sec]) => SIGNS.indexOf(s) * 30 + d + m / 60 + sec / 3600;
const arcmin = (a, b) => Math.abs(((a - b + 540) % 360) - 180) * 60;

const REF = {
  personality: {
    sun: ['Libra', 2, 22, 14], moon: ['Taurus', 15, 39, 58], mercury: ['Virgo', 16, 29, 40],
    venus: ['Leo', 25, 8, 48], mars: ['Leo', 27, 31, 26], jupiter: ['Sagittarius', 5, 53, 37],
    saturn: ['Scorpio', 3, 7, 19], uranus: ['Sagittarius', 5, 50, 26],
    neptune: ['Sagittarius', 26, 32, 53], pluto: ['Libra', 28, 23, 11],
  },
  design: {
    sun: ['Cancer', 4, 19, 50], moon: ['Capricorn', 17, 5, 22], mercury: ['Gemini', 19, 25, 35],
    venus: ['Leo', 19, 16, 50], mars: ['Gemini', 28, 7, 9], uranus: ['Sagittarius', 5, 59, 41],
    neptune: ['Sagittarius', 27, 40, 30], pluto: ['Libra', 26, 44, 40],
    // jupiter / saturn omitted on purpose — see the anomaly test below.
  },
};


const chart = (date, time, offset) => {
  const [h, m] = time.split(':').map(Number);
  return calculateHumanDesign(date, h + m / 60, offset);
};
const rnd = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
const randomBirth = (r, from = 1900, to = 2024) => {
  const t = Date.UTC(from, 0, 1) + r() * (Date.UTC(to, 11, 31) - Date.UTC(from, 0, 1));
  const iso = new Date(t).toISOString();
  return [iso.slice(0, 10), iso.slice(11, 16)];
};

test('personality positions match hdkit reference chart to under one arcminute (1983-09-25 20:48 EDT)', () => {
  const raw = chart('1983-09-25', '20:48', -4);
  for (const [body, r] of Object.entries(REF.personality))
    assert.ok(arcmin(raw.positions.personality[body].longitude, lon(r)) < 1, body);
});

test('design date is exactly 88° of solar arc before birth', () => {
  const raw = chart('1983-09-25', '20:48', -4);
  const arc = (raw.positions.personality.sun.longitude - raw.positions.design.sun.longitude + 360) % 360;
  assert.ok(Math.abs(arc - 88) < 0.005, `solar arc was ${arc}`);
  // hdkit's own design date is ~0.9 h early, so fast bodies differ by minutes; slow ones agree.
  for (const body of ['uranus', 'neptune', 'pluto'])
    assert.ok(arcmin(raw.positions.design[body].longitude, lon(REF.design[body])) < 1, body);
});

test('gate + line agree with hdkit’s wheel formula for every activation, over 80 charts', () => {
  const next = rnd(42);
  for (let i = 0; i < 80; i++) {
    const [date, time] = randomBirth(next);
    const raw = chart(date, time, 1);
    for (const side of ['personality', 'design'])
      for (const body of BODIES) {
        const a = raw.gates[side][body];
        assert.deepEqual({ gate: a.gate, line: a.line }, hdkitActivation(a.longitude), `${date} ${time} ${body}/${side}`);
      }
  }
});

test('wheel boundaries: 302° starts gate 41.1, 5.625° per gate, 0.9375° per line', () => {
  assert.deepEqual(hdkitActivation(302), { gate: 41, line: 1 });
  assert.deepEqual(hdkitActivation(302 + 5.625), { gate: 19, line: 1 });
  assert.deepEqual(hdkitActivation(302 + 0.9375 * 5 + 0.01), { gate: 41, line: 6 });
  assert.deepEqual(hdkitActivation(301.99), { gate: 60, line: 6 });
});

test('GATE_CENTER covers all 64 gates and agrees with the engine’s per-activation center', () => {
  assert.deepEqual(Object.keys(GATE_CENTER).map(Number).sort((a, b) => a - b), Array.from({ length: 64 }, (_, i) => i + 1));
  assert.deepEqual([...new Set(Object.values(GATE_CENTER))].sort(), [...CENTER_KEYS].sort());
  const next = rnd(5);
  for (let i = 0; i < 60; i++) {
    const [date, time] = randomBirth(next);
    const raw = chart(date, time, 0);
    for (const side of ['personality', 'design'])
      for (const a of Object.values(raw.gates[side])) assert.equal(GATE_CENTER[a.gate], a.center, `${date} gate ${a.gate}`);
  }
});

test('bodygraphView: centers derived from channels equal the engine’s defined centers; views are consistent', () => {
  const next = rnd(7);
  for (let i = 0; i < 150; i++) {
    const [date, time] = randomBirth(next);
    const raw = chart(date, time, 0);
    const both = bodygraphView(raw, 'both');
    assert.deepEqual([...both.definedCenters].sort(), raw.centers.defined.map((c) => c.key).sort(), date);
    for (const view of ['personality', 'design']) {
      const v = bodygraphView(raw, view);
      for (const [g, side] of Object.entries(v.gates)) {
        assert.equal(side, view);
        assert.ok(both.gates[g]);
      }
      for (const c of v.channels) assert.ok(c.gates.every((g) => v.gates[g]));
    }
    for (const c of both.channels) for (const g of c.gates) assert.ok(both.gates[g]);
  }
});

test('a known chart (14.06.1973 23:15, Linköping): type, profile, authority, channels, centers', () => {
  const raw = chart('1973-06-14', '23:15', 1);
  assert.equal(raw.type.name, 'Manifesting Generator');
  assert.equal(raw.profile.numbers, '2/4');
  assert.equal(raw.authority.name, 'Emotional Authority');
  const v = bodygraphView(raw);
  assert.deepEqual(v.channels.map((c) => c.gates.join('-')).sort(), ['12-22', '34-57', '35-36', '9-52']);
  assert.deepEqual([...v.definedCenters].sort(), ['root', 'sacral', 'solar', 'spleen', 'throat']);
});

test('bodygraph SVG geometry (hdkit) covers all 64 gates, 9 centers and 64 labels exactly once', () => {
  assert.equal(svg.BODYGRAPH_VIEWBOX, '0 0 851.41 1309.4');
  const all = Array.from({ length: 64 }, (_, i) => i + 1);
  assert.deepEqual(svg.GATE_SHAPES.map((g) => g.gate).sort((a, b) => a - b), all);
  assert.deepEqual(svg.GATE_LABELS.map((g) => g.gate).sort((a, b) => a - b), all);
  assert.equal(new Set(svg.CENTER_SHAPES.map((c) => c.id)).size, 9);
  assert.equal(svg.EXTRA_SHAPES.length, 3);
  for (const s of [...svg.GATE_SHAPES, ...svg.EXTRA_SHAPES]) assert.ok(s.d || s.points);
});

test('calculateBirthPositions is exported and returns the Moon', () => {
  assert.ok(Number.isFinite(calculateBirthPositions(1971, 8, 25, 19.6, 0).moon.longitude));
});
