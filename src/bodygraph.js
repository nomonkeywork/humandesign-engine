/**
 * Bodygraph helpers on top of a calculateHumanDesign() result: which center a
 * gate belongs to, and what a Personality / Design / combined view shows.
 * Pure functions, no I/O.
 */

export const BODIES = [
  'sun', 'earth', 'moon', 'northNode', 'southNode', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];

export const CENTER_KEYS = ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'];

/** Which center each of the 64 gates belongs to (checked against the engine's own tables in tests). */
export const GATE_CENTER = Object.fromEntries(
  [
    ['head', [64, 61, 63]],
    ['ajna', [47, 24, 4, 17, 43, 11]],
    ['throat', [62, 23, 56, 16, 20, 31, 8, 33, 35, 12, 45]],
    ['g', [1, 13, 25, 46, 2, 15, 10, 7]],
    ['heart', [21, 51, 26, 40]],
    ['spleen', [48, 57, 44, 50, 32, 28, 18]],
    ['solar', [36, 22, 37, 6, 49, 55, 30]],
    ['sacral', [5, 14, 29, 34, 27, 59, 42, 3, 9]],
    ['root', [53, 60, 52, 19, 39, 41, 58, 38, 54]],
  ].flatMap(([center, gates]) => gates.map((gate) => [gate, center]))
);

/**
 * What a bodygraph shows for one view: `'personality'` (birth moment),
 * `'design'` (88° of solar arc before) or `'both'`. A gate carries the side(s)
 * that activate it; a channel is defined iff both its gates are active in the
 * view, a center iff it lies on such a channel.
 *
 * @param {object} chart result of calculateHumanDesign()
 * @param {'both'|'personality'|'design'} [view]
 * @returns {{ gates: Record<number,'personality'|'design'|'both'>, channels: object[], definedCenters: string[] }}
 */
export function bodygraphView(chart, view = 'both') {
  const sides = { personality: new Set(), design: new Set() };
  for (const side of ['personality', 'design'])
    for (const activation of Object.values(chart.gates[side] ?? {})) sides[side].add(activation.gate);
  const gates = {};
  for (let gate = 1; gate <= 64; gate++) {
    const p = view !== 'design' && sides.personality.has(gate);
    const d = view !== 'personality' && sides.design.has(gate);
    if (p || d) gates[gate] = p && d ? 'both' : p ? 'personality' : 'design';
  }
  const channels = (chart.channels ?? []).filter((c) => c.gates.every((g) => gates[g]));
  const definedCenters = CENTER_KEYS.filter((key) => channels.some((c) => c.centers.includes(key)));
  return { gates, channels, definedCenters };
}
