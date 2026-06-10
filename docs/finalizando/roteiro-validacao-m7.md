# Roteiro de Validação M7 — Fluxo fim-a-fim (pré-piloto)

> **Objetivo:** provar, com evidência, que um agendamento real percorre todo o caminho
> **booking público → banco → agenda mobile → push → WhatsApp**, mais cancelamento e reagendamento.
> **Quem executa:** humano (precisa de navegador, device físico logado e acesso ao Supabase/Railway).
> **Base:** módulos M7 do `polimento-e-lancamento-fdd.md`; critérios de aceitação na §5.5 daquele doc.

---

## 0. Pré-requisitos (conferir ANTES de começar)

| # | Item | Como confirmar | Status esperado |
|---|------|----------------|-----------------|
| P1 | Backend de produção no ar | `GET https://aimarco.up.railway.app/health` | `{"status":"ok"}` |
| P2 | **Worker** rodando no Railway | Railway → serviço do worker → logs mostram `Worker listening for new_notification...` | ativo |
| P3 | `DATABASE_URL` válido em produção | Worker conecta sem erro de auth nos logs | sem `password authentication failed` |
| P4 | WhatsApp API configurada (`WHATSAPP_API_URL`/`KEY`) | Railway → variáveis (só presença) | presentes — senão WhatsApp cai em `failed` (ver §5) |
| P5 | Profissional de teste com **slug**, **1+ serviço ativo** e **disponibilidade** no dia do teste | abrir `/p/<slug>` e ver serviços/horários | serviços e slots aparecem |
| P6 | Profissional **logado no app mobile** (device físico) com **push_token** registrado | app aberto ao menos uma vez no device físico (Expo Go/emulador não recebem push) | sessão ativa no device |

> **Dados de teste:** use um profissional que você controla (ex.: conta de teste). Anote: `slug`, `professional_id`, telefone do cliente de teste (um WhatsApp seu para conferir a mensagem).

---

## 1. Fluxo A — Booking criado fim-a-fim

### Passos
1. No navegador, abrir `https://aimarco.up.railway.app/p/<slug>`.
2. Selecionar um **serviço** → `PRÓXIMO`.
3. Escolher **dia** com horário e um **slot** → `PRÓXIMO`.
4. Preencher **nome** e **WhatsApp** (use um número seu) → `REVISAR`.
5. Conferir o resumo → `CONFIRMAR AGENDAMENTO`.

### Resultado esperado
- Tela de **sucesso** ("Agendado!") com serviço, data, horário e valor.

### Verificações (coletar evidência de cada uma)
| V | O que verificar | Onde / como | Evidência |
|---|-----------------|-------------|-----------|
| A1 | Appointment persistido com snapshots | App mobile → agenda do dia do agendamento (deve aparecer com nome, serviço, horário) | screenshot da agenda |
| A2 | (alternativa a A1) via REST autenticado | `GET /v1/professionals/:id/appointments` com `Authorization: Bearer <jwt>` | id do appointment + `service_name`, `client_name` |
| A3 | **Push** chegou ao profissional | Device físico do profissional recebe notificação "Novo agendamento" | screenshot da notificação |
| A4 | Notificações drenaram | Supabase Studio → Table Editor → `notifications`: 2 linhas do `appointment_id` (`professional/in_app` e `client/whatsapp`) saíram de `pending` | linhas com `status=sent` (ou `failed` + `failure_reason`) |
| A5 | **WhatsApp** entregue ao cliente | WhatsApp do número usado no passo 4 recebe a mensagem `APPOINTMENT_CREATED` | screenshot da mensagem (se P4 ativo) |

> **Nota A4/A5:** se `WHATSAPP_API_URL/KEY` não estiverem configurados, a linha `client/whatsapp` ficará `failed` com `failure_reason` — isso é **esperado e aceitável** para o piloto, desde que compreendido. A linha `professional/in_app` deve ir a `sent` (cai no ramo de simulação do worker).

---

## 2. Fluxo B — Cancelamento

### Passos
1. No app mobile, abrir o agendamento criado no Fluxo A.
2. **Cancelar** o agendamento.

