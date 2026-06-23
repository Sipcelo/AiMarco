# Compliance Tests — LGPD / ANPD (black-box)

Suite de conformidade **independente** do backend. Objetivo: prova **real** de conformidade,
sem risco de "codar para dar verde".

## Por que é independente

- **Não importa `backend/src`.** Só usa `node:test` e `fetch` (nativos do Node ≥18).
- **Zero dependências** (`node_modules` não é necessário).
- Valida **comportamento HTTP observável** (status, headers, ausência de PII no corpo),
  não a estrutura interna do código. Se o código mudar mas o endpoint continuar vazando
  PII, o teste fica vermelho.

## Como rodar

```bash
cd compliance-tests

# Produção (só testes read-only; seguro)
COMPLIANCE_BASE_URL=https://auralynne.up.railway.app node --test

# Staging, incluindo testes que criam conta (politica de senha)
COMPLIANCE_BASE_URL=https://staging.exemplo node --test  # com COMPLIANCE_ALLOW_SIGNUP=1
```

No Windows PowerShell:

```powershell
$env:COMPLIANCE_BASE_URL="https://aimarco.up.railway.app"; node --test
```

## Variáveis

| Env | Default | Uso |
|-----|---------|-----|
| `COMPLIANCE_BASE_URL` | `https://auralynne.up.railway.app` | URL base da API |
| `COMPLIANCE_PROF_SLUG` | `regina-s-hair` | slug de um profissional real (perfil público) |
| `COMPLIANCE_ALLOW_SIGNUP` | _(off)_ | `1` habilita testes que fazem `POST /signup` — **só em staging** |

## O que cada teste prova

| Teste | Base legal | Esperado |
|-------|-----------|----------|
| R-01 headers | LGPD 46; Guia 3.2.3 | **verde** (após R-01) |
| R-MIN perfil público sem PII | LGPD 6º III; Guia 3.2.2 | **verde** |
| R-05 erro 404 sem internals | LGPD 46/49 | verde |
| R-06 CORS não confia em origem arbitrária | LGPD 46 | **vermelho hoje** (gap aberto) |
| R-02a senha curta rejeitada | LGPD 46; Guia 3.2.1 | verde |
| R-02b senha sem complexidade | Guia 3.2.1 §36 | skip até R-02 + staging |
| R-03 direitos do titular | LGPD 18 | todo (sem endpoint) |

> Vermelho = não conformidade real. Não mascarar; corrigir no backend e rodar de novo.
