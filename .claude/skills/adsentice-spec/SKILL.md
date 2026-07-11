---
name: adsentice-spec
description: Skill de AUTORIA de specs e ADRs do adsentice — escrever, atualizar e manter a documentação canônica do projeto.
type: project
---

# adsentice-spec

Skill de AUTORIA/ATUALIZAÇÃO de especificações e ADRs (Architecture Decision Records) do projeto adsentice. Inspirado no `spec-master` do EVO-API, adaptado para o contexto standalone do adsentice.

## Quando usar

- Escrever uma nova spec (features, arquitetura, pipeline, integração)
- Criar ou atualizar um ADR (decisão arquitetural)
- Documentar uma capability ou endpoint
- Mapear um fluxo de produto (discovery, análise, créditos, onboarding)
- Atualizar `docs/adsentice-objetivos-solucoes-criterios.md`
- Adicionar um novo nicho em `docs/spec/niche-solutions.json`

## Padrão de Spec

```markdown
---
id: SPEC-ADSENTICE-XXXX
title: "Título da spec"
status: draft | proposed | accepted | living
type: spec
date: YYYY-MM-DD
owner: "Jeferson Galote de Amorim"
deciders: [jgdeamorim]
related: [ADR-XXXX, SPEC-YYYY]
tags: [adsentice, ...]
---

# SPEC-ADSENTICE-XXXX — Título

## 1. Contexto
## 2. Decisão / Arquitetura
## 3. Implementação
## 4. Consequências
## 5. Referências
```

## Padrão de ADR

```markdown
---
id: ADR-0001
title: Título da decisão
status: proposed | accepted | deprecated | superseded
date: YYYY-MM-DD
deciders: [jgdeamorim]
consulted: [claude]
related: []
---

# ADR-0001 — Título

## Contexto
## Decisão
## Alternativas consideradas
## Consequências
```

## Doutrina (invariantes)

- **medido=verdade** — toda afirmação cita fonte (código, teste, doc). Sem fonte = não verificado.
- **Spec antes de código** — funcionalidade nova começa com spec escrita e aprovada.
- **ADR para decisões** — qualquer decisão arquitetural que afete >1 componente vira ADR.
- **Numeração sequencial** — ADR-0001, ADR-0002... (independente do EVO-API, recomeça do 0001).
- **Português** — toda documentação em pt-BR (alinhado ao público-alvo SMB brasileiro).
- **Cross-ref obrigatório** — specs e ADRs referenciam uns aos outros por ID.

## Estrutura de documentos

```
docs/
├── adsentice-objetivos-solucoes-criterios.md  ← fonte canônica
├── adsentice-chat-spec.md                      ← spec do chat
├── adr/                                         ← ADRs (ADR-0001, ADR-0002...)
├── spec/                                        ← specs detalhadas
│   └── niche-solutions.json                    ← nichos e cobertura
├── jasper-docs/                                 ← referência externa (Jasper API)
└── dataforseo-oficial-mcp-vs-evo-api-provider-core.md
```

## Numeração de ADRs (recém-iniciada)

| # | Título sugerido |
|---|---|
| ADR-0001 | Arquitetura standalone adsentice (Next.js + Railway + Supabase + DataForSEO MCP) |
| ADR-0002 | Pipeline de Discovery — 6 pipelines paralelos |
| ADR-0003 | Modelo de créditos e spend-cap por tenant |
| ADR-0004 | Brand IQ automático vs Jasper IQ manual |
| ADR-0005 | Vault — cofre durável (R2 + Postgres) e separação Sistema de Registro × Índice |

## Referências

- EVO-API `spec-master` SKILL.md — referência de padrão de spec
- EVO-API `base-matriz` SKILL.md — referência de mapa navegável
- `docs/jasper-api-docs-completo.md` — benchmark Jasper API
