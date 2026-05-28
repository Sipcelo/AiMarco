import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { supabase } from '../../src/lib/supabase.js';
import { BetterRouter } from '../../src/lib/router.js';
import { updateService } from '../../src/routes/v1/services/update-service.js';
import { listAppointmentsHandler } from '../../src/routes/v1/professionals/list-appointments.js';

// Mocks
const originalGetUser = supabase.auth.getUser;
const originalFrom = supabase.from;

const router = new BetterRouter();
router.patch('/v1/professionals/:id/services/:serviceId', updateService);
router.get('/v1/professionals/:id/appointments', listAppointmentsHandler);

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

async function makeRequest(method: string, path: string, token?: string, body?: any): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 3338,
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

test('Security & Multi-Tenancy Audit', async (t) => {
  server.listen(3338);

  await t.test('ID Guessing - Pro B cannot update Pro A service', async () => {
    const proA_Id = 'pro-A';
    const proB_Id = 'pro-B';
    const proA_serviceId = 'service-A';
    const proB_token = 'token-B';

    // Mock Pro B login
    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: proB_Id } }, error: null }) as any;

    const res = await makeRequest('PATCH', `/v1/professionals/${proA_Id}/services/${proA_serviceId}`, proB_token, { name: 'Hacked' });
    
    // verifyProfessional should catch that URL proA_Id != Token proB_Id
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Você não tem permissão para acessar este recurso.');
  });

  await t.test('Public Data Leak - Appointments must be protected', async () => {
    const proId = 'any-pro';
    const res = await makeRequest('GET', `/v1/professionals/${proId}/appointments?date=2026-03-23`);
    
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Token de autenticação ausente ou inválido.');
  });

  server.close();
  supabase.auth.getUser = originalGetUser;
  supabase.from = originalFrom;
});
