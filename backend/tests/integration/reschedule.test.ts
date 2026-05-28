import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { supabase } from '../../src/lib/supabase.js';
import { BetterRouter } from '../../src/lib/router.js';
import { rescheduleAppointment } from '../../src/routes/v1/appointments/reschedule-appointment.js';

// Mocks
const originalGetUser = supabase.auth.getUser;
const originalFrom = supabase.from;
const originalRpc = supabase.rpc;

const router = new BetterRouter();
router.post('/v1/appointments/:id/reschedule', rescheduleAppointment);

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

async function makeRequest(method: string, path: string, token: string, body?: any): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3337,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: data ? JSON.parse(data) : {} });
        } catch(e) {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('Reschedule Appointment integration', async (t) => {
  server.listen(3337);

  const profId = 'prof-123';
  const apptId = 'appt-456';
  const validToken = 'valid-token';

  await t.test('reschedule - success 200 OK', async () => {
    const newTimestamp = '2026-03-24T14:00:00-03:00';
    const mockData = { id: 'new-appt', old_id: apptId };

    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;
    // @ts-ignore
    supabase.from = (table: string) => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { professional_id: profId }, error: null }) }) })
    });
    supabase.rpc = (name: string) => {
      if (name === 'reschedule_appointment_v1') return Promise.resolve({ data: mockData, error: null }) as any;
      return Promise.resolve({ data: null, error: null }) as any;
    };

    const res = await makeRequest('POST', `/v1/appointments/${apptId}/reschedule`, validToken, { new_scheduled_at: newTimestamp });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 'new-appt');
  });

  await t.test('reschedule - conflict 409 Conflict', async () => {
    const newTimestamp = '2026-03-24T14:00:00-03:00';
    const errorMsg = 'Horário indisponível (DB Constraint)';

    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;
    // @ts-ignore
    supabase.from = (table: string) => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { professional_id: profId }, error: null }) }) })
    });
    supabase.rpc = (name: string) => {
      if (name === 'reschedule_appointment_v1') return Promise.resolve({ data: { error: errorMsg }, error: null }) as any;
      return Promise.resolve({ data: null, error: null }) as any;
    };

    const res = await makeRequest('POST', `/v1/appointments/${apptId}/reschedule`, validToken, { new_scheduled_at: newTimestamp });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error, errorMsg);
  });

  server.close();
  supabase.auth.getUser = originalGetUser;
  supabase.from = originalFrom;
  supabase.rpc = originalRpc;
});
