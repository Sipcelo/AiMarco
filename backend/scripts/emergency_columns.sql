-- 1. Criação das Colunas Ausentes na Tabela Professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- 2. Atualização defensiva para campos NOT NULL caso necessário no futuro
-- UPDATE professionals SET slug = id::text WHERE slug IS NULL;

-- 3. [CRÍTICO] Comando definitivo para atualizar o Schema Cache da API do Supabase (PostgREST)
NOTIFY pgrst, reload_schema;
