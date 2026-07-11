---
id: ADR-0004
title: Protocolo AG-UI — adoção como padrão de destino, adiamento do MVP
status: accepted
date: 2026-07-11
deciders: [jgdeamorim]
consulted: [claude]
related: [ADR-0001, ADR-0003]
supersedes: []
---

# ADR-0004 — AG-UI como Padrão de Interação (Destino, Não MVP)

## Contexto

O adsentice foi originalmente conceituado como "Chat" (`adsentice-chat-spec.md v0.1`): input de URL → output de cards textuais. Durante o probe do Jasper.ai, descobrimos que Jasper mantém um fork do protocolo **AG-UI** (Agent-User Interaction Protocol, MIT license, 24 eventos em 6 categorias). O AG-UI define 13+ padrões de interação agente↔frontend — chat é apenas 1 deles.

Estudamos a spec completa (54 páginas de docs), o catálogo de eventos, o sistema de interrupts (HITL), shared state (snapshot + JSON Patch RFC 6902), e o draft de generative UI.

## Decisão

### AG-UI como padrão de DESTINO (v1.0), NÃO de MVP

**Adotamos AG-UI como padrão de interoperabilidade de longo prazo.** A spec `adsentice-chat-spec.md` foi reescrita como v1.0.0 mapeando todos os 24 eventos AG-UI para eventos adsentice.

**ADIAMOS a implementação de AG-UI do MVP.** O endpoint de produto é JSON simples (`POST /api/diagnostic` → `{ score, cards, tips }`). Sem SSE streaming, sem eventos, sem protocolo.

### Justificativa do adiamento

| Fator | AG-UI agora | AG-UI depois |
|-------|------------|-------------|
| Complexidade | 24 eventos, SSE, state sync, interrupts | Já implementado quando necessário |
| Clientes | Nenhum (Materio não suporta) | Claude Desktop, Cursor, ChatGPT |
| Valor MVP | Zero — founder não vê diferença | Alto — interoperabilidade real |
| Custo de implementação | 2-3 semanas | Reaproveitável quando houver demanda |
| Risco | Overengineering no MVP | Feature madura quando precisar |

### O que NÃO mudou

- A spec v1.0.0 está pronta e documentada (`docs/adsentice-chat-spec.md`)
- O mapeamento de eventos está completo (Lifecycle, Text, Reasoning, Tool, State, Activity)
- O Brand IQ como shared state está modelado
- Os interrupts para credit gate estão definidos
- O `POST /api/ag-ui/run` existe na spec como destino

### O que MUDOU

- O endpoint ativo é `POST /api/diagnostic` (JSON simples)
- Removido `apps/web/src/app/api/ag-ui/run/route.ts` (SSE)
- Removido `apps/web/src/lib/pipeline.ts` (orchestrator AG-UI)
- Mantidos `apps/web/src/lib/types.ts` (tipos reutilizáveis)

## Alternativas Consideradas

### Alternativa 1: Implementar AG-UI completo no MVP
**Rejeitada.** 2-3 semanas de trabalho para um protocolo que zero clientes usam. O Materio não é cliente AG-UI.

### Alternativa 2: Ignorar AG-UI completamente
**Rejeitada.** O protocolo é MIT, tem adoção crescente (Jasper, CopilotKit, LangChain, CrewAI, Google ADK, Microsoft Agent Framework), e resolve um problema real de interoperabilidade que enfrentaremos.

### Alternativa 3: Protocolo proprietário
**Não considerada.** Seria repetir o erro que o AG-UI resolve — cada empresa inventando seu próprio formato de evento.

## Consequências

- **Positivas:** MVP mais simples (1 endpoint, JSON). Spec de destino documentada. Nada jogado fora — tipos TypeScript e design patterns são reutilizáveis.
- **Negativas:** Quando implementarmos AG-UI (v1.0), o endpoint atual (`/api/diagnostic`) será substituído por `/api/ag-ui/run`. Isso é uma breaking change controlada.
- **Risco:** Se um cliente potencial exigir SSE streaming antes do previsto, teremos que antecipar a implementação. Mitigação: a spec está pronta, é "só codar".

## Referências

- https://docs.ag-ui.com — AG-UI specification (54 páginas)
- https://github.com/ag-ui-protocol/ag-ui — AG-UI repo (MIT license)
- https://github.com/gojasper/ag-ui — Jasper fork do AG-UI
- `docs/adsentice-chat-spec.md` v1.0.0 — spec completa AG-UI mapeada
- Commit `29c2611` — AG-UI como protocolo padrão
- Commit `d8e331c` — simplificação JSON (adiamento AG-UI)
