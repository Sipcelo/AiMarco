import "dotenv/config";
import { supabase } from "../src/lib/supabase.js";

async function runTest() {
  console.log("--- Início Teste de Signup Final ---");
  const serverUrl = `http://localhost:${process.env.PORT || 3000}`;
  const unique = Date.now();
  const email = `e2e-signup-${unique}@example.com`;
  const password = "Teste123!";
  const display_name = `Teste e2e ${unique}`;
  const full_name = `Teste Completo ${unique}`;
  const phone = "+55 11 91234-5678";
  const business_type = "barbershop";

  console.log("Tentando signup via API:", `${serverUrl}/v1/auth/signup`);

  const response = await fetch(`${serverUrl}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      display_name,
      full_name,
      phone,
      business_type,
    }),
  });

  const json = await response.json().catch(() => ({}));

  console.log("Status API:", response.status);
  console.log("Body API:", JSON.stringify(json, null, 2));

  if (response.status !== 201) {
    console.error(
      "FALHA: signup retornou status diferente de 201. Parecer em resposta.",
    );
    process.exit(1);
  }

  // Verifica no banco de dados
  const { data: found, error: findError } = await supabase
    .from("professionals")
    .select("id, auth_user_id, full_name, phone")
    .eq("full_name", full_name)
    .eq("phone", phone)
    .limit(1)
    .single();

  if (findError || !found) {
    console.error(
      "FALHA: registro de professional não encontrado após signup.",
      findError,
    );
    process.exit(1);
  }

  if (found.full_name !== full_name || found.phone !== phone) {
    console.error(
      "FALHA: os valores de full_name ou phone no banco não batem.",
    );
    process.exit(1);
  }

  console.log(
    "SUCESSO: full_name e phone persistidos corretamente no professionals.",
  );

  // Limpeza de teste
  if (found.id) {
    await supabase.from("professionals").delete().eq("id", found.id);
    console.log("Cleanup: professional deletado.");
  }
  if (found.auth_user_id) {
    await supabase.auth.admin.deleteUser(found.auth_user_id);
    console.log("Cleanup: usuário auth deletado.");
  }

  process.exit(0);
}

runTest().catch((err) => {
  console.error("Erro inesperado no teste de signup final:", err);
  process.exit(1);
});
