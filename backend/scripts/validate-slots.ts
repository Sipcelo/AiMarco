import "dotenv/config";
import { supabase } from "../src/lib/supabase.js";

async function validate() {
  console.log("--- 🛡️ VALIDAÇÃO DE INTELIGÊNCIA DE SLOTS (PHASE 3.5) ---");

  const targetDateStr = "2026-03-26";
  const targetTimeStr = "10:00";
  const serviceDuration = 60;

  // 1. Setup: Professional and Service
  const { data: profs } = await supabase
    .from("professionals")
    .select("*")
    .limit(1);
  if (!profs || profs.length === 0) {
    console.error("❌ Nenhum profissional encontrado.");
    process.exit(1);
  }
  const prof = profs[0];

  const { data: servs } = await supabase
    .from("services")
    .select("*")
    .filter("duration_minutes", "eq", serviceDuration)
    .limit(1);
  let service = servs?.[0];

  if (!service) {
    console.log(
      "⚠️ Serviço de 60min não encontrado, usando o primeiro disponível e forçando duração.",
    );
    const { data: fallbackServs } = await supabase
      .from("services")
      .select("*")
      .limit(1);
    service = fallbackServs?.[0];
  }

  if (!service) {
    console.error("❌ Nenhum serviço encontrado.");
    process.exit(1);
  }

  console.log(`Profissional: ${prof.full_name} (${prof.id})`);
  console.log(`Serviço: ${service.name} (${service.duration_minutes} min)`);

  // 2. Initial Check (Empty Day)
  console.log(`\n1. Verificando slots iniciais para ${targetDateStr}...`);
  const { data: initialSlots, error: err1 } = await supabase.rpc(
    "get_available_slots_v1",
    {
      p_professional_id: prof.id,
      p_service_id: service.id,
      p_date: targetDateStr,
    },
  );

  if (err1) throw err1;
  const initialTimes = (initialSlots as any[]).map((s) => s.available_time);
  console.log(`Slots disponíveis: ${initialTimes.join(", ")}`);

  if (!initialTimes.includes(targetTimeStr)) {
    console.warn(
      `⚠️ Slot ${targetTimeStr} não está disponível inicialmente. Verifique as Opening Hours.`,
    );
  }

  // 3. Create Appointment (10:00 AM)
  console.log(`\n2. Criando agendamento às ${targetTimeStr} (60 min)...`);

  // Create dummy client if needed
  let { data: client } = await supabase
    .from("clients")
    .select("*")
    .limit(1)
    .single();
  if (!client) {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        professional_id: prof.id,
        phone: "11999998888",
        full_name: "Cliente Validação",
      })
      .select()
      .single();
    client = newClient;
  }

  const scheduledAt = new Date(`${targetDateStr}T${targetTimeStr}:00.000Z`); // UTC simulation

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      professional_id: prof.id,
      client_id: client?.id,
      service_id: service.id,
      scheduled_at: scheduledAt.toISOString(),
      status: "confirmed",
    })
    .select()
    .single();

  if (apptErr) {
    console.error("❌ Erro ao criar agendamento:", apptErr.message);
    process.exit(1);
  }
  console.log("✅ Agendamento criado!");

  // 4. Verification Check
  console.log(`\n3. Verificando slots após agendamento...`);
  const { data: finalSlots, error: err2 } = await supabase.rpc(
    "get_available_slots_v1",
    {
      p_professional_id: prof.id,
      p_service_id: service.id,
      p_date: targetDateStr,
    },
  );

  if (err2) throw err2;
  const finalTimes = (finalSlots as any[]).map((s) => s.available_time);
  console.log(`Slots disponíveis: ${finalTimes.join(", ")}`);

  const expectedBlocked = ["10:00", "10:15", "10:30", "10:45"];
  const failed = expectedBlocked.filter((t) => finalTimes.includes(t));

  if (failed.length > 0) {
    console.error(
      `❌ FALHA: Os seguintes slots ainda estão disponíveis: ${failed.join(", ")}`,
    );
  } else {
    console.log(
      `✅ SUCESSO: Slots ${expectedBlocked.join(", ")} sumiram corretamente!`,
    );
  }

  // Bonus: Check overlaps from BEFORE (09:15-09:45)
  const previousOverlaps = ["09:15", "09:30", "09:45"];
  const stillAvailablePrevious = previousOverlaps.filter((t) =>
    finalTimes.includes(t),
  );
  if (stillAvailablePrevious.length > 0) {
    console.log(
      `ℹ️ Nota: Slots anteriores que sobrepõem (${stillAvailablePrevious.join(", ")}) ainda estão disponíveis. Isso pode indicar que a engine só bloqueia o início exato ou posterior.`,
    );
  } else {
    console.log(
      `✅ INFO: Slots anteriores que sobrepõem (09:15-09:45) também sumiram.`,
    );
  }

  // 5. Cleanup
  console.log(`\n4. Limpando dados de teste...`);
  await supabase.from("appointments").delete().eq("id", appt.id);
  console.log("✅ Agendamento removido.");

  console.log("\n--- FIM DA VALIDAÇÃO ---");
  process.exit(0);
}

validate().catch((err) => {
  console.error(err);
  process.exit(1);
});