### Resultado esperado / verificações
| V | Verificar | Onde | Evidência |
|---|-----------|------|-----------|
| B1 | Status vira `cancelled` | agenda mobile (some/aparece como cancelado) | screenshot |
| B2 | Notificação `APPOINTMENT_CANCELLED` gerada | Supabase Studio → `notifications` (novas 2 linhas pending → sent/failed) | linhas drenadas |
| B3 | Ownership respeitado | tentar cancelar agendamento de **outro** profissional (via REST com jwt errado) deve dar 403 | resposta 403 |

---

## 3. Fluxo C — Reagendamento

### Passos
1. Criar um novo agendamento (repetir Fluxo A, passos 1–5).
2. No app mobile, **reagendar** para outro horário livre.

### Resultado esperado / verificações
| V | Verificar | Onde | Evidência |
|---|-----------|------|-----------|
| C1 | Novo horário gravado, histórico preservado (`rescheduled_from_appointment_id`) | agenda mobile mostra novo horário | screenshot |
| C2 | Notificação `APPOINTMENT_RESCHEDULED` gerada e drenada | Supabase Studio → `notifications` | linhas sent/failed |
| C3 | Reagendar para horário **ocupado** deve falhar com erro claro de indisponibilidade (409) | tentar reagendar para um slot já tomado | mensagem "Selected slot is no longer available." |

---

## 4. Verificações de borda (rápidas, opcionais mas recomendadas)

- **Overlap:** dois bookings simultâneos no mesmo slot → só um vence (o outro recebe 409). (Difícil reproduzir à mão; o teste de concorrência já cobre.)
- **Slot fora da disponibilidade / serviço inativo:** não devem aparecer como opção no `/p/<slug>`.
- **Telefone inválido:** o passo 4 bloqueia avanço com "Informe DDD + celular com 9 dígitos."
- **Slug inexistente:** `/p/nao-existe` mostra card de erro, sem vazar dados.

---

## 5. Troubleshooting (protocolo `debugging-and-error-recovery`)

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Sucesso na web mas nada na agenda mobile | appointment não persistiu OU app não atualizou | conferir REST `GET .../appointments`; conferir logs do backend (erro do RPC) |
| Push não chega | device não é físico, `push_token` ausente, ou key FCM V1 errada no EAS | conferir `professionals.push_token` (Supabase); reabrir app no device; ver `notifications.md`/progress.md |
| `notifications` acumulando em `pending` | **worker parado** ou sem conexão DB | reiniciar worker no Railway; conferir logs `Worker listening...` e ausência de erro de auth |
| `client/whatsapp` sempre `failed` | `WHATSAPP_API_URL/KEY` não configurados | configurar no Railway, ou aceitar como pendência conhecida do piloto |
| 500 no booking | erro inesperado no RPC | o cliente vê genérico; **detalhe completo está no log do servidor** (Railway) — investigar lá |
| Rate limit bloqueando teste | >10 req/min do mesmo IP | aguardar 1 min (retorna 429, não 500 — corrigido no M3) |

---

## 6. Critérios de aceitação do M7 (todos com evidência)

- [ ] 1 agendamento criado via `/p/:slug` em produção (guest), com tela de sucesso.
- [ ] Appointment visível na agenda mobile, com snapshots (serviço, horário, nome).
- [ ] Push recebido em device físico.
- [ ] Notificações drenadas: `professional/in_app` = `sent`; `client/whatsapp` = `sent` (ou `failed` + `failure_reason` compreendido).
- [ ] Cancelamento e reagendamento funcionam, com notificações correspondentes.
- [ ] Reagendar para horário ocupado retorna 409 (indisponível).
- [ ] Cancelamento de agendamento alheio retorna 403 (ownership).
- [ ] Evidências (timestamps, ids, screenshots) registradas no `progress.md`.

> Ao concluir, registrar no `progress.md` o resumo com ids/timestamps e marcar o M7 no `task.md` e no `polimento-e-lancamento-fdd.md`.

---

## 7. Onde ler dados sem `DATABASE_URL` direto

Enquanto o `DATABASE_URL` estiver inválido (pendência do M4/M6), use:
- **Supabase Studio** (painel web) → Table Editor para ler `appointments` e `notifications` (status, failure_reason).
- **App mobile** para a visão do profissional (agenda, push).
- **Railway logs** do worker para acompanhar `[WHATSAPP] Enviando...`, `marked as sent`, ou erros.
- **REST autenticado** (`GET /v1/professionals/:id/appointments`) para confirmar persistência e DTO sem PII de terceiros.
