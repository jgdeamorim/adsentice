---
name: adsentice-chat
description: Skill principal do adsentice Chat — construir, evoluir e operar o pipeline de discovery e o chat conversacional do adsentice.
type: project
---

# adsentice-chat

Skill de CONSTRUÇÃO e OPERAÇÃO do adsentice Chat — o chat que DESCOBRE o negócio do cliente automaticamente (pipelines de discovery) e guia o empresário com dados REAIS de mercado.

## Quando usar

- Construir ou modificar o fluxo do chat (`apps/web/src/app/chat/`, `apps/api/src/chat/`)
- Adicionar pipelines de discovery (Site, SEO, GMB, Competitors, Ads, Social)
- Modificar o modelo de créditos ou gates de spend-cap
- Alterar a experiência do usuário (UX do chat)
- Debuggar por que um pipeline não está retornando dados
- Integrar nova capability DataForSEO ao discovery
- Modificar a síntese de estratégia (DeepSeek) ou o chat livre (Qwen)

## Arquitetura do Chat

```
┌─────────────────────────────────────────────┐
│  Frontend (Next.js :3000)                    │
│  /chat → Chat UI (input URL, cards, tips)   │
│  /chat/[thread_id] → Conversa ativa         │
├─────────────────────────────────────────────┤
│  Backend (apps/api/ Railway)                │
│  POST /api/chat/discover  → 6 pipelines     │
│  POST /api/chat/analyze   → deep-dive       │
│  POST /api/chat/message   → chat livre      │
│  GET  /api/chat/thread/:id → histórico      │
├─────────────────────────────────────────────┤
│  Data Layer                                 │
│  DataForSEO MCP → dados REAIS               │
│  Vault (R2+Postgres) → cofre durável        │
│  DeepSeek → síntese (cost-capped)           │
│  Qwen 2.5 1.5B → chat livre ($0)           │
│  Redis :6396 → OODA adsentice               │
│  Qdrant :6352 → KG adsentice               │
└─────────────────────────────────────────────┘
```

## Fluxo de Desenvolvimento

1. **Spec primeiro** — toda mudança no chat começa com spec em `docs/adsentice-chat-spec.md`
2. **ADR para decisões** — mudanças de arquitetura viram ADR em `docs/adr/`
3. **Pipeline novo** — adicionar em `apps/api/src/chat/pipelines/`
4. **Testar com sandbox** — SEMPRE testar com `DataForSeoSandboxProber` ($0) antes de live

## Doutrina (invariantes)

- **Discovery primeiro, deep-dive depois** — nunca cobrar antes de mostrar valor
- **Sandbox default** — diagnóstico abre em $0. Live é gated.
- **Spend-cap por tenant** — créditos do cliente governam o gasto
- **Vault antes de índice** — R2 blob → Postgres série → só então indexa
- **LLM = árbitro, não extrator** — DeepSeek sintetiza estratégia SOBRE dados REAIS
- **medido=verdade** — toda afirmação no chat cita fonte (qual cap, qual dado)

## Referências

- `docs/adsentice-chat-spec.md` — especificação completa do chat
- `docs/adsentice-objetivos-solucoes-criterios.md` — objetivos e soluções
- `docs/jasper-solutions-analise.md` — benchmark Jasper Chat
- `docs/adr/` — ADRs do adsentice
- `packages/vault/` — cofre durável (R2 + Postgres)
