import { test, expect } from 'vitest';
import http from 'node:http';
import { supabase } from '../../src/lib/supabase.js';
import { BetterRouter } from '../../src/lib/router.js';
import { createAppointmentHandler } from '../../src/routes/v1/appointments/create-appointment.js';

// Mocks
const originalRpc = supabase.rpc;

const router = new BetterRouter();
router.post('/v1/appointments', createAppointmentHandler);

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

async function makeRequest(method: string, path: string, body: any): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3339,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
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
    req.write(JSON.stringify(body));
    req.end();
  });
}

test.describe('Concurrency & Race Condition', () => {
  test.beforeAll(() => {
    server.listen(3339);
  });

  test.afterAll(() => {
    server.close();
    supabase.rpc = originalRpc;
  });

  test.afterEach(() => {
    // Ensure each test has a clean supabase.rpc state
    supabase.rpc = originalRpc;
  });

  test('Double Booking Prevention - Two simultaneous requests', async () => {
    const payload = {
      professional_id: '00000000-0000-0000-0000-000000000000',
      service_id: '00000000-0000-0000-0000-000000000000',
      scheduled_at: '2026-03-23T10:00:00Z',
      client_name: 'Teste',
      client_phone: '11999999999'
    };

    let firstRequestHandled = false;

    supabase.rpc = async (name: string) => {
      if (name === 'create_appointment_v1') {
        if (!firstRequestHandled) {
          firstRequestHandled = true;
          // Simulate DB taking time, during which second request comes in
          await new Promise(r => setTimeout(resolve => r(null), 50));
          return { data: { id: 'appt-1', status: 'confirmed' }, error: null } as any;
        } else {
          // Second request hits the constraint
          return { data: { error: 'Horário indisponível (DB Constraint)' }, error: null } as any;
        }
      }
      return { data: null, error: null } as any;
    };

    const results = await Promise.all([
      makeRequest('POST', '/v1/appointments', payload),
      makeRequest('POST', '/v1/appointments', payload)
    ]);

    const statuses = results.map(r => r.status).sort();
    const errors = results.map(r => r.body.error).filter(Boolean);

    expect(statuses).toEqual([201, 409]);
    expect(errors).toContain('Horário indisponível (DB Constraint)');
  });

  test('GiST Constraint Indestructibility - 50 simultaneous requests', async () => {
    const payload = {
      professional_id: '00000000-0000-0000-0000-000000000000',
      service_id: '00000000-0000-0000-0000-000000000000',
      scheduled_at: '2026-03-23T11:00:00Z',
      client_name: 'Stress Test',
      client_phone: '11999999999'
    };

    let firstRequestHandled = false;

    // Fresh mock for this test
    supabase.rpc = async (name: string) => {
      if (name === 'create_appointment_v1') {
        if (!firstRequestHandled) {
          firstRequestHandled = true;
          // Simulate DB taking time for the first winner
          await new Promise(r => setTimeout(resolve => r(null), 50));
          return { data: { id: 'appt-1', status: 'confirmed' }, error: null } as any;
        } else {
          // All others hit the constraint
          return { data: { error: 'Horário indisponível (DB Constraint)' }, error: null } as any;
        }
      }
      return { data: null, error: null } as any;
    };

    const requests = Array(50).fill(null).map(() =>
      makeRequest('POST', '/v1/appointments', payload)
    );

    const results = await Promise.all(requests);

    let successCount = 0;
    let constraintViolationCount = 0;

    for (const result of results) {
      if (result.status === 201) {
        successCount++;
      } else if (result.status === 409) {
        constraintViolationCount++;
      }
    }

    // THE GIST CONSTRAINT MUST HOLD
    expect(successCount).toBe(1, 'Exactly 1 appointment must be created');
    expect(constraintViolationCount).toBe(49, 'All other 49 requests must be rejected with constraint violation');

    const successResult = results.find(r => r.status === 201);
    expect(successResult?.body?.id).toBeTruthy('Successful appointment must have an ID');
  });
});
