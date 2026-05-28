# Memória de Projeto (Mem0)

Este diretório contém scripts para inicializar e gerenciar a memória de longo prazo do projeto AiMarco usando o [Mem0](https://mem0.ai).

## 📦 O que foi implementado

### `init-memory.ts`
Script TypeScript que extrai fatos críticos do projeto e os armazena no Mem0.

**Fontes de extração:**
- `/docs/architecture.md` — Stack, regras de negócio V1, garantias críticas
- `/docs/modelagem_inicial_banco.md` — Constraints de banco, entidades principais
- `/docs/api_v1.md` — Endpoints, contratos, regras de validação
- `/docs/roadmap.md` — Prioridades, não-objetivos, checklist de segurança
- `/backend/supabase/migrations/*.sql` — Constraints SQL (GiST exclusion, UNIQUE, FOREIGN KEY)
- `/GEMINI.md` e `/CLAUDE.md` — Regras de agente (ex: nunca deletar constraints)

**Categorias de fatos:**
- `stack` — Tecnologias utilizadas
- `database_constraint` — Constraints, foreign keys, exclusion constraints
- `business_rule` — Regras de negócio (booking, cancellation, snapshots, etc)
- `api` — Endpoints e seus comportamentos
- `architecture` — Princípios arquiteturais e decisões congeladas

### `store_memory.py`
Script Python que recebe os fatos em JSON via stdin e os persiste usando o SDK oficial do Mem0 (`mem0ai`). Possui fallback para armazenamento local em JSON caso `MEM0_API_KEY` não esteja definida.

## 🚀 Como usar

### Pré-requisitos
- Python 3.11+ e venv já configurados em `backend/venv/`
- Pacote `mem0ai` instalado: `source backend/venv/bin/activate && pip install mem0ai`

### Executar inicialização
```bash
# From project root
cd backend
npm run init-memory
```

Ou diretamente:
```bash
npx tsx backend/src/scripts/init-memory.ts
```

### Usar Mem0 Cloud (opcional)
Para usar a nuvem Mem0 em vez do armazenamento local JSON:

1. Crie uma conta em https://mem0.ai
2. Obtenha sua API key
3. Configure a variável de ambiente:
   ```bash
   export MEM0_API_KEY="sua_api_key_aqui"
   ```
4. Execute o script novamente

Os fatos serão enviados ao projeto `aimarco-project` no Mem0.

### Armazenamento local
Se `MEM0_API_KEY` não estiver definida, os fatos são armazenados em:
```
/backend/src/scripts/.mem0_store.json
```

Este arquivo é um JSON com estrutura:
```json
{
  "user_id": "aimarco-project",
  "facts": [
    {
      "id": "fact_...",
      "content": "string",
      "metadata": { "category": "...", "source": "...", "importance": "..." },
      "created_at": "ISO 8601"
    }
  ]
}
```

## 📊 Estatísticas da última execução
- Fatos extraídos: 57
- Categorias: stack, business_rule, database_constraint, api, architecture
- Armazenamento: local JSON (fallback) ou Mem0 Cloud

## 🔄 Atualizar memória
Sempre que houver mudanças significativas em:
- Novas constraints de banco
- Novas regras de negócio
- Mudanças na stack
- Novos endpoints da API

Rode novamente o script para atualizar a memória.

## 🧹 Manutenção
O arquivo `.mem0_store.json` acumula fatos. Para resetar (ex: recriar do zero):
```bash
rm /app/backend/src/scripts/.mem0_store.json
npm run init-memory
```

Nota: fatos são aditivos. A remoção de fatos obsoletos deve ser feita manualmente ou via Mem0 Cloud API.
