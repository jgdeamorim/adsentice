---
id: ADR-0007
title: Simplificação do MVP — JSON simples, sem AG-UI, sem SSE streaming
status: accepted
date: 2026-07-11
deciders: [jgdeamorim]
consulted: [claude]
related: [ADR-0004, ADR-0005, ADR-0006]
supersedes: []
---

# ADR-0007 — Simplificação do MVP (JSON × Streaming × Protocolo)

## Contexto

Em 2026-07-11, o adsentice passou de "6 MCP servers quebrados, zero código de produto" para "7 MCP servers funcionais, endpoint de diagnóstico ativo, estratégia de funil completa, 3 skills, 7 ADRs". 39 commits no dia.

No caminho, acumulamos complexidade desnecessária:
1. Implementação de AG-UI SSE streaming (`/api/ag-ui/run` com 24 eventos)
2. Pipeline orchestrator com event emitters, state sync, generators
3. Tipos TypeScript duplicados entre Firecrawl, DataForSEO, e pipeline

A pergunta do founder parou tudo: **"O que é AG-UI events?"**

Se o founder — que é o operador do produto — não entende o protocolo, o dono da clínica também não vai entender.

## Decisão

### Simplificação radical: 1 endpoint, JSON, sem protocolo

**Removido:**
- `POST /api/ag-ui/run` (SSE streaming, 116 linhas)
- `apps/web/src/lib/pipeline.ts` (AG-UI orchestrator, 580 linhas)
- Event emitters, state sync, generators, ActivitySnapshot types

**Mantido:**
- `POST /api/diagnostic` (JSON simples, 279 linhas)
- `apps/web/src/lib/types.ts` (tipos compartilhados)
- `apps/web/src/lib/dataforseo.ts` (client REST)
- `apps/web/src/lib/firecrawl.ts` (client REST)

### O que o endpoint faz AGORA

```typescript
POST /api/diagnostic
  body: { url: "minhaclinicaestetica.com.br" }
  response: {
    business: { name, url, domain },
    score: { overall: 62, breakdown: { site: 70, seo: 54, ... } },
    cards: [{ id, title, icon, score, highlights }],
    tips: ["Responda reviews negativas", "Otimize SEO local", ...],
    deep_dives: [{ id, title, credit_cost }],
    diagnostics: { took_ms: 3421, pipelines: [...] }
  }
```

### Por que JSON simples é suficiente

1. **Materio renderiza JSON direto.** `CardStatistics` components aceitam `{ title, score, stats }`.
2. **Founder entende.** "A resposta é um JSON com cards e score" — sem eventos, sem streams, sem protocolos.
3. **Cliente não vê o protocolo.** O dono da clínica vê cards na tela. Zero diferença se veio por SSE ou JSON.
4. **Debug é trivial.** `curl -X POST | jq` vs decodificar stream SSE.

### O que NÃO foi jogado fora

- **Tipos TypeScript** (`types.ts`, 191 linhas) — reutilizáveis em qualquer formato de resposta
- **Spec AG-UI** (`adsentice-chat-spec.md` v1.0.0) — destino documentado
- **Clients REST** (`dataforseo.ts`, `firecrawl.ts`) — independem do formato de output
- **ADR-0004** — AG-UI como padrão de destino (v1.0)

## Padrão de Design

A simplificação segue o princípio: **"A interface mais simples que resolve o problema."**

```
Complexidade          Necessidade real
─────────────        ─────────────────
SSE streaming         Cards na tela (JSON)
24 eventos AG-UI      1 endpoint POST
State sync             Banco de dados (Supabase)
Generators             async/await + Promise.all
Interrupts             Modal de confirmação (frontend)
```

Cada linha de complexidade removida é uma linha que não precisa ser mantida, testada, debugada, ou explicada.

## Alternativas Consideradas

### Alternativa 1: Manter AG-UI + simplificar depois
**Rejeitada.** Complexidade acumulada é dívida técnica. Remover depois é mais difícil que não adicionar agora.

### Alternativa 2: GraphQL
**Não considerada.** Overengineering para um produto com 1 endpoint.

### Alternativa 3: REST puro (sem JSON, HTML server-rendered)
**Rejeitada.** O Materio é React SPA. Precisa de API JSON.

## Consequências

- **Positivas:** 696 linhas removidas (pipeline.ts + ag-ui/run). Endpoint compreensível. Debug trivial. Founder entende o que o sistema faz.
- **Negativas:** Quando precisarmos de SSE streaming (chat livre, deep-dive em tempo real), teremos que reimplementar. Mas a spec está pronta (ADR-0004).
- **Risco:** Migração de JSON→SSE no futuro pode quebrar clientes existentes. Mitigação: versionar a API (`/api/v1/diagnostic` vs `/api/v2/ag-ui/run`).

## Métrica de Sucesso

O MVP é validado quando **1 dono de clínica estética vê 1 relatório e diz "isso me ajuda"**. Se isso acontecer, a simplificação foi correta — independente do formato da resposta.

## Referências

- Commit `d8e331c` — substituição AG-UI SSE por JSON simples
- Commit `29c2611` — AG-UI como padrão (antes da simplificação)
- `apps/web/src/app/api/diagnostic/route.ts` — endpoint ativo (279 linhas)
- ADR-0004 — AG-UI protocol decision
- ADR-0005 — Lead funnel & CRM strategy
