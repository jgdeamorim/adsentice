# ADSENTICE · Backup Completo · 2026-07-20

## Supabase (REST API dump)

| Tabela | Rows | Size |
|--------|------|------|
| `discovery_listings` | 8,626 | 20.94 MB |
| `discovery_searches` | 355 | 0.28 MB |
| `ibge_market_size` | 782 | 0.16 MB |
| `district_registry` | 422 | 0.07 MB |
| `ibge_panorama` | 419 | 0.17 MB |
| `market_holds` | 18 | 0.01 MB |
| `ibge_income` | 27 | 0.00 MB |
| `s11_events` | 15 | 0.00 MB |
| `s10_artifacts` | 4 | 0.00 MB |
| **Total** | **10,668** | **21.63 MB** |

## Redis (:6396)

- `redis-dump.txt` — todas as keys `adsentice:*` com valores
- OODA state, BOA score, CNPJ queue, costs, sessions

## Migrations

- `packages/db/supabase/migrations/` — 20 migrations (001-020)
- Schema completo está no git (commit ff9532a)

## Notas

- `keyword_history` e `cnpj_queue` retornaram vazias/acesso negado pela REST API
- `discovery_listings` cresceu de 5,745 para 8,626 desde a última contagem (ADR-0050)
