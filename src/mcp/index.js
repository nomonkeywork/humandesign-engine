#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { calculateHumanDesign, resolveUtcOffset, searchPlaces } from '../index.js';

const server = new Server(
  { name: 'humandesign-engine', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

const calculateSchema = {
  type: 'object',
  properties: {
    birth_date: { type: 'string', description: 'Birth date in YYYY-MM-DD format.' },
    birth_time: { type: 'string', description: 'Local birth time in HH:MM format.' },
    timezone: { type: 'number', description: 'UTC offset in hours.' },
    timezone_name: { type: 'string', description: 'IANA timezone, used to resolve historical offsets.' },
  },
  required: ['birth_date', 'birth_time', 'timezone'],
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'calculate_human_design',
      description: 'Calculate a Human Design chart including type, authority, profile, centers, gates, channels, incarnation cross and all four PHS variables.',
      inputSchema: calculateSchema,
    },
    {
      name: 'search_birth_places',
      description: 'Find birth places and IANA timezones using keyless Open-Meteo geocoding.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'City or place name.' } },
        required: ['query'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  try {
    if (request.params.name === 'search_birth_places') {
      const places = await searchPlaces(String(args.query || ''));
      return { content: [{ type: 'text', text: JSON.stringify(places) }] };
    }
    if (request.params.name === 'calculate_human_design') {
      const date = String(args.birth_date || '');
      const time = String(args.birth_time || '');
      const hour = Number(time.slice(0, 2)) + Number(time.slice(3, 5)) / 60;
      const timezone = args.timezone_name
        ? resolveUtcOffset(date, time, String(args.timezone_name))
        : Number(args.timezone);
      const chart = calculateHumanDesign(date, hour, timezone);
      return { content: [{ type: 'text', text: JSON.stringify(chart) }] };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: error instanceof Error ? error.message : 'Calculation failed' }],
    };
  }
});

await server.connect(new StdioServerTransport());
