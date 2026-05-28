-- Adicionar UNIQUE CONSTRAINT composta na tabela clients para viabilizar UPSERT
ALTER TABLE clients 
ADD CONSTRAINT clients_professional_phone_key UNIQUE (professional_id, phone);
