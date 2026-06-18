// Helpers for blocked_slots.time_range (tstzrange). Schema migration
// 20260324120000 dropped starts_at/ends_at in favor of a single tstzrange.
// API contract still exposes starts_at/ends_at, so we translate here.

// Build an inclusive-start, exclusive-end tstzrange literal.
export function toTstzRange(startsAt: string, endsAt: string): string {
  return `[${startsAt},${endsAt})`;
}

// Parse a Postgres tstzrange text into ISO start/end strings.
// PostgREST returns e.g. ["2026-06-18 00:00:00+00","2026-06-18 23:59:59+00")
export function fromTstzRange(range: string): { starts_at: string; ends_at: string } {
  const inner = range.slice(1, -1); // strip leading [/( and trailing )/]
  const [a, b] = inner.split(','); // timestamps contain no comma
  const clean = (s: string) => s.trim().replace(/^"|"$/g, '');
  return {
    starts_at: new Date(clean(a)).toISOString(),
    ends_at: new Date(clean(b)).toISOString(),
  };
}

// ponytail: runnable self-check. `node dist/lib/time-range.js --demo`
if (process.argv[1]?.endsWith('time-range.js') && process.argv.includes('--demo')) {
  const round = fromTstzRange('["2026-06-18 00:00:00+00","2026-06-18 23:59:59+00")');
  if (round.starts_at !== '2026-06-18T00:00:00.000Z') throw new Error('start parse failed: ' + round.starts_at);
  if (round.ends_at !== '2026-06-18T23:59:59.000Z') throw new Error('end parse failed: ' + round.ends_at);
  if (toTstzRange('2026-06-18T00:00:00Z', '2026-06-18T01:00:00Z') !== '[2026-06-18T00:00:00Z,2026-06-18T01:00:00Z)')
    throw new Error('build failed');
  console.log('time-range demo ok');
}
