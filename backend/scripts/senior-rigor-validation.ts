import 'dotenv/config';
import { supabase } from '../src/lib/supabase.js';

async function test() {
  console.log('--- 🧪 INICIANDO TESTE RIGOR SÊNIOR ---');

  // 1. Get Professional
  const { data: prof, error: profErr } = await supabase
    .from('professionals')
    .select('id, full_name')
    .eq('slug', 'salao-da-re')
    .single();

  if (profErr || !prof) {
    console.error('❌ Profissional "salao-da-re" não encontrado. Rode o setup-re.ts primeiro.');
    process.exit(1);
  }
  console.log(`✅ Profissional: ${prof.full_name} (${prof.id})`);

  // 2. Get Service
  const { data: svc, error: svcErr } = await supabase
    .from('services')
    .select('id, name, duration_minutes')
    .eq('name', 'Corte')
    .eq('professional_id', prof.id)
    .single();

  if (svcErr || !svc) {
    console.error('❌ Serviço "Corte" não encontrado.');
    process.exit(1);
  }
  console.log(`✅ Serviço: ${svc.name} (${svc.duration_minutes} min)`);

  const targetDate = '2026-03-26';

  // 3. Initial Availability Check
  console.log(`\n--- 📅 DISPONIBILIDADE EM ${targetDate} ---`);
  const { data: slots, error: rpcErr } = await supabase.rpc('get_available_slots_v1', {
    p_professional_id: prof.id,
    p_service_id: svc.id,
    p_date: targetDate
  });

  if (rpcErr) {
    console.error('❌ Erro na RPC get_available_slots_v1:', rpcErr);
    process.exit(1);
  }
  console.log('✅ Slots Iniciais:', slots.map((s: any) => s.available_time).join(', '));

  // 4. Create an Appointment at 10:00 AM
  const targetTime = '10:00';
  console.log(`\n--- ✍️ CRIANDO AGENDAMENTO ÀS ${targetTime} (60 min) ---`);
  
  // Get/Create a client
  let { data: client } = await supabase.from('clients').select('id').limit(1).single();
  if (!client) {
      const { data: newClient } = await supabase.from('clients').insert({
          professional_id: prof.id,
          phone: '11988887777',
          full_name: 'Cliente Sênior'
      }).select('id').single();
      client = newClient;
  }

  const scheduledStart = new Date(`${targetDate}T13:00:00.000Z`); // 10:00 AM UTC-3
  const scheduledEnd = new Date(`${targetDate}T14:00:00.000Z`);   // 11:00 AM UTC-3

  const { data: appt, error: apptErr } = await supabase.from('appointments').insert({
    professional_id: prof.id,
    service_id: svc.id,
    client_id: client?.id,
    scheduled_start: scheduledStart.toISOString(),
    scheduled_end: scheduledEnd.toISOString(),
    status: 'confirmed',
    service_name: svc.name,
    service_duration_minutes: svc.duration_minutes,
    client_name: 'Cliente Sênior',
    client_phone: '11988887777'
  }).select().single();

  if (apptErr) {
    console.error('❌ Erro ao criar agendamento:', apptErr.message);
    process.exit(1);
  }
  console.log('✅ Agendamento criado com Snapshots!');

  // 5. Final Availability Check
  console.log(`\n--- 📅 DISPONIBILIDADE APÓS AGENDAMENTO ---`);
  const { data: finalSlots, error: rpcErr2 } = await supabase.rpc('get_available_slots_v1', {
    p_professional_id: prof.id,
    p_service_id: svc.id,
    p_date: targetDate
  });

  if (rpcErr2) throw rpcErr2;
  const finalTimes = finalSlots.map((s: any) => s.available_time);
  console.log('✅ Slots Finais:', finalTimes.join(', '));

  const expectedBlocked = ['10:00', '10:15', '10:30', '10:45'];
  const failed = expectedBlocked.filter(t => finalTimes.includes(t));

  if (failed.length > 0) {
    console.error(`❌ FALHA: Os seguintes slots ainda estão disponíveis: ${failed.join(', ')}`);
  } else {
    console.log(`✅ SUCESSO: O bloqueio "Smart Slots" funcionou perfeitamente!`);
  }

  // 6. Snapshot Integrity Check
  console.log(`\n--- 📸 INTEGRIDADE DE SNAPSHOTS ---`);
  const { data: verifiedAppt } = await supabase.from('appointments').select('*').eq('id', appt.id).single();
  if (verifiedAppt.service_name === svc.name && verifiedAppt.service_duration_minutes === svc.duration_minutes) {
      console.log('✅ Snapshots de serviço validados.');
  } else {
      console.error('❌ Falha na integridade de snapshots.');
  }

  // 7. Cleanup
  console.log(`\n--- 🧹 LIMPANDO DADOS ---`);
  await supabase.from('appointments').delete().eq('id', appt.id);
  console.log('✅ Tudo limpo.');

  console.log('\n--- 🎯 FIM DO TESTE DE RIGOR SÊNIOR ---');
  process.exit(0);
}

test().catch(console.error);
