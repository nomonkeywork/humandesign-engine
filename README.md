# Human Design Engine

Focused Human Design calculation. This repository contains only the Human Design calculator, its astronomical dependencies, timezone helpers, and an MCP server for AI assistants.

## Use as a library

```js
import { calculateHumanDesign, resolveUtcOffset } from 'humandesign-engine';

const offset = resolveUtcOffset('1973-06-14', '23:15', 'Europe/Stockholm');
const chart = calculateHumanDesign('1973-06-14', 23.25, offset);
```

Every variable includes `color` and `tone`. Arrow direction can be derived from tone: tones 1–3 are left and tones 4–6 are right.

### Bodygraph helpers

```js
import { bodygraphView, GATE_CENTER } from 'humandesign-engine';

bodygraphView(chart, 'both'); // or 'personality' | 'design'
// → { gates: { 20: 'design', … }, channels: [...], definedCenters: ['sacral', …] }
```

A channel is defined in a view iff both its gates are active in it, a center iff it lies on such a channel.
`GATE_CENTER` maps all 64 gates to their center. The bodygraph drawing itself (channel halves, the nine centers,
gate-number positions) is available as data from `humandesign-engine/bodygraph-svg` — geometry taken from
[hdkit](https://github.com/jdempcy/hdkit) (MIT, see `THIRD_PARTY_LICENSES/hdkit.txt`), regenerated with
`node scripts/extract-bodygraph-svg.mjs <hdkit bodygraph-blank.svg>`.

### DreamRave

```js
import { calculateDreamRave, resolveUtcOffset } from 'humandesign-engine';

const offset = resolveUtcOffset('1971-08-25', '20:37', 'Europe/Berlin');
const dream = calculateDreamRave('1971-08-25', 20 + 37 / 60, offset);
// dream.dateTime     '1971-08-18T12:47' (UTC) — the moment the Moon stood 88° before its birth position
// dream.activations  [{ body: 'saturn', gate: 20, line: 6, realm: 'light', … }]  — one set, no Personality/Design
// dream.gates / dream.channels / dream.definedCenters / dream.type ('Reflector' when no center is defined)
```

The DreamRave is the chart of the sleeping body. It has its own structure — it is not the standard chart filtered, and it
has no Personality/Design split:

- **One calculation:** the moment the **Moon** stood 88° of arc before its birth position (about 7 days before birth, not
  the Sun's 88°), rounded down to the whole UTC minute; the positions of the 13 bodies at that moment are the activations;
- only **15 gates** exist, in three realms — Light Field 62 20 57 8 1, Demon Realm 19 53 42 38 28, Earth Plane
  12 15 5 50 27 — in five centers: Throat, G, Sacral, Spleen, Root. Head, Ajna, Heart and Solar Plexus are absent; only
  activations on the 15 gates count;
- only six channels can exist (1-8, 5-15, 20-57, 27-50, 28-38, 42-53); a center is defined iff it lies on one.

Checked against a MyBodyGraph "Dream Rave Overview" (test in `tests/dream-rave.test.js`). Not asserted, because
nothing we have documents it: how a Generator / Projector / Manifestor type is derived for the DreamRave. `type`
is `'Reflector'` when no center is defined and `null` otherwise. With only one reference chart, whether all 13 bodies
count is the first thing to re-check if another chart disagrees.

## MCP server

```json
{
  "mcpServers": {
    "humandesign-engine": {
      "command": "npx",
      "args": ["-y", "humandesign-engine-mcp"]
    }
  }
}
```

The server exposes `calculate_human_design`, `calculate_dream_rave` and `search_birth_places`. It uses stdio and requires no API key.

## Development

```sh
npm install
npm test
npm run mcp
```

## Tests

`npm test` checks, among others: gate and line against the wheel formula of hdkit's sample app for every activation over
80 charts, hdkit's reference chart to under one arcminute, the gate → center table against the engine's own, the
DreamRave definition against an independently typed 36-channel table, and the Moon −88° property over random births.

MIT licensed. The bodygraph geometry is © Jonah Dempcy (hdkit, MIT) — see `THIRD_PARTY_LICENSES/`.
