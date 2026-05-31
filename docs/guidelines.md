# Guidelines de Desenvolvimento Orientado a IA — AiMarco V1

> **Objetivo:** definir como o projeto AiMarco V1 será desenvolvido e como a IA deve trabalhar.
> **Fundamento:** estes guidelines não criam requisitos novos. Tudo deriva dos documentos existentes em `docs/` — principalmente `docs/finalizando/FDD.md`, `docs/plan.md` e `docs/task.md` — e das regras de `CLAUDE.md`.
> **Hierarquia oficial:** **Alto nível (Global) → Etapa/Tópico → Prompt/Tarefa**.

---

## 1. Princípios inegociáveis

- **Fundamentação obrigatória:** nenhuma tarefa pode ser inventada. Toda ação deve rastrear até um item do FDD, do `plan.md` ou do `task.md`.
- **Trabalhar com evidência:** comandos executados, arquivos alterados, testes rodados, resultados e riscos. Nunca declarar sucesso sem prova.
- **Segurança primeiro:** nunca versionar segredos (`.env`, `supa-*.txt`, chaves). Rodar verificação de segredos antes de cada commit relevante.
- **Commit por etapa:** cada etapa é comentada e commitada separadamente, com mensagem temática e pequena. Nunca misturar temas.
- **Sem arquivos nocivos ou fora de escopo:** não criar artefatos temporários no repo sem limpar; não adicionar features fora do V1.
- **Simplicidade do V1:** preservar a fundação enxuta descrita em `architecture.md`; não superengenheirar.

---

## 2. Artefatos e responsabilidades

| Artefato | Nível | O que define | Responsável |
|----------|-------|--------------|-------------|
| `docs/finalizando/FDD.md` | Produto | Módulos, dados, workflow e validação | Desenvolvedor |
| `docs/plan.md` | Alto nível (Global) | Ordem geral do projeto / sprint | Desenvolvedor |
| `docs/task.md` | Etapa / Tópico | Checklist de itens por etapa | Desenvolvedor |
| Plano por prompt | Prompt / Tarefa | Workflow da IA para executar cada tarefa | IA (executora) |

**Regra de geração:** os arquivos `FDD.md`, `plan.md` e `task.md` são sempre gerados/atualizados a partir dos planos de ação acima, nunca de suposições.

---

## 3. Plano de Ação Global (Alto nível)

**Visão de alto nível do projeto, focada na ordem geral do projeto/sprint. Responsabilidade: Desenvolvedor.**

O Plano Global é materializado em `docs/plan.md` e define a sequência de etapas e suas dependências. Ele responde "o que vem antes e o que vem depois", não "como fazer".

- Define a visão de alto nível e a ordem das etapas (ver `plan.md`: Fundação → Dados → Auth/Segurança → Domínio do profissional → Agendamento → Notificações → Web → Mobile → Estabilização).
- Cada etapa tem objetivo claro e respeita as dependências naturais do sistema.
- Toda etapa do Plano Global deve estar fundamentada no FDD e nos documentos de apoio (`architecture.md`, `roadmap.md`, `modelagem_inicial_banco.md`).
- O Plano Global não contém detalhamento de código.
- Mudanças de escopo de sprint exigem atualizar `plan.md` antes de alterar `task.md`.

## 4. Plano de Ação por Etapa / Tópico (Baixo nível)

**Visão de baixo nível de cada etapa, focada nos itens a desenvolver. Responsabilidade: Desenvolvedor.**

O Plano por Etapa é materializado em `docs/task.md` como checklist em branco (`- [ ]`), marcado `- [x]` conforme conclusão. Cada etapa do `plan.md` vira um bloco de tarefas concretas no `task.md`.

- Cada item é autoexplicativo e corresponde a uma ação concreta e verificável.
- Cada etapa inclui os comandos de verificação aplicáveis: `npm run build`, `npm run test:unit`, `npm run test:security`, `npm run test:integration`.
- Cada etapa ignora explicitamente artefatos temporários (`backend/supabase/.temp/`) e segredos (`backend/.env`).
- Cada etapa termina com uma tarefa de **comentar e commitar** separadamente.
- Nenhum item pode ser adicionado sem origem no Plano Global ou no FDD.

## 5. Plano de Ação por Prompt (Workflow da IA)

**Define como a IA cria e executa um plano de ação para cada tarefa do `task.md`. Responsabilidade: IA executora.**

Para cada tarefa selecionada do `task.md`, a IA segue um workflow fixo, da leitura de contexto até o commit, sempre com evidência.

- **Contextualizar:** ler `docs/` relevantes e localizar a tarefa no `plan.md`/`task.md` antes de agir.
- **Planejar:** decompor a tarefa em passos mínimos e identificar arquivos, riscos e impacto (sem inventar requisitos).
- **Executar com evidência:** implementar a mudança e rodar build/testes pertinentes à etapa.
- **Verificar e relatar:** mostrar `git status --short` / `git diff --stat`, resultados de teste e riscos; resumir riscos extras se a mudança tocar auth, banco, agendamento ou env.
- **Fechar a tarefa:** marcar `- [x]` no `task.md`, comentar e commitar a etapa separadamente; nunca esconder falhas.

---

## 6. Formato de resposta da IA (obrigatório)

Para qualquer tarefa técnica, a IA responde neste formato (conforme `CLAUDE.md`):

```md
## Resultado
### Arquivos alterados
### Comandos executados
### Resultado dos testes
### Riscos encontrados
### Próxima ação recomendada
```

Para auditorias, usar o formato de auditoria do `CLAUDE.md` (Estado encontrado / Problemas / Recomendações P0–P2 / Perguntas para decisão humana).

---

## 7. Política de Git e verificação

- Antes de cada commit relevante: `git status --short`, `git diff --stat` e verificação de segredos.
- Nunca executar `git push` ou `git push --force` sem autorização explícita.
- Commits pequenos e temáticos, no formato `<tipo>: <descrição>` (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`).
- Build e testes devem passar antes de declarar uma etapa concluída.
- Falhas de build/teste são reportadas com comando, erro, arquivo/linha, causa provável, correção e se é bloqueante para o V1.

---

## 8. Fluxo de ponta a ponta (resumo)

```txt
FDD.md  ──►  plan.md  ──►  task.md  ──►  Plano por Prompt (IA)  ──►  código + testes  ──►  commit por etapa
(produto)   (global)     (etapa)        (workflow da tarefa)        (evidência)          (temático)
```

Cada nível alimenta o seguinte. A IA nunca pula da intenção direto ao código: sempre passa por FDD → plan → task → prompt, e devolve evidência antes do commit.
