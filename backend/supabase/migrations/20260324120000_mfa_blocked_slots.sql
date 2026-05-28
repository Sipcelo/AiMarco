ALTER TABLE blocked_slots DROP CONSTRAINT IF EXISTS blocked_slots_overlap_exclude;
-- Habilitar a extensão btree_gist para suportar restrições de exclusão no Supabase/PostgreSQL
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Alterar a tabela blocked_slots
ALTER TABLE blocked_slots ADD COLUMN time_range tstzrange;

-- (Opcional) Popular o time_range se existirem dados baseados nas antigas colunas
UPDATE blocked_slots SET time_range = tstzrange(starts_at, ends_at, '[)') WHERE starts_at IS NOT NULL AND ends_at IS NOT NULL;

ALTER TABLE blocked_slots ALTER COLUMN time_range SET NOT NULL;

ALTER TABLE blocked_slots DROP COLUMN starts_at;
ALTER TABLE blocked_slots DROP COLUMN ends_at;

-- 2. Restrição GiST apenas na tabela blocked_slots para evitar conflitos de blocos do mesmo profissional
ALTER TABLE blocked_slots
ADD CONSTRAINT prevent_overlapping_blocks
EXCLUDE USING gist (
    professional_id WITH =,
    time_range WITH &&
);

-- 3. Função para garantir que Appointments e Blocked Slots não se sobreponham mutuamente
CREATE OR REPLACE FUNCTION check_appointment_block_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'appointments' THEN
        -- Ao inserir/atualizar um Appointment confirmado, verificar se afeta algum blocked_slot existente
        IF NEW.status = 'confirmed' AND EXISTS (
            SELECT 1 FROM blocked_slots
            WHERE professional_id = NEW.professional_id
            AND time_range && tstzrange(
                NEW.scheduled_at, 
                NEW.scheduled_at + interval '1 minute' * (SELECT duration_minutes FROM services WHERE id = NEW.service_id), 
                '[)'
            )
        ) THEN
            RAISE EXCEPTION 'overlap_with_block' USING ERRCODE = '23P04';
        END IF;

    ELSIF TG_TABLE_NAME = 'blocked_slots' THEN
        -- Ao inserir/atualizar um Blocked Slot, verificar se afeta algum Appointment confirmado existente
        IF EXISTS (
            SELECT 1 FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.professional_id = NEW.professional_id
            AND a.status = 'confirmed'
            AND tstzrange(a.scheduled_at, a.scheduled_at + interval '1 minute' * s.duration_minutes, '[)') && NEW.time_range
        ) THEN
            RAISE EXCEPTION 'overlap_with_appointment' USING ERRCODE = '23P04';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Constraint Triggers em ambas as tabelas (disparam no fim do statement garantindo locks transacionais limpos)
CREATE CONSTRAINT TRIGGER trigger_check_appointment_block_overlap
AFTER INSERT OR UPDATE ON appointments
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION check_appointment_block_overlap();

CREATE CONSTRAINT TRIGGER trigger_check_block_appointment_overlap
AFTER INSERT OR UPDATE ON blocked_slots
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION check_appointment_block_overlap();
