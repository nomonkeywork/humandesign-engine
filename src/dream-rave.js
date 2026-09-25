/**
 * The DreamRave — Ra Uru Hu's chart of the sleeping body ("the Design of the
 * Dreamer"). It is not the standard chart filtered down, and it has no
 * Personality/Design split. It is one calculation:
 *
 *  - take the moment the Moon stood 88° of arc before its birth position
 *    (about 7 days before birth);
 *  - read the positions of the 13 bodies at that moment — one set of
 *    activations, not two columns;
 *  - only 15 of the 64 gates exist, in three realms of five (Light Field,
 *    Demon Realm, Earth Plane), sitting in five centers: Throat, G, Sacral,
 *    Spleen, Root (Head, Ajna, Heart/Ego and Solar Plexus are absent) — only
 *    activations on those 15 count;
 *  - a channel needs both gates, so only six channels exist; a center is
 *    defined iff it lies on one.
 *
 * Verified against a MyBodyGraph "Dream Rave Overview" (see tests). Not
 * documented in anything we have, and therefore not asserted: how a
 * Generator/Projector/Manifestor type is derived for the DreamRave — `type` is
 * 'Reflector' when no center is defined and null otherwise.
 */

import { calculateBirthPositions } from './calculators/astronomy.js';
import calculateHumanDesign from './calculators/humandesign.js';
import { parseDateComponents } from './calculators/utils.js';
import { BODIES, GATE_CENTER } from './bodygraph.js';

export const DREAM_REALMS = {
  light: { label: 'Light Field', gates: [62, 20, 57, 8, 1] },
  demon: { label: 'Demon Realm', gates: [19, 53, 42, 38, 28] },
  earth: { label: 'Earth Plane', gates: [12, 15, 5, 50, 27] },
};
export const DREAM_GATES = Object.values(DREAM_REALMS).flatMap((realm) => realm.gates);
export const DREAM_CENTERS = ['throat', 'g', 'sacral', 'spleen', 'root'];

/** The standard channels whose two gates are both DreamRave gates. */
export const DREAM_CHANNELS = [
  { gates: [1, 8], name: 'Inspiration', circuit: 'individual' },
  { gates: [5, 15], name: 'Rhythm', circuit: 'collective' },
  { gates: [20, 57], name: 'The Brainwave', circuit: 'integration' },
  { gates: [27, 50], name: 'Preservation', circuit: 'tribal' },
  { gates: [28, 38], name: 'Struggle', circuit: 'individual' },
  { gates: [42, 53], name: 'Maturation', circuit: 'collective' },
].map((c) => ({ ...c, centers: c.gates.map((g) => GATE_CENTER[g]) }));

export const isDreamGate = (gate) => DREAM_GATES.includes(gate);
export const dreamRealmOf = (gate) =>
  Object.keys(DREAM_REALMS).find((realm) => DREAM_REALMS[realm].gates.includes(gate)) ?? null;

const MINUTE = 60_000;
const DAY = 86_400_000;

// The astronomy module truncates fractional minutes; nudge by a hair so 12:47 never becomes 12:46.
const parts = (ms) => {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours() + (d.getUTCMinutes() + 0.01) / 60,
  };
};
const moonAt = (ms) => {
  const p = parts(ms);
  return calculateBirthPositions(p.year, p.month, p.day, p.hour, 0).moon.longitude;
};

/**
 * The DreamRave moment: the last whole UTC minute before the Moon has
 * moved 88° back from its birth position (how MyBodyGraph rounds; at most
 * 0.01° of Moon motion).
 *
 * @param {number} birthUtcMs the birth moment, UTC epoch milliseconds
 * @returns {number} epoch milliseconds (UTC)
 */
export function dreamMoment(birthUtcMs) {
  const natal = moonAt(birthUtcMs);
  const behind = (ms) => (((natal - moonAt(ms)) % 360) + 360) % 360; // degrees the Moon has yet to travel

  let t = birthUtcMs - 6.7 * DAY; // 88° at the Moon's mean 13.18°/day
  for (let i = 0; i < 12; i++) {
    const err = behind(t) - 88;
    if (Math.abs(err) < 1e-4) break;
    t += (err / 13.18) * DAY;
  }
  let m = Math.round(t / MINUTE);
  while (behind(m * MINUTE) > 88) m++; // first minute the Moon has reached −88°
  while (behind((m - 1) * MINUTE) <= 88) m--;
  return (m - 1) * MINUTE;
}

/**
 * What a set of activations makes of the DreamRave: the active gates, the
 * channels with both gates active, and the centers on those channels.
 */
export function dreamRaveState(activations) {
  const gates = [...new Set(activations.map((a) => a.gate))].sort((x, y) => x - y);
  const channels = DREAM_CHANNELS.filter((c) => c.gates.every((g) => gates.includes(g)));
  const definedCenters = DREAM_CENTERS.filter((key) => channels.some((c) => c.centers.includes(key)));
  return { gates, channels, definedCenters };
}

/**
 * Calculate the DreamRave for a birth moment (same arguments as
 * calculateHumanDesign).
 *
 * @param {string} birthDate YYYY-MM-DD (local)
 * @param {number} [birthHour] decimal local hour (23.25 = 23:15)
 * @param {number} [timezone] UTC offset in hours at the birth moment
 */
export function calculateDreamRave(birthDate, birthHour = 12, timezone = 0) {
  const { year, month, day } = parseDateComponents(birthDate);
  const birthMs = Date.UTC(year, month - 1, day, 0, Math.round(birthHour * 60) - Math.round(timezone * 60));
  const ms = dreamMoment(birthMs);

  const p = parts(ms);
  const iso = `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  const at = calculateHumanDesign(iso, p.hour, 0).gates.personality; // the positions at that instant

  const activations = [];
  for (const body of BODIES) {
    const a = at[body];
    if (a && isDreamGate(a.gate))
      activations.push({ body, gate: a.gate, line: a.line, color: a.color, tone: a.tone, base: a.base, longitude: a.longitude, center: GATE_CENTER[a.gate], realm: dreamRealmOf(a.gate) });
  }

  const state = dreamRaveState(activations);
  return {
    dateTime: new Date(ms).toISOString().slice(0, 16), // UTC
    activations,
    gates: state.gates,
    channels: state.channels,
    definedCenters: state.definedCenters,
    type: state.definedCenters.length ? null : 'Reflector',
  };
}
