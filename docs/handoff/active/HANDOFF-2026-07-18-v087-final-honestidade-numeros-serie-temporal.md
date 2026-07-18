# HANDOFF v087 FINAL · 2026-07-18 · Honestidade nos Números — Série Temporal + Competitors 2×

**commit af2badd · fecha a sessão épica v081→v087 (7 selos, 1 dia)**

## Entrega deste selo

Console Error (React keys duplicadas) virou auditoria de honestidade:

1. **FATO ARQUITETURAL cravado**: `discovery_listings` é SÉRIE TEMPORAL —
   1 row por place_id POR SEARCH (design do persistence, não bug).
   Medido: 5.572 rows · 4.270 únicos · 1.302 repetidas (23%).
   REGRA (memory 624d599c): toda leitura agregada da tabela crua DEVE
   dedupe por place_id (racional do DISTINCT ON das views v021).
2. **Competitors 2× inflado corrigido**: compose contava rows → lead via
   "101 concorrentes" (real: 51). Copy calculava % sobre base errada.
   Fix: RPC `count_unique_places` (migration 016 APLICADA) + wire nos
   2 composes com fallback legado. E2E: meta.competitors=51 ✅
3. Dropdown cockpit: dedup no GET (fix do Console Error) — 16 únicos ✅
4. Fallback digno de copy exercitado ao vivo (DeepSeek timeout →
   template honesto, zero jargão) — degradação projetada funcionando.

## Sessão épica consolidada (2026-07-18 · v081→v087)

| Selo | Marco |
|------|-------|
| v081 | S10 JSX route LIVE (blue exposto, zero hardcode) |
| v082 | ADR-0038 Generate-then-Serve (14.7s→0.54s, QG gate, TTL 30d) |
| v083 | Plataforma CF+Supabase ratificada + base-matriz viva |
| v084 | S11 Landing A/B por ESTRATÉGIA (2/22 surfaces, loop f0) |
| v085 | Dashboard specialists + conversão A/B + banner 14× fix |
| v086 | Intend Composer v2 cockpit real (adaptação por segmento provada) |
| v087 | Série temporal + competitors honesto (este) |

**Infra**: 3 migrations aplicadas (014/015/016 via migrate_pg.mjs — DDL real
desbloqueado) · GitHub sync (era 334 commits atrás) · backup R2+local 23MB.

## Estado vivo

- Rotas públicas: /s10-raio-x · /s11-landing (A/B cookie) · /r (conversão)
- Conversão medida: A social_proof 25% vs B urgency 0% (6 views — sinal)
- BOA 0.9277 EXCELLENT · corpus 19.749 · KG 166/174 · memory 67+

## Próxima sessão (OODA decide)

1. StrategyResolver backport S10 (substituir score%2 legado)
2. SurfaceSpecialist factory (S11 provou template — 20 surfaces restantes)
3. Batch pre-warm (Workers CF quando ativar — ADR-0038 F2)
4. Dashboard conversão: aguardar volume p/ significância (100+ views/var)
5. Fase 3 ADR-0038: renderToStaticMarkup(S10RaioXPage) como renderer
