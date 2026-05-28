import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { supabase } from '../../src/lib/supabase.js';
import { BetterRouter } from '../../src/lib/router.js';
import { getProfile } from '../../src/routes/v1/profile/get-profile.js';
import { updateProfile } from '../../src/routes/v1/profile/update-profile.js';

// Mocks
const originalGetUser = supabase.auth.getUser;
const originalFrom = supabase.from;

const router = new BetterRouter();
router.get('/v1/professionals/:id/profile', getProfile);
router.patch('/v1/professionals/:id/profile', updateProfile);

const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

async function makeRequest(method: string, path: string, token: string, body?: any): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3336,
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

test('Profile Management integration', async (t) => {
  server.listen(3336);

  await t.test('getProfile - success 200 OK', async () => {
    const profId = 'prof-123';
    const mockProfile = { id: profId, full_name: 'John Doe', display_name: 'John' };

    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;
    // @ts-ignore
    supabase.from = (table: string) => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile, error: null }) }) })
    }) as any;

    const res = await makeRequest('GET', `/v1/professionals/${profId}/profile`, 'valid-token');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, mockProfile);
  });

  await t.test('getProfile - unauthorized 403 Forbidden', async () => {
    const profId = 'prof-owner';
    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: 'prof-hacker' } }, error: null }) as any;

    const res = await makeRequest('GET', `/v1/professionals/${profId}/profile`, 'hacker-token');
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Você não tem permissão para acessar este recurso.');
  });

  await t.test('updateProfile - success 200 OK', async () => {
    const profId = 'prof-123';
    const updateData = { display_name: 'New Name', bio: 'New Bio' };

    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;
    // @ts-ignore
    supabase.from = (table: string) => ({
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: profId, ...updateData }, error: null }) }) }) })
    }) as any;

    const res = await makeRequest('PATCH', `/v1/professionals/${profId}/profile`, 'valid-token', updateData);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.display_name, 'New Name');
  });

  await t.test('updateProfile - validation error 400 Bad Request', async () => {
    const profId = 'prof-123';
    const invalidData = { minimum_booking_notice_minutes: -10 };

    supabase.auth.getUser = () => Promise.resolve({ data: { user: { id: profId } }, error: null }) as any;

    const res = await makeRequest('PATCH', `/v1/professionals/${profId}/profile`, 'valid-token', invalidData);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Dados de entrada inválidos.');
  });

  server.close();
  supabase.auth.getUser = originalGetUser;
  supabase.from = originalFrom;
});
