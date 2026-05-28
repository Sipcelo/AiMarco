/**
 * init-memory.ts
 *
 * Script para inicializar o Mem0 com fatos importantes do projeto AiMarco.
 * Extrai informações críticas de documentação e migrations para otimizar
 * o consumo de tokens em conversas futuras.
 *
 * Uso:
 *   npx tsx backend/src/scripts/init-memory.ts
 *
 * Pré-requisitos:
 *   - Mem0 instalado: pip install mem0ai
 *   - Variável MEM0_API_KEY configurada (ou usar mem0 local)
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =================== CONFIGURAÇÃO ===================

// Caminhos base
const DOCS_DIR = '/app/docs';
const MIGRATIONS_DIR = '/app/backend/supabase/migrations';
const ARCHITECTURE_FILE = '/app/docs/architecture.md';
const MODELAGEM_FILE = '/app/docs/modelagem_inicial_banco.md';
const API_V1_FILE = '/app/docs/api_v1.md';
const ROADMAP_FILE = '/app/docs/roadmap.md';

// Mem0 configuration
// Se MEM0_API_KEY estiver definida, usa a nuvem; senão, usa armazenamento local
const MEM0_API_KEY = process.env.MEM0_API_KEY;

// =================== TIPOS ===================

interface Fact {
  content: string;
  metadata: {
    category: 'stack' | 'database_constraint' | 'business_rule' | 'api' | 'architecture';
    source: string;
    importance?: 'critical' | 'high' | 'medium';
  };
}

// =================== FUNÇÕES DE EXTRAÇÃO ===================

/**
 * Extrai fatos dos arquivos de documentação
 */
