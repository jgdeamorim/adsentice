# ADR-0028 · CNPJ Queue — Cron Enrichment Pipeline

**Status:** proposed
**Date:** 2026-07-17
**Deciders:** founder, claude
**Extends:** ADR-0024 (L0-L4 Pipeline), ADR-0027 (Market Estimator)

---

## Contexto

O módulo `cnpj-crawler.ts` extrai CNPJs do footer de websites via cheerio (HTML estático)
e Playwright (SPA). Combinado com `cnpj-enricher.ts` (ReceitaWS lookup), o pipeline L5 CNPJ
enriquece leads com: CNAE validado, regime tributário, sócios, capital social.

**Descoberta empírica (60 sites de dentista):**

| Métrica | Resultado |
|---------|:---:|
| CNPJs extraídos (cheerio) | 4/60 (6.7%) |
| Emails extraídos | 21/60 (35%) |
| Telefones extraídos | 29/60 (48%) |
| Sites SPA (precisam Playwright) | ~30% estimado |

**Limites ReceitaWS (plano gratuito):**

- ~3 requisições/minuto
- ~100 requisições/dia
- Processar 60 leads: ~20 minutos
- Processar 1000 leads: ~5.5 horas

---

## Decisão

**Implementar CNPJ Queue — sistema de fila assíncrona com cron worker** que processa
leads em background respeitando rate limits.

### Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                    CNPJ QUEUE ARCHITECTURE                    │
│                                                              │
│  DISCOVERY (POST /api/discovery-search)                     │
│    │                                                         │
│    ▼                                                         │
│  Listings com website → INSERT INTO cnpj_queue               │
│    │                                                         │
│    ▼                                                         │
│  CRON (a cada 2 minutos)                                     │
│    │                                                         │
│    ▼                                                         │
│  GET /api/cnpj/process (3 leads por ciclo)                  │
│    │                                                         │
│    ├─ cheerio crawl → CNPJ encontrado?                      │
│    │   ├─ SIM → ReceitaWS lookup → cnpj_data no Supabase    │
│    │   └─ NÃO → tenta Playwright (se disponível)            │
│    │                                                         │
│    └─ Após 3 tentativas → status='failed'                   │
│                                                              │
│  KPIs visíveis em:                                           │
│    ├─ admin/leads → badge CNPJ + filtro                      │
│    └─ admin/pipeline → barra L5 CNPJ                         │
└──────────────────────────────────────────────────────────────┘
```

### Schema (Supabase)

```sql
-- Migration: cnpj_queue
CREATE TABLE cnpj_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES discovery_listings(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','crawling','extracted','enriched','failed','no_cnpj')),
  attempts INTEGER DEFAULT 0,
  cnpj_raw TEXT,
  cnpj_data JSONB,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_cnpj_queue_status ON cnpj_queue(status, created_at);
CREATE INDEX idx_cnpj_queue_lead ON cnpj_queue(lead_id);
```

### API Routes

| Método | Rota | Função |
|--------|------|--------|
| `POST` | `/api/cnpj/enqueue` | Adiciona lead à fila após Discovery |
| `GET` | `/api/cnpj/stats` | KPIs: total, enriched, pending, failed |
| `POST` | `/api/cnpj/process` | Processa próximo lote (3 leads) |

### Cron Worker

```
*/2 * * * * curl -X POST http://localhost:3000/api/cnpj/process
```

Processa 3 leads a cada 2 minutos (90/hora, 2.160/dia).
Bem dentro do limite gratuito da ReceitaWS.

---

## KPIs

### admin/leads — Badge CNPJ

```
┌────────────────────────────────────────────────────────┐
│ 📊 CNPJ Enriquecimento                                 │
│                                                        │
│  ████░░░░░░░░░░░░  4/60 enriquecidos (6.7%)           │
│  ⏳ 56 pendentes  ·  ✅ 4 validados  ·  ❌ 0 falhas   │
│                                                        │
│  Fila processando: 3/min (plano gratuito)             │
│  ~19 min para zerar a fila atual                      │
└────────────────────────────────────────────────────────┘
```

### admin/pipeline — Barra L5

```
Pipeline ADR-0024 + ADR-0028:

  L0 Search:  100%  ████████████████████████
  L1 Profile:  36%  █████████
  L4 IBGE:     97%  ██████████████████████
  L5 CNPJ:      7%  ██              ← NOVO
```

---

## Implementação

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | Supabase SQL | Criar `cnpj_queue` + índices |
| 2 | `lib/cnpj-queue.ts` | NOVO: `enqueueLead()`, `processQueue()`, `getCnpjStats()` |
| 3 | `api/cnpj/enqueue/route.ts` | NOVO: endpoint de enfileiramento |
| 4 | `api/cnpj/stats/route.ts` | NOVO: endpoint de KPIs |
| 5 | `api/cnpj/process/route.ts` | NOVO: processa lote de 3 (chamado pelo cron) |
| 6 | `discovery-search/route.ts` | POST → enqueue leads com website automaticamente |
| 7 | `pipeline/page.tsx` | Adicionar barra L5 CNPJ |
| 8 | `leads/page.tsx` | Badge CNPJ + filtro |

---

## Custos

| Operação | Custo | Frequência |
|----------|:---:|:---:|
| cheerio crawl | $0 | 3/min |
| Playwright fallback | $0 | ~1/min (raramente) |
| ReceitaWS lookup | $0 (free tier) | 3/min |
| Supabase writes | $0 (free tier) | 3 inserts/min |

**Custo total: $0/mês** (infra local + APIs gratuitas)

---

## Referências

- `apps/web/src/lib/cnpj-crawler.ts` — cheerio + Playwright extractor
- `apps/web/src/lib/cnpj-enricher.ts` — ReceitaWS lookup + scoring
- `tools/cnpj-crawler.js` — standalone batch crawler
- `tools/cnpj-crawler-spa.js` — standalone SPA crawler
- ADR-0024 — L0-L4 Pipeline
- ADR-0027 — Market Estimator
