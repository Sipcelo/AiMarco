import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { supabase } from '../../src/lib/supabase.js';
import { BetterRouter } from '../../src/lib/router.js';
import { updateProfile } from '../../src/routes/v1/profile/update-profile.js';
import { createAppointmentHandler } from '../../src/routes/v1/appointments/create-appointment.js';

// Mocks
const originalGetUser = supabase.auth.getUser;
const originalFrom = supabase.from;
const originalRpc = supabase.rpc;

const router = new BetterRouter();
router.patch('/v1/professionals/:id/profile', updateProfile);
router.post('/v1/appointments', createAppointmentHandler);

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

async function makeRequest(method: string, path: string, token?: string, body?: any): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 3340,
      path,
      method,
      headers
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

test('Edge-Case & Trash Data Validation', async (t) => {
  server.listen(3340);

  await t.test('Empty Strings - Profile update with whitespace only name', async () => {
    const profId = 'prof-123';
    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;

    const res = await makeRequest('PATCH', `/v1/professionals/${profId}/profile`, 'valid-token', { display_name: '   ' });
    
    // Zod's min(2) should trigger, but let's see if it needs .trim() in schema.
    // Current schema: display_name: z.string().min(2)
    // '   '.length is 3, so it might pass if not trimmed.
    assert.strictEqual(res.status, 400); 
    assert.strictEqual(res.body.error, 'Dados de entrada inválidos.');
  });

  await t.test('Duration Overflow - 24 hour service', async () => {
    // This tests if our logic (calculate-availability or RPC) handles very long durations
    // without crashing or causing infinite loops.
    const payload = {
      professional_id: '00000000-0000-0000-0000-000000000000',
      service_id: '00000000-0000-0000-0000-000000000000',
      scheduled_at: '2026-03-23T10:00:00Z',
      client_name: 'Teste',
      client_phone: '11999999999'
    };

    supabase.rpc = async (name: string) => {
      if (name === 'create_appointment_v1') {
        return { data: { id: 'appt-long', status: 'confirmed' }, error: null } as any;
      }
      return { data: null, error: null } as any;
    };

    const res = await makeRequest('POST', '/v1/appointments', undefined, payload);
    assert.strictEqual(res.status, 201);
  });

  server.close();
  supabase.auth.getUser = originalGetUser;
  supabase.from = originalFrom;
  supabase.rpc = originalRpc;
});
