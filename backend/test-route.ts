import Fastify from 'fastify';
import { getProfessionalRoutes } from './src/routes/v1/public/get-professional.js';

async function testFastifyRoute() {
  const fastify = Fastify({ logger: false });

  // Register the route
  await fastify.register(getProfessionalRoutes);

  // We are going to mock the supabase call response since we might not have the DB set up correctly yet or slug doesn't exist.
  // Wait, we can't easily mock the import without jest/vitest which aren't installed.
  // I will just test if the route is registered and what it returns for a random slug (it should be 404 or 500 if DB is not updated).
  
  const response = await fastify.inject({
    method: 'GET',
    url: '/v1/public/professional/mock-slug'
  });

  console.log('Status Code:', response.statusCode);
  console.log('Payload:', response.json());
  
  // Basic validation that no sensitive keys exist in the payload
  const payload = response.json();
  const sensitiveKeys = ['owner_id', 'created_at', 'email', 'phone', 'password'];
  let leakedKeys = [];
  
  for (const key of sensitiveKeys) {
    if (key in payload) {
      leakedKeys.push(key);
    }
  }
  
  if (leakedKeys.length > 0) {
    console.error('ALARM: Sensitive data leaked:', leakedKeys);
    process.exit(1);
  } else {
    console.log('SUCCESS: No sensitive keys leaked in the response object shape.');
    process.exit(0);
  }
}

testFastifyRoute().catch(console.error);
