/**
 * Timezone & geocoding utilities — the canonical path for birth-data entry.
 *
 * Birth charts are extremely time-sensitive, and the largest real-world
 * error source is timezone handling: historical DST, wartime time, pre-1970
 * oddities. Never estimate a UTC offset from longitude or hand-rolled DST
 * rules. Instead:
 *
 *   1. Geocode the birth place (Open-Meteo, free, CORS-enabled, no key)
 *      → lat/lon + IANA timezone identifier.
 *   2. Resolve the IANA zone to the UTC offset in effect at the birth
 *      moment via the Intl API — browsers and Node ship the full IANA
 *      history (e.g. British Double Summer Time 1941-1945, US year-round
 *      DST in 1974).
 *
 * Pre-1970 caveat: IANA's pre-1970 data has known gaps in some regions.
 * For very old births, offer users a manual offset override and suggest
 * cross-checking against the astro.com atlas.
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Search for places by name via Open-Meteo geocoding.
 * @returns {Promise<Array<{name, label, latitude, longitude, timezone, countryCode}>>}
 *   `timezone` is the IANA identifier (e.g. "America/Denver").
 */
export async function searchPlaces(query, count = 8) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(r => ({
    name: r.name,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    countryCode: r.country_code
  }));
}

/**
 * Wall-clock time (as ms-since-epoch of the matching UTC timestamp)
 * that a given UTC instant displays as in `timeZone`.
 */
function wallTimeMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(new Date(utcMs));
  const get = t => parts.find(p => p.type === t)?.value;
  const hour = get('hour') === '24' ? '00' : get('hour'); // midnight quirk
  return Date.parse(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}Z`);
}

/**
 * UTC offset (in hours, east positive — e.g. -6 for MDT, +5.5 for IST)
 * in effect in `timeZone` at the given local wall-clock moment.
 *
 * Handles historical DST and offset changes via the platform's IANA data.
 * For wall times that don't exist (spring-forward gap) or exist twice
 * (fall-back), converges to one valid interpretation.
 *
 * @param {string} dateStr - YYYY-MM-DD (local)
 * @param {string} timeStr - HH:MM (local, 24h)
 * @param {string} timeZone - IANA zone, e.g. "America/Denver"
 * @returns {number} offset in hours
 */
export function resolveUtcOffset(dateStr, timeStr, timeZone) {
  const target = Date.parse(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(target)) throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
  let utc = target;
  for (let i = 0; i < 3; i++) {
    utc += target - wallTimeMs(utc, timeZone);
  }
  return (target - utc) / 3600000;
}

/** Human-readable offset, e.g. "UTC-7", "UTC+5:30". */
export function formatUtcOffset(hours) {
  const sign = hours < 0 ? '-' : '+';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

export default { searchPlaces, resolveUtcOffset, formatUtcOffset };
