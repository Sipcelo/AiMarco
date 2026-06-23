# M8 — Auditoria de lançamento e tarefas de fechamento

> **Data:** 2026-06-23
> **Escopo:** auditoria do módulo M8 (`polimento-e-lancamento-fdd.md` §4) antes de declarar concluído.
> **Método:** cada afirmação verificada contra o código/produção (evidência), não presumida.
> **Complementa:** `docs/finalizando/lancamento-m8.md` (rollback, monitoramento, ADRs).

---

## 1. Estado verificado (OK)

| Item | Evidência |
|------|-----------|
| Rollback doc: API+worker no mesmo container | `Dockerfile` CMD `npm start` → `run-p start:server start:worker` (`backend/package.json:19-21`) |
| Rollback doc: mobile sem OTA | sem dep `expo-updates` em `package.json`; sem `runtimeVersion`/`updates` em `app.json` |
| ADR buffer zero | `v_buffer_minutes INT := 0` (`20260601000002_availability_zero_buffer.sql:23`) |
| ADR 500 genérico | commit `9a7df24` existe |
| ADR rate limit 429 | commit `8e740ba` existe |
| ADR contrato v1 congelado | commit `6313852`; migration `contract_v2` confirmada inexistente |
| ADR redirect legado | `LegacyBookingRedirect` (`web/src/app/Router.tsx:10,20`) |
| Tag de release | `v1.0.0-pilot` criada e pushed |
| Healthcheck produção | `GET https://aimarco.up.railway.app/health` → `{"status":"ok"}` |
| Worker logs | strings `Worker connected to database.` / `Worker listening for new_notification...` (`worker.ts:13,16`) |

---

## 2. Problemas encontrados

### P0 — Cliente fica sem nenhum canal de confirmação ✅ RESOLVIDO (2026-06-23)

**Decisão:** opção (b) — ativar WhatsApp. Evolution API (Baileys) deployada como serviço separado no
Railway, instância `Regina` conectada ao número da profissional. `WHATSAPP_API_URL`/`WHATSAPP_API_KEY`
do AiMarco apontando para a instância. Teste real confirmado: mensagem de confirmação chegou no
WhatsApp da cliente. Ver `whatsapp-evolution-setup.md`.

**Correção de raiz aplicada:** templates de cliente extraídos para `services/whatsapp-templates.ts`
(antes inline no worker com placeholders frágeis `¹! ²!`), agora usando o nome **público**
(`professionals.display_name`) em vez de `full_name` — a mensagem mostrava "Demo Professional" em vez
de "Regina S. Hair". Teste `tests/unit/whatsapp-templates.test.ts` (4 casos). Build + 209 unit verdes.

Histórico do problema original:


1. **WhatsApp (Evolution) desligado de propósito** → toda notificação `recipient_type=client`
   (`APPOINTMENT_CREATED/CANCELLED/RESCHEDULED`, `worker.ts:72-90`) vira `failed`
   (`failure_reason: "Failed to parse URL from pending"`).
2. **Botão "Confirmar no WhatsApp" da tela de sucesso é código morto em produção.**
   `SuccessScreen` usa `professional?.phone` (`ProfessionalBookingPage.tsx:441`), mas o DTO público
   **exclui phone** (`backend/src/dtos/index.ts:29` — comentário explícito "NÃO inclui ... phone").
   Confirmado no endpoint real: payload de `/v1/public/professional/regina-s-hair` **não tem `phone`**
   → `whatsApp = null` → o botão nunca renderiza.

**Resultado:** o cliente agenda, vê a tela "Agendado! Seu horário está confirmado" (serviço/data/hora/valor)
e nada mais. Sem confirmação, sem lembrete, sem link de contato. Apenas o **profissional** recebe push.

> ⚠️ Correção de registro: a nota do M5 dizia "Produção (/p/:slug → SuccessScreen) usa telefone dinâmico".
> É **falsa** — `professional.phone` é sempre `undefined` porque o DTO público remove o campo.

**Opções (decisão de produto):**
- **(a)** Expor `whatsapp`/`phone` do profissional no DTO público (é o contato comercial da página de
  booking — defensável como dado público). Pequeno: ~3 linhas no DTO + populate. Botão wa.me revive.
- **(b)** Ligar Evolution API ou WhatsApp Business oficial → confirmação automática real ao cliente.
- **(c)** Aceitar piloto sem confirmação ao cliente (1–3 profissionais, baixo volume) **e remover o
  botão morto** para não confundir.

### P1 — Monitoramento é só documentação

`lancamento-m8.md` §2 define healthcheck + query SQL de `pending`, mas **nada está configurado**:
sem uptime monitor ativo, sem alerta. Se o worker morrer durante o piloto, ninguém é avisado até um
profissional reclamar.

**Ação:** apontar UptimeRobot/Better Stack (grátis, 5 min) para `https://aimarco.up.railway.app/health`.
Status do worker = checar log do Railway a cada deploy.

### P2 — Critério de aceite §5.5 cumprido com exceção

A §5.5 do FDD exige cadeia fim-a-fim "web pública → banco → agenda mobile → push → **WhatsApp**".
A perna WhatsApp foi adiada por decisão (P0 acima). Legítimo, mas é **exceção documentada**, não
cadeia 100% verde. Registrar como tal ao fechar a fase.

> Nota operacional: `failed` cresce monotônico no piloto (cada booking gera 1 falha de WhatsApp do
> cliente). É **esperado** — não é `pending` acumulando, então o sinal de monitoramento não se confunde.

---

## 3. Checklist de fechamento do M8

### Já concluído (M8 base)
- [x] escrever plano de rollback (Railway, Supabase, Expo) # `lancamento-m8.md` §1
- [x] definir monitoramento mínimo # `lancamento-m8.md` §2 (definido, não ativado — ver P1)
- [x] registrar ADRs (6) # `lancamento-m8.md` §3
- [x] criar tag `v1.0.0-pilot` # criada e pushed
- [x] commitar documentação de lançamento # `e7599b4`

### Pendente desta auditoria
- [x] **P0** decidir canal do cliente # opção (b) — WhatsApp via Evolution API (Baileys)
- [x] **P0** aplicar a decisão # Evolution deployada + instância `Regina` conectada + templates usando display_name (`services/whatsapp-templates.ts`); teste real confirmado
- [x] **P1** (código) endpoint `/health/ready` — DB + worker preso → 503; `/health` segue como liveness do Railway
- [ ] **P1** (ação humana) criar monitor externo (UptimeRobot/Better Stack) em `/health/ready`, alerta no não-200
- [ ] **P2** registrar no fechamento da fase que a cadeia §5.5 fecha com exceção WhatsApp
- [ ] iniciar piloto com grupo controlado (1–3 profissionais) # ação humana
- [ ] commitar: "docs: auditoria de fechamento do M8"

---

## 4. Veredito

Entregáveis do M8 (rollback, monitoramento definido, ADRs, tag) são **reais e conferem com o código**.
M8 está **fechável como módulo de documentação/release**. Estado das lacunas:

- **P0** (cliente sem canal de confirmação) — ✅ **RESOLVIDO**: WhatsApp ativo via Evolution (Baileys),
  templates corrigidos (display_name), teste real confirmado.
- **P1** (monitoramento manual, sem alerta) — **pendente**: ativar uptime monitor em `/health` antes do
  piloto real. Risco operacional de falha silenciosa.

Recomendação: resolver P1 antes do primeiro profissional real. ADRs, rollback e tag não bloqueiam.
