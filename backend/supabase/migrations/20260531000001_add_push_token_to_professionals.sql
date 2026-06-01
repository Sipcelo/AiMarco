-- Migration: adiciona coluna push_token à tabela professionals.
--
-- Contexto: o backend (routes/v1/professionals/update-push-token.ts e
-- lib/send-push-notification.ts) lê/grava professionals.push_token para o
-- registro do Expo Push Token (ExponentPushToken[...]) e o envio de push.
-- A coluna nunca havia sido criada por nenhuma migration, então o
-- PUT /v1/professionals/:id/push-token falhava ao gravar e o envio de push
-- era silenciosamente abortado (token inexistente).
--
-- Tipo TEXT, nullable: cada profissional registra seu token após login no app.

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS push_token TEXT;
