import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { supabase } from '../../src/lib/supabase.js';
import { BetterRouter } from '../../src/lib/router.js';
import { getAvailabilityHandler } from '../../src/routes/v1/availability/get-availability.js';

// Mocks
const originalFrom = supabase.from;

const router = new BetterRouter();
router.get('/v1/availability/:id', getAvailabilityHandler);

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

async function makeRequest(path: string): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3341,
      path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('Multi-segment Availability (Lunch Break)', async (t) => {
  server.listen(3341);

  await t.test('Split shift - Should not have slots between 12:00 and 14:00', async () => {
    const profId = 'prof-split';
    const serviceId = 'serv-30min';
    const date = '2026-04-02'; // A Thursday (Day 4)

    // Mock data
    const mockService = { id: serviceId, duration_minutes: 30 };
    const mockRules = [
      { day_of_week: 4, start_time: '09:00', end_time: '12:00' }, // Morning
      { day_of_week: 4, start_time: '14:00', end_time: '18:00' }  // Afternoon
    ];

    // @ts-ignore
    supabase.from = (table: string) => {
      if (table === 'services') {
        return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockService, error: null }) }) }) }) }) };
      }
      if (table === 'availability_rules') {
        return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: mockRules, error: null }) }) }) };
      }
      if (table === 'blocked_slots') {
        return { select: () => ({ eq: () => ({ lt: () => ({ gt: () => Promise.resolve({ data: [], error: null }) }) }) }) };
      }
      if (table === 'appointments') {
        return { select: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ lte: () => Promise.resolve({ data: [], error: null }) }) }) }) }) };
      }
      return originalFrom(table);
    };

    const res = await makeRequest(`/v1/availability/${profId}?service_id=${serviceId}&date=${date}`);
    
    assert.strictEqual(res.status, 200);
    const slots = res.body.slots;

    // Log for validation as requested
    console.log('Generated slots for split shift:', slots);

    // Assert morning slots exist
    assert.ok(slots.includes('09:00'));
    assert.ok(slots.includes('11:30'));

    // Assert NO slots between 12:00 and 14:00
    assert.ok(!slots.includes('12:00'));
    assert.ok(!slots.includes('12:30'));
    assert.ok(!slots.includes('13:00'));
    assert.ok(!slots.includes('13:30'));

    // Assert afternoon slots exist
    assert.ok(slots.includes('14:00'));
    assert.ok(slots.includes('17:30'));
  });

  server.close();
  supabase.from = originalFrom;
});