async function extractFromDocs(): Promise<Fact[]> {
  const facts: Fact[] = [];

  // 1. Architecture - Stack e Regras de Negócio Críticas
  try {
    const archContent = await readFile(ARCHITECTURE_FILE, 'utf-8');

    // Stack tecnológica
    facts.push({
      content: 'Stack: Frontend React Native com Expo, Backend Supabase (PostgreSQL + Auth), Database PostgreSQL. Timezone: America/Sao_Paulo.',
      metadata: { category: 'stack', source: 'architecture.md', importance: 'critical' }
    });

    // Regras deNegócio V1
    const businessRules = [
      'Booking: guest customers only (no account required)',
      'Customer identity: phone number (scoped by professional_id)',
      'Appointments are auto-confirmed after all business rules pass',
      'Minimum booking notice: 30 minutes from current time',
      'Minimum cancellation notice: 2 hours',
      'Minimum reschedule notice: 2 hours',
      'One professional per schedule (no multi-professional in V1)',
      '15-minute visual time grid',
      'No payments, subscriptions, marketplace in V1',
    ];

    businessRules.forEach(rule => {
      facts.push({
        content: rule,
        metadata: { category: 'business_rule', source: 'architecture.md', importance: 'critical' }
      });
    });

    // Garantias críticas
    facts.push({
      content: 'Critical guarantee: No overlapping active appointments for a professional (enforced by exclusion constraint)',
      metadata: { category: 'business_rule', source: 'architecture.md', importance: 'critical' }
    });

    facts.push({
      content: 'Critical guarantee: Server-side availability recalculation at booking time (never trust client-provided slots)',
      metadata: { category: 'business_rule', source: 'architecture.md', importance: 'critical' }
    });

    facts.push({
      content: 'Critical guarantee: Snapshots mandatory in appointments: service_name, service_duration_minutes, client_name, client_phone',
      metadata: { category: 'business_rule', source: 'architecture.md', importance: 'critical' }
    });

    facts.push({
      content: 'Critical guarantee: Rescheduling handled internally as cancellation + new linked appointment (preserves lineage)',
      metadata: { category: 'business_rule', source: 'architecture.md', importance: 'critical' }
    });

    // Status oficiais
    facts.push({
      content: 'Official appointment statuses: confirmed, cancelled, completed, no_show',
      metadata: { category: 'business_rule', source: 'architecture.md', importance: 'high' }
    });

  } catch (err) {
    console.error('Erro ao ler architecture.md:', err);
  }

  // 2. Modelagem Inicial de Banco - Constraints
  try {
    const modelContent = await readFile(MODELAGEM_FILE, 'utf-8');

    // Tables principais
    const tables = [
      'professionals',
      'clients',
      'services',
      'availability_rules',
      'blocked_slots',
      'appointments',
      'notifications'
    ];

    tables.forEach(table => {
      facts.push({
        content: `Table: ${table} - Core domain entity`,
        metadata: { category: 'database_constraint', source: 'modelagem_inicial_banco.md', importance: 'high' }
      });
    });

    // Constraints importantes
    facts.push({
      content: 'Constraint: clients UNIQUE (professional_id, phone) - ensures one client per professional per phone',
      metadata: { category: 'database_constraint', source: 'modelagem_inicial_banco.md', importance: 'critical' }
    });

    facts.push({
      content: 'Constraint: services FOREIGN KEY (professional_id) ON DELETE CASCADE',
      metadata: { category: 'database_constraint', source: 'modelagem_inicial_banco.md', importance: 'high' }
    });

    facts.push({
      content: 'Constraint: availability_rules FOREIGN KEY (professional_id) ON DELETE CASCADE',
      metadata: { category: 'database_constraint', source: 'modelagem_inicial_banco.md', importance: 'high' }
    });

    facts.push({
      content: 'Constraint: blocked_slots FOREIGN KEY (professional_id) ON DELETE CASCADE',
      metadata: { category: 'database_constraint', source: 'modelagem_inicial_banco.md', importance: 'high' }
    });

    facts.push({
      content: 'Constraint: appointments FOREIGN KEY (professional_id) ON DELETE CASCADE, FOREIGN KEY (service_id) ON DELETE RESTRICT, FOREIGN KEY (client_id) ON DELETE RESTRICT',
      metadata: { category: 'database_constraint', source: 'modelagem_inicial_banco.md', importance: 'critical' }
    });

  } catch (err) {
    console.error('Erro ao ler modelagem_inicial_banco.md:', err);
  }

  // 3. API V1 - Endpoints e Contratos
  try {
    const apiContent = await readFile(API_V1_FILE, 'utf-8');

    const endpoints = [
      { path: 'GET /v1/availability/:professional_id', desc: 'Returns available time slots for a professional on a given date' },
      { path: 'GET /v1/professionals/:id/available-days', desc: 'Returns next N available days based on availability_rules' },
      { path: 'GET /v1/professionals/:id/appointments', desc: 'Returns confirmed and past appointments for a date' },
      { path: 'GET /v1/professionals/:id/blocked-slots', desc: 'Returns blocked slots for a date' },
      { path: 'POST /v1/appointments', desc: 'Creates appointment (guest booking) - auto-confirmed' },
      { path: 'POST /v1/appointments/:id/cancel', desc: 'Cancels confirmed appointment' },
      { path: 'POST /v1/appointments/:id/reschedule', desc: 'Reschedules (cancel + create new, preserves lineage)' },
      { path: 'POST /v1/appointments/:id/status', desc: 'Updates status (confirmed → completed or no_show)' },
      { path: 'POST /v1/professionals/:id/blocked-slots', desc: 'Creates blocked slot with conflict warnings' },
    ];

    endpoints.forEach(ep => {
      facts.push({
        content: `API: ${ep.path} - ${ep.desc}`,
        metadata: { category: 'api', source: 'api_v1.md', importance: 'high' }
      });
    });

    // Regras de booking da API
    facts.push({
      content: 'API rule: POST /v1/appointments requires professional_id, service_id, scheduled_at (with timezone), client_name, client_phone',
      metadata: { category: 'api', source: 'api_v1.md', importance: 'critical' }
    });

    facts.push({
      content: 'API rule: Client upsert on each booking - (professional_id, phone) unique constraint ensures idempotency',
      metadata: { category: 'api', source: 'api_v1.md', importance: 'critical' }
    });

    facts.push({
      content: 'API rule: Concurrency protected via PostgreSQL advisory lock per professional',
      metadata: { category: 'api', source: 'api_v1.md', importance: 'critical' }
    });

    facts.push({
      content: 'API rule: Slot validation runs inside atomic RPC (create_appointment_v1)',
      metadata: { category: 'api', source: 'api_v1.md', importance: 'critical' }
    });

  } catch (err) {
    console.error('Erro ao ler api_v1.md:', err);
  }

  // 4. Roadmap - Prioridades e Não-objetivos
  try {
    const roadmapContent = await readFile(ROADMAP_FILE, 'utf-8');

    facts.push({
      content: 'V1 Priorities: 1) Scheduling reliability 2) Overlap prevention 3) Availability correctness 4) Simple booking flow 5) Clear professional schedule view 6) Cancellation and rescheduling integrity',
      metadata: { category: 'business_rule', source: 'roadmap.md', importance: 'high' }
    });

    facts.push({
      content: 'V1 Non-goals: Payments, Subscriptions, Marketplace, Customer accounts, Multi-professional schedules, Advanced CRM, Marketing automation, Financial reports',
      metadata: { category: 'business_rule', source: 'roadmap.md', importance: 'high' }
    });

    facts.push({
      content: 'Security checklist (pre-production): JWT+RBAC, ownership checks, rate limiting, DTOs, webhook signatures, mass assignment whitelist',
      metadata: { category: 'business_rule', source: 'roadmap.md', importance: 'critical' }
    });

  } catch (err) {
    console.error('Erro ao ler roadmap.md:', err);
  }

  return facts;
}

