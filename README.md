# AiMarco

App mobile de agendamento para profissionais autônomos de beleza.

## Stack

- **Mobile:** React Native + Expo SDK 55
- **Backend:** Node.js + TypeScript
- **Banco:** Supabase (PostgreSQL)
- **Deploy:** Railway

## Funcionalidades V1

- Agendamento de serviços pelo cliente (guest, sem conta)
- Agenda diária e semanal para o profissional
- Bloqueio de horários
- Cancelamento e atualização de status de agendamentos
- Proteção contra duplo agendamento via advisory lock

## Estrutura
apps/mobile/     → App React Native
backend/         → API Node.js
docs/            → Documentação do projeto

## Desenvolvimento

### Backend (API + Worker)
O backend utiliza um sistema de **Process Orchestration** para rodar a API e o Worker de notificações simultaneamente.

```bash
cd backend
npm install
npm run dev
```

### Mobile
```bash
cd apps/mobile
npm install
npx expo start
```

## Segurança e Integridade

- **Auth:** JWT via Supabase Auth + Resource Ownership (o profissional só acessa seus próprios dados).
- **Integridade:** PostgreSQL Exclusion Constraints para prevenir sobreposição de horários.
- **Validação:** Camada DTO com Zod para sanitização de todos os inputs.
- **Orquestração:** Worker reativo usando PostgreSQL LISTEN/NOTIFY para processamento de notificações em background.
- **Rate Limiting:** Proteção contra spam no endpoint de agendamentos.

## Produção

Backend: https://aimarco.up.railway.app
