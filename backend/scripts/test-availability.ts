import 'dotenv/config';
import { supabase } from '../src/lib/supabase.js';

async function runTest() {
  console.log('--- Início Teste de Disponibilidade (Smart Slots) ---');

  // 1. Pegar ou criar profissional (Regina)
  // Vamos buscar um profissional e um serviço existente, senao os criamos para o teste.
  let { data: profs } = await supabase.from('professionals').select('*').limit(1);
  if (!profs || profs.length === 0) {
    console.log('Nenhum profissional encontrado, favor rodar o seed do banco primeiro.');
    process.exit(1);
  }
  const prof = profs[0];

  let { data: servs } = await supabase.from('services').select('*').limit(1);
  if (!servs || servs.length === 0) {
    console.log('Nenhum serviço encontrado, crie um serviço antes de rodar o teste.');
    process.exit(1);
  }
  const service = servs[0]; // Assumindo duration_minutes
  console.log(`Profissional: ${prof.display_name || prof.slug || prof.id}`);
  console.log(`Servico selecionado: ${service.name} (${service.duration_minutes} min)`);

  // Force duration to 60 for this test or use it as is
  const testDuration = 60;
  
  // Create an appointment at 14:00 on some future date
  const targetDateStr = '2026-10-10';
  const targetTimeStr = '14:00';
  const scheduledAt = new Date(`${targetDateStr}T${targetTimeStr}:00.000Z`); // UTC time for test

  console.log(`Criando agendamento às 14:00 de ${testDuration}min no dia ${targetDateStr}...`);
  const { data: newApp, error: appErr } = await supabase.from('appointments').insert({
    professional_id: prof.id,
    service_id: service.id,
    scheduled_at: scheduledAt.toISOString(),
    status: 'confirmed'
    // ignorando client_id real, idealmente voce deve criar um mock
  }).select().single();

  if (appErr) {
    console.log('Erro ao criar agendamento mock:', appErr.message);
    // Se der erro de fk de client, crie um dummy client
    const { data: client } = await supabase.from('clients').insert({
        professional_id: prof.id,
        phone: '11999998888',
        full_name: 'Cliente Teste'
    }).select().single();
    
    if (client) {
      await supabase.from('appointments').insert({
        professional_id: prof.id,
        client_id: client.id,
        service_id: service.id,
        scheduled_at: scheduledAt.toISOString(),
        status: 'confirmed'
      });
      console.log('Agendamento criado com client fallback!');
    }
  }

  // 2. Chamar a RPC e logar resultados
  console.log(`\nConsultando slots disponíveis para o dia ${targetDateStr}...`);
  const { data: slots, error: rpcErr } = await supabase.rpc('get_available_slots_v1', {
    p_professional_id: prof.id,
    p_service_id: service.id,
    p_date: targetDateStr
  });

  if (rpcErr) {
    console.error('Erro ao chamar engine de disponibilidade:', rpcErr);
  } else {
    const times = (slots as any[]).map(s => s.available_time);
    console.log('Tamanhos dos times array:', times.length);
    console.log('Slots retornado:', times.join(', '));
    
    // Verificação Básica p/ 60 min às 14:00:
    // Pelo grid de 15 min, não pode haver:
    // 13:15, 13:30, 13:45, 14:00, 14:15, 14:30, 14:45 -- (Se 13:15 acabar 14:15, choca com "14:00-15:00")
    const blockedTimes = ['13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45'];
    const intersections = times.filter(t => blockedTimes.includes(t));
    if (intersections.length > 0) {
      console.error('FALHA: Constam slots que deveriam estar bloqueados:', intersections);
    } else {
      console.log('SUCESSO: Nenhum horário proibido retornado!');
    }
  }

  process.exit(0);
}

runTest();