/**
 * Extrai constraints de migrações SQL
 */
async function extractFromMigrations(): Promise<Fact[]> {
  const facts: Fact[] = [];

  try {
    const files = await readdir(MIGRATIONS_DIR);

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = join(MIGRATIONS_DIR, file);
        const content = await readFile(filePath, 'utf-8');

        // Detectar exclusion constraints
        if (content.includes('EXCLUDE USING gist') || content.includes('EXCLUDE')) {
          const match = content.match(/ALTER TABLE (\w+).*?EXCLUDE USING gist([\s\S]*?)WHERE?\s*\(([^)]+)\)/i) || content.match(/EXCLUDE USING gist([\s\S]*?)\)/);
          if (match) {
            const table = match[1] || 'unknown';
            const where = match[3] || 'all rows';
            facts.push({
              content: `SQL Constraint: ${table} has GiST exclusion constraint: ${content.trim().split('\n')[0]}`,
              metadata: { category: 'database_constraint', source: file, importance: 'critical' }
            });
          }
        }

        // Detectar UNIQUE constraints
        if (content.includes('UNIQUE') && content.includes('ADD CONSTRAINT')) {
          const uniqueMatches = content.matchAll(/ADD CONSTRAINT (\w+) UNIQUE \(([^)]+)\)/gi);
          for (const m of uniqueMatches) {
            facts.push({
              content: `SQL Constraint: ${m[1]} - UNIQUE(${m[2]})`,
              metadata: { category: 'database_constraint', source: file, importance: 'high' }
            });
          }
        }

        // Detectar FOREIGN KEY constraints
        if (content.includes('REFERENCES')) {
          const fkMatches = content.matchAll(/(\w+)\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(\w+)\((\w+)\)(\s+ON DELETE (\w+))?/gi);
          for (const m of fkMatches) {
            facts.push({
              content: `SQL Constraint: ${m[1]} → ${m[2]}(${m[3]})${m[5] ? ` ON DELETE ${m[5]}` : ''}`,
              metadata: { category: 'database_constraint', source: file, importance: 'high' }
            });
          }
        }

        // Detectar triggers importantes
        if (content.includes('CREATE OR REPLACE FUNCTION') && content.includes('TRIGGER')) {
          facts.push({
            content: `SQL Migration: ${file} - Contains RPC function or trigger for business logic`,
            metadata: { category: 'database_constraint', source: file, importance: 'medium' }
          });
        }
      }
    }
  } catch (err) {
    console.error('Erro ao ler migrations:', err);
  }

  return facts;
}

