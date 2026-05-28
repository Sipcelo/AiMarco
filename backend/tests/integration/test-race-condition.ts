import Fastify from 'fastify';
import { postPublicAppointmentRoutes } from '../../src/routes/v1/public/post-appointment.js'; // We haven't created this yet for GREEN!
import assert from 'node:assert';

async function runRaceConditionTest() {
  const fastify = Fastify({ logger: false });

  // 1. Tentar registrar a rota. No RED phase, pode não existir o arquivo ainda.
  try {
    await fastify.register(postPublicAppointmentRoutes);
  } catch (err) {
    console.error('🔴 RED Phase: A rota ainda não foi implementada ou apresentou erro ao registrar.');
    process.exit(1);
  }

  const payload = {
    professional_id: '11111111-1111-1111-1111-111111111111', // Dummy ID
    service_id: '22222222-2222-2222-2222-222222222222', // Dummy ID
    scheduled_start: new Date().toISOString(),
    client_name: 'Race Condition Tester',
    client_phone: '11999999999'
  };

  console.log('Disparando 5 agendamentos concorrentes pro mesmo slot e cliente...');

  // 2. Disparar 5 requisições em paralelo exato
  const requests = Array.from({ length: 5 }).map(() => {
    return fastify.inject({
      method: 'POST',
      url: '/v1/public/appointments',
      payload
    });
  });

  const responses = await Promise.all(requests);

  const statuses = responses.map(res => res.statusCode);
  console.log('Status Codes recebidos:', statuses);

  const successCount = statuses.filter(status => status === 201).length;
  const conflictCount = statuses.filter(status => status === 409).length;

  // 3. Validação TDD (1 Sucesso, 4 Conflitos Seguros)
  if (successCount === 1 && conflictCount === 4) {
    console.log('🟢 GREEN Phase: Concorrência gerida perfeitamente!');
    process.exit(0);
  } else {
    console.error(`🔴 RED Phase: Falhou. Sucessos: ${successCount}, Conflitos: ${conflictCount}`);
    process.exit(1);
  }
}

runRaceConditionTest().catch((e) => {
  console.error('🔴 RED Phase (Erro na execução):', e.message);
  process.exit(1);
});
