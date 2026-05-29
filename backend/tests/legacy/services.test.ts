import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { supabase } from '../../src/lib/supabase.js';
import { BetterRouter } from '../../src/lib/router.js';
import { listServices } from '../../src/routes/v1/services/list-services.js';
import { createService } from '../../src/routes/v1/services/create-service.js';

// Mocks
const originalGetUser = supabase.auth.getUser;
const originalFrom = supabase.from;

const router = new BetterRouter();
router.get('/v1/professionals/:id/services', listServices);
router.post('/v1/professionals/:id/services', createService);

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

async function makeRequest(method: string, path: string, token: string, body?: any): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3334,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('Services CRUD integration', async (t) => {
  server.listen(3334);

  await t.test('listServices - success 200 OK', async () => {
    const profId = 'prof-123';
    const mockServices = [{ id: 's1', name: 'Corte' }];

    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;
    // @ts-ignore
    supabase.from = (table: string) => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: mockServices, error: null }) }) })
    }) as any;

    const res = await makeRequest('GET', `/v1/professionals/${profId}/services`, 'valid-token');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, mockServices);
  });

  await t.test('listServices - unauthorized 403 Forbidden', async () => {
    const profId = 'prof-owner';
    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: 'prof-hacker' } }, error: null }) as any;

    const res = await makeRequest('GET', `/v1/professionals/${profId}/services`, 'hacker-token');
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Você não tem permissão para acessar este recurso.');
  });

  await t.test('createService - success 201 Created', async () => {
    const profId = 'prof-123';
    const newService = { name: 'Barba', duration_minutes: 30, price_cents: 3000 };

    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;
    // @ts-ignore
    supabase.from = (table: string) => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'new-id', ...newService }, error: null }) }) })
    }) as any;

    const res = await makeRequest('POST', `/v1/professionals/${profId}/services`, 'valid-token', newService);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, 'Barba');
  });

  server.close();
  supabase.auth.getUser = originalGetUser;
  supabase.from = originalFrom;
});
