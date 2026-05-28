-- Migration 2026xxxx - Cockpit da Profissional (Fase 2.2 e 3.4)
-- Conteúdo: Alteração de Blocked Slots para tstzrange, GiST Exclusion Multi-Tabela e Triggers

-- 1. Criação do conceito de SLUG para rotas públicas (Ex: /p/salao-da-re)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
-- Atualizar os existentes para seus IDs como backup: UPDATE professionals SET slug = id::text WHERE slug IS NULL;

-- 2. Habilitar a extensão btree_gist para suportar restrições de exclusão com UUIDs, Texto, etc.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Migrar a tabela blocked_slots
-- Adicionamos a nova coluna de range
ALTER TABLE blocked_slots ADD COLUMN time_range tstzrange;

-- Opcional: Popular time_range com os dados das colunas antigas:
-- UPDATE blocked_slots SET time_range = tstzrange(starts_at, ends_at, '[)');

-- Apagamos as colunas antigas para forçar a API a usar o novo padrão
ALTER TABLE blocked_slots DROP COLUMN starts_at;
ALTER TABLE blocked_slots DROP COLUMN ends_at;

-- Re-adicionando a flag de nullability se necessário
ALTER TABLE blocked_slots ALTER COLUMN time_range SET NOT NULL;

-- 3. Adicionar GiST nativo na tabela blocked_slots (Evitar conflito Block vs Block)
ALTER TABLE blocked_slots
ADD CONSTRAINT prevent_overlapping_blocks
EXCLUDE USING gist (
    professional_id WITH =,
    time_range WITH &&
);

-- 4. Função: Verificar se há conflito de BLOCKED SLOT com APPOINTMENTS
CREATE OR REPLACE FUNCTION trigger_check_appointment_block_overlap()
RETURNS TRIGGER AS $$
DECLARE
    -- Assumindo que o serviço tem duration_minutes e transformamos num tstzrange
    -- No entanto, appointment não tem ends_at no V1. A duração depende do serviço.
    -- Pra simplificar de forma genérica, vamos simular via join na verificação
    conflict_count INT;
BEGIN
    IF TG_TABLE_NAME = 'blocked_slots' THEN
        -- Novo bloqueio tenta encontrar algum agendamento do mesmo profissional cuja (scheduled_at + service duration) sobreponha
        SELECT COUNT(*)
        INTO conflict_count
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.professional_id = NEW.professional_id
          AND a.status = 'confirmed'
          AND tstzrange(a.scheduled_at, a.scheduled_at + (s.duration_minutes || ' minutes')::interval, '[)') && NEW.time_range;
          
        IF conflict_count > 0 THEN
            RAISE EXCEPTION 'exclusion_violation: conflict between blocked_slots and appointments';
        END IF;
    ELSIF TG_TABLE_NAME = 'appointments' THEN
        -- Novo agendamento tenta verificar se choca com algum bloqueio (se for INSERT ou UPDATE de hora)
        -- Precisa da duração do serviço associado
        SELECT COUNT(*)
        INTO conflict_count
        FROM blocked_slots b
        JOIN services s ON s.id = NEW.service_id
        WHERE b.professional_id = NEW.professional_id
          AND b.time_range && tstzrange(NEW.scheduled_at, NEW.scheduled_at + (s.duration_minutes || ' minutes')::interval, '[)');
          
        IF conflict_count > 0 THEN
            RAISE EXCEPTION 'exclusion_violation: conflict between blocked_slots and appointments';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar Triggers que invocam a Validação Cruzada (A garantia de concorrência extra)
DROP TRIGGER IF EXISTS trg_check_overlap_on_block ON blocked_slots;
CREATE TRIGGER trg_check_overlap_on_block
BEFORE INSERT OR UPDATE ON blocked_slots
FOR EACH ROW EXECUTE FUNCTION trigger_check_appointment_block_overlap();

DROP TRIGGER IF EXISTS trg_check_overlap_on_appointment ON appointments;
CREATE TRIGGER trg_check_overlap_on_appointment
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION trigger_check_appointment_block_overlap();
