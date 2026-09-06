# Human Design Engine

Focused Human Design calculation. This repository contains only the Human Design calculator, its astronomical dependencies, timezone helpers, and an MCP server for AI assistants.

## Use as a library

```js
import { calculateHumanDesign, resolveUtcOffset } from 'humandesign-engine';

const offset = resolveUtcOffset('1973-06-14', '23:15', 'Europe/Stockholm');
const chart = calculateHumanDesign('1973-06-14', 23.25, offset);
```

Every variable includes `color` and `tone`. Arrow direction can be derived from tone: tones 1–3 are left and tones 4–6 are right.

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

The server exposes `calculate_human_design` and `search_birth_places`. It uses stdio and requires no API key.

## Development

```sh
npm install
npm test
npm run mcp
```

MIT licensed.
