# HANDOFF v100 FINAL · 2026-07-19 · Cross-State Pre-flight Coverage + Backup Automático

**2 dias de sessão (v081→v100) · 50+ commits · 341 pre-flights · 4 estados FULL**

## Marco: Pre-flight como ferramenta de mercado

```
341 pre-flights em 4 estados · 29/29 categorias cada · $4.67 total

SP: 114 pf · 29 cats  · $1.57  (Capital, RMSP, interior)
MG: 102 pf · 34 muns · $1.41  (RMBH completa, 3 ondas)
ES:  48 pf ·  6 muns · $0.63  (Vitória, VV, Serra, Cariacica, Guarapari, Fundão)
RJ:  27 pf ·  9 muns · $0.37  (Capital, Niterói, Baixada)

Cada pre-flight: total_count + avg_rating + claimed_pct + website_pct + city
```

## Infra

- **Backup automático**: cron R2 diário 02:57 (7d) + cron local /media/jeffer/BKP 4h (30d)
- **Dedup pre-flight**: match por Set(categories) — ondas diferentes não se pisam (v099)
- **Pre-flight qualidade**: avg_rating/claimed_pct/website_pct persistidos no search_metadata (v093)

## Lições da sessão

1. **DELETE sem range check**: `WHERE lat BETWEEN -23 AND -17 AND lng BETWEEN -52 AND -40` deletou ES+MG+SP+RJ juntos. 152 pre-flights restaurados do backup FULL de 17/07.
2. **Backup INCREMENTAL não salva dados não mudados**: o backup de 19:06 tinha `supabase: []`. O FULL de 23:51 de 17/07 salvou.
3. **Dedup UPDATE cego**: v093 sobrescrevia ondas diferentes (mesma cidade, categorias diferentes). Corrigido em v099.
4. **API sessions .slice(0,20)**: cortava municípios do popup (BH era o 33º). Corrigido em v097.
5. **discovery_listings é SÉRIE TEMPORAL**: 1 row por place_id POR search. Regra: toda leitura agregada DEVE dedup.

## Pendente (próxima sessão)

1. Gate S11 elegibilidade via L2 (task #17 — insumo pronto: onpage_score + cms + domainType)
2. StrategyResolver backport S10 (score%2 → estratégias)
3. SurfaceSpecialist factory (20 surfaces)
4. Pre-warm batch Workers
5. ADR-0038 Fase 3: renderToStaticMarkup JSX renderer
6. Fix A copy S10 (subtitleTemplate público)
