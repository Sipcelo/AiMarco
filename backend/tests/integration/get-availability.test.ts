import { describe, it, expect, vi, afterEach } from "vitest";
import { supabase } from "../../src/lib/supabase.js";
import { getAvailability } from "../../src/lib/get-availability.js";

/**
 * Minimal thenable Supabase query chain: every builder method returns the same
 * object, and the object resolves to `result` when awaited (or via `.single()`).
 */
function chain(result: { data: unknown; error: unknown }) {
  const c: any = {};
  const methods = [
    "select", "eq", "neq", "gte", "lte", "gt", "lt",
    "order", "limit", "in", "not", "is", "filter", "overlaps",
  ];
  for (const m of methods) c[m] = () => c;
  c.single = () => Promise.resolve(result);
  c.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return c;
}

const PROF_ID = "11111111-1111-1111-1111-111111111111";
const SERVICE_ID = "22222222-2222-2222-2222-222222222222";
const DATE = "2026-12-21"; // weekday with rules in the mock

afterEach(() => vi.restoreAllMocks());

/**
 * Regression: get-availability must read blocked_slots via the `time_range` (tstzrange)
 * column. `starts_at`/`ends_at` were dropped in 20260324120000_mfa_blocked_slots.sql, so
 * the old query errored → route 500 → mobile reschedule showed "nenhum horário disponível".
 */
describe("getAvailability (lib) — blocked_slots time_range", () => {
  function mockTables(blockedRows: Array<{ time_range: string }>) {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "services") {
        return chain({ data: { duration_minutes: 60 }, error: null }) as any;
      }
      if (table === "availability_rules") {
        return chain({ data: [{ start_time: "09:00:00", end_time: "18:00:00" }], error: null }) as any;
      }
      if (table === "blocked_slots") {
        return chain({ data: blockedRows, error: null }) as any;
      }
      if (table === "appointments") {
        return chain({ data: [], error: null }) as any;
      }
      return chain({ data: null, error: null }) as any;
    });
  }

  it("computes slots without errors when there are no blocks", async () => {
    mockTables([]);

    const slots = await getAvailability(PROF_ID, SERVICE_ID, DATE, 30);

    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots).toContain("09:00");
    expect(slots).toContain("17:00"); // last 60-min slot fitting before 18:00
  });

  it("removes slots overlapping a blocked time_range (12:00–13:00 local)", async () => {
    mockTables([
      { time_range: `["2026-12-21 12:00:00-03:00","2026-12-21 13:00:00-03:00")` },
    ]);

    const slots = await getAvailability(PROF_ID, SERVICE_ID, DATE, 30);

    expect(slots).toContain("09:00");
    expect(slots).not.toContain("12:00"); // blocked
    expect(slots).not.toContain("11:30"); // 60-min service would overlap the block
    expect(slots).toContain("17:00");
  });
});
