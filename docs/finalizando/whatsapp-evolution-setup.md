# WhatsApp — Setup Evolution API (Railway) para 1 profissional (piloto)

> **Contexto:** decisão M8 = ativar WhatsApp. Piloto = 1 profissional (Evolution). Demais virão na
> API oficial depois (ver `task_m8.md` P0 e dívida de roteamento por-profissional).
> **Política:** apenas **nomes** de variáveis aqui. Valores reais só no painel Railway. Nunca versionar.

## Fatos de partida (verificados)

- `aimarco.up.railway.app/manager` devolve o **SPA do AiMarco**, não o Evolution (catch-all do app).
  Evolution **não está instalado** — é serviço separado, URL separada.
- Projeto Railway: `efficient-growth` — hoje só tem o serviço `AiMarco`. Evolution precisa ser
  **serviço novo** (+ Postgres + Redis).
- Código de envio (`backend/src/services/whatsapp.ts`) faz `POST {WHATSAPP_API_URL}` com header
  `apikey` e body `{ number, text }` → formato **Evolution v2**. O template Railway = v2 → **bate, sem
  mudança de código**.

## Parte A — Subir o Evolution (painel Railway, não CLI)

> CLI não faz o template multi-serviço de 1 clique. Use o dashboard.

1. Railway → projeto `efficient-growth` → **New** → **Template** → procurar **"Evolution API"**.
   (O template já traz Evolution + Postgres + Redis configurados entre si.)
2. Deploy. Esperar os 3 serviços ficarem **Online**.
3. No serviço **Evolution**, conferir/ajustar variáveis (nomes):
   - `AUTHENTICATION_API_KEY` — você define essa chave (string forte). **Ela vira o
     `WHATSAPP_API_KEY` do AiMarco.** É secreta — não colar em lugar nenhum versionado.
   - `SERVER_URL` — **tem que ser igual à URL pública do serviço Evolution** (ex.:
     `https://evolution-production-xxxx.up.railway.app`). ⚠️ Gotcha conhecido: se `SERVER_URL`
     estiver errada, geração de QR e webhooks quebram.
   - Banco/Redis — vêm preenchidos pelo template; não mexer.
4. Abrir `https://<seu-evolution>.up.railway.app/manager` → agora **aparece a tela do Evolution**
   (login com a `AUTHENTICATION_API_KEY`).

## Parte B — Conectar o WhatsApp da profissional

1. No manager: **Create instance** → nome simples, ex.: `regina` (sem espaço/acento).
2. A instância gera **QR code** (ou **pairing code** de 8 dígitos).
3. No **celular da profissional**: WhatsApp → **Aparelhos conectados** → **Conectar aparelho** →
   escanear o QR (ou digitar o pairing code).
4. Instância fica **connected/open**. Pronto — mensagens sairão **do número dela**.

## Parte C — Ligar no AiMarco

No serviço **AiMarco** do Railway, setar (Variables):
- `WHATSAPP_API_URL` = `https://<seu-evolution>.up.railway.app/message/sendText/regina`
  (a instância vai **no fim da URL**; trocar `regina` pelo nome real da instância)
- `WHATSAPP_API_KEY` = a mesma `AUTHENTICATION_API_KEY` do Evolution (secreta — setar pelo painel)

Redeploy do AiMarco → worker passa a enviar. Sem mudança de código.

## Parte D — Validar (1 teste real controlado)

1. Fazer 1 booking real em `/p/<slug-da-profissional>` com **um número de teste seu** como cliente.
2. Conferir que o WhatsApp de confirmação chega no número de teste.
3. No banco: `select status, failure_reason from notifications order by created_at desc limit 3;`
   → `APPOINTMENT_CREATED` / `recipient_type=client` deve estar **`sent`** (não mais `failed`).

## Riscos / notas

- **Ban (Evolution = não-oficial):** número real da profissional, baixo volume de confirmações →
  risco baixo, não-zero. Por isso os demais vão pra API oficial.
- **Sessão hospedada no seu Evolution:** se a instância cair (deslogar), precisa re-escanear o QR.
  Monitorar o status da instância no manager.
- **Multi-tenant:** quando entrar o 2º profissional (oficial), o backend precisa de **roteamento por
  profissional** (provider + credencial por profissional). Hoje é **global** (1 URL/1 key). Fora do
  escopo do piloto N=1 — registrado como dívida no `task_m8.md`.
