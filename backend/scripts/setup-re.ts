import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Especifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_KEY) no arquivo .env');
  process.exit(1);
}

// Usar o service_role bypassa RLS para a etapa de seed.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRe() {
  console.log('🚀 Iniciando Setup: Salão da Rê');

  const slug = 'salao-da-re';
  const email = 're@aimarco.com.br';
  const phone = '5511999999999';

  // 1. Inserir ou recuperar a Profissional
  let professionalId: string;
  const { data: existing, error: findError } = await supabase
    .from('professionals')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    professionalId = existing.id;
    console.log(`✅ Profissional já existe. ID: ${professionalId}`);
  } else {
    // Para simplificar, estamos bypassando autenticação (users), ou você precisaria associar ao auth.users.
    const { data: novo, error: createError } = await supabase
      .from('professionals')
      .insert({
        slug,
        full_name: 'Renata (Salão da Rê)',
        display_name: 'Salão da Rê',
        email,
        phone,
        business_type: 'hair',
        bio: 'Especialista em loiros e cortes modernos.',
        timezone: 'America/Sao_Paulo'
      })
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Erro ao criar profissional:', createError);
      process.exit(1);
    }
    professionalId = novo.id;
    console.log(`✅ Profissional criada com sucesso! ID: ${professionalId}`);
  }

  // 2. Inserir os Serviços
  const servicos = [
    { name: 'Corte', duration_minutes: 60, price_cents: 8000, description: 'Corte moderno e lavagem incl.' },
    { name: 'Escova', duration_minutes: 45, price_cents: 6000, description: 'Modeladora ou lisa' },
    { name: 'Coloração', duration_minutes: 120, price_cents: 25000, description: 'Tintura completa e tratamento' }
  ];

  for (const s of servicos) {
    const { data: servExist } = await supabase
      .from('services')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('name', s.name)
      .single();

    if (!servExist) {
      const { error: errServ } = await supabase.from('services').insert({
        ...s,
        professional_id: professionalId
      });
      if (errServ) {
        console.error(`❌ Erro ao inserir seriço ${s.name}:`, errServ);
      } else {
        console.log(`✂️  Serviço criado: ${s.name}`);
      }
    } else {
      console.log(`✂️  Serviço ${s.name} já existe.`);
    }
  }

  console.log('🎉 Setup Finalizado. Tudo pronto para o Salão da Rê!');
}

setupRe().catch(console.error);
