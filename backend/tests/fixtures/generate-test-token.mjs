// Gerador de token JWT para testes de autenticação
// Usa o Supabase local (ou remoto) para criar um usuário e obter token válido

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config(); // Carrega .env

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function generateToken() {
  if (!SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_ANON_KEY não definida');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Criar usuário de teste (ou usar existente)
  const testEmail = `test-${Date.now()}@aimarco.local`;
  const password = 'TestPassword123!';

  console.log(`📧 Criando usuário: ${testEmail}`);

  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: password,
    options: {
      data: {
        full_name: 'Test User',
        phone: '+5511999999999',
        business_type: 'barbershop',
      },
    },
  });

  if (signupError) {
    console.error('❌ Erro no signup:', signupError.message);
    process.exit(1);
  }

  if (!signupData.user) {
    console.error('❌ Usuário não criado');
    process.exit(1);
  }

  console.log('✅ Usuário criado:', signupData.user.id);

  // 2. Verificar se precisa criar professional
  // O signupHandler do backend deve criar automaticamente o professional
  // Mas se não创建, precisamos fazer manualmente aqui via RPC ou API
  // Por enquanto, vamos apenas extrair o token (se disponível)

  let token = signupData.session?.access_token;

  if (!token) {
    console.log('⚠️ Nenhuma sessão retornada no signup. Tentando login...');

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: password,
    });

    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      process.exit(1);
    }

    token = loginData.session?.access_token;
  }

  if (!token) {
    console.error('❌ Não foi possível obter token');
    process.exit(1);
  }

  console.log('\n🎫 Token JWT obtido:');
  console.log(token);
  console.log('\n📝 Adicione ao seu .env:');
  console.log(`TEST_JWT_TOKEN=${token}`);
  console.log('\n⚠️ IMPORTANTE: Este token está vinculado ao usuário criado.');
  console.log('   Para testar ownership, você precisa de um professional_id válido que pertença a este usuário.');
  console.log('   Verifique no Supabase SQL: SELECT * FROM professionals WHERE auth_user_id = \'' + signupData.user.id + '\';');

  // 3. Se quisermos, podemos fazer uma requisição ao backend para criar o professional
  // via o endpoint de signup (se o signupHandler创建 automaticamente)
  // Mas isso também requereria que o backend estivesse rodando e aceitasse o registro

  process.exit(0);
}

generateToken().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