/**
 * Extrai informações de um arquivo de regras de agente (GEMINI.md, CLAUDE.md, etc)
 */
async function extractAgentRules(): Promise<Fact[]> {
  const facts: Fact[] = [];
  const ruleFiles = ['/app/GEMINI.md', '/app/CLAUDE.md'];

  for (const file of ruleFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      const fileName = basename(file);

      // Extrair regras de ouro
      if (content.includes('REGRAS DE OURO') || content.includes('GOLDEN RULES')) {
        facts.push({
          content: `Agent Rules from ${fileName}: NEVER remove database constraints (GiST exclusion, UNIQUE, CHECK)`,
          metadata: { category: 'business_rule', source: fileName, importance: 'critical' }
        });
      }

      if (content.includes('DELETE') && content.includes('is_active')) {
        facts.push({
          content: `Agent Rules from ${fileName}: DELETE of services and availability_rules NEVER does physical delete. Only set is_active=false. Historical records are sacred.`,
          metadata: { category: 'business_rule', source: fileName, importance: 'critical' }
        });
      }

      if (content.includes('availability_rules') && content.includes('day_of_week')) {
        facts.push({
          content: `Agent Rules from ${fileName}: availability_rules have is_active flag and day_of_week 0-6 (Sunday=0 or Monday=0 depending on convention)`,
          metadata: { category: 'database_constraint', source: fileName, importance: 'high' }
        });
      }

    } catch (err) {
      // Arquivo pode não existir
    }
  }

  return facts;
}

// =================== MEM0 INTEGRATION ===================

/**
 * Salva fatos no Mem0 usando o script Python (store_memory.py)
 */
function saveToMem0(facts: Fact[]): void {
  if (facts.length === 0) {
    console.log('⚠️  Nenhum fato para salvar.');
    return;
  }

  // Preparar payload JSON para o Python script
  const payload = {
    facts,
    user_id: 'aimarco-project'
  };
  const payloadStr = JSON.stringify(payload);

  // Caminho para o Python do venv e o script
  const pythonPath = join('/app/backend/venv/bin/python');
  const scriptPath = join(__dirname, 'store_memory.py');

  // Executar Python script via subprocess
  const result = spawnSync(pythonPath, [scriptPath], {
    input: payloadStr,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });

  // Log do resultado
  if (result.status === 0) {
    console.log('✅ Fatos armazenados no Mem0.\n');
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
  } else {
    console.error('❌ Erro ao executar store_memory.py:');
    if (result.stderr) {
      console.error(result.stderr);
    }
    console.error(`Código de saída: ${result.status}`);
    process.exit(1);
  }
}

// =================== MAIN ===================

async function main() {
  console.log('🔍 Iniciando extração de fatos do projeto AiMarco...\n');

  const facts: Fact[] = [];

  // Extrair de várias fontes
  const [docsFacts, migrationFacts, agentFacts] = await Promise.all([
    extractFromDocs(),
    extractFromMigrations(),
    extractAgentRules()
  ]);

  facts.push(...docsFacts, ...migrationFacts, ...agentFacts);

  console.log(`📦 Extraídos ${facts.length} fatos.\n`);
  console.log('Amostra de fatos (por categoria):\n');

  // Mostrar alguns fatos de exemplo
  const categories = new Set(facts.map(f => f.metadata.category));
  categories.forEach(cat => {
    const catFacts = facts.filter(f => f.metadata.category === cat);
    console.log(`  [${cat.toUpperCase()}] ${catFacts.length} fatos`);
    if (catFacts.length > 0) {
      console.log(`    • ${catFacts[0].content.substring(0, 80)}...`);
    }
  });
  console.log('');

  // Salvar no Mem0
  saveToMem0(facts);

  console.log('\n✅ Inicialização de memória concluída.');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
