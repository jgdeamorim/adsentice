# HANDOFF v012 (2026-07-16) · Pipeline L2 + Coding SOP + Base-Matriz v2.0.0

> Auto-gerado · sessão `seed-20260711160437` · ~22:30 UTC
> BOA: 0.948 (EXCELLENT) · 312 commits · 23 ADRs · 7 skills

## 🛑 START-HERE (próxima sessão)

1. `redis :6396` · ler `adsentice:ooda:stage:*` + `adsentice:boa:*`
2. **Docs essenciais:** este handoff + `docs/spec/base-matriz-adsentice.md` v2.0.0
3. **⚠️ ANTES de codar:** `.claude/NEXTJS_CODING_SOP.md` (ciclo DAG→Codar→Check→Commit)
4. **Check script:** `bash .claude/hooks/adsentice-nextjs-check.sh`
5. **KG Next.js:** Qdrant `adsentice-self` tag=nextjs-15 (10 regras)

## ✅ O QUE FOI FEITO

### Pipeline L1+L2 (upgrade)
- **L1**: TOP 5 → ALL 50 leads/busca ($0.0054/lead, $0.27/busca)
- **L2**: TOP 3 → ALL com website ($0.010625/lead com social crawl)
- **Social crawl**: parseWebsiteContacts() via DataForSEO content_parsing
- **Contact merge**: phone/emails do website → preenche gaps GMB
- Migration 007 aplicada: `l2_emails` (TEXT[]), `l2_social_links` (JSONB)
- Custo por Discovery: ~$0.44 (L0 $0.015 + L1 $0.27 + L2 ~$0.16)

### Backfill City
- 278/278 listings sem city → 100% com city+district via Nominatim
- 15 cidades detectadas (SP 158, RJ 184, RMSP 48, RMRJ 14)

### Coding SOP (ferramentas)
- `.claude/NEXTJS_SWC_RULES.md` — 7 padrões que funcionam, 4 proibidos
- `.claude/NEXTJS_CODING_SOP.md` — DAG→Codar→Check→Commit
- `.claude/hooks/adsentice-nextjs-check.sh` — 4-stage pre-commit validation
- Qdrant tag=nextjs-15: 10 regras embedadas (5 patterns, 4 rules, 1 reference)

### UI Adjustments
- Discovery: enrichment badge L0/L1/L2 nos listings + redes sociais/emails no detail
- Discovery: Score Filter Bar removida (~120 linhas), Auto-Pilot status bar
- Market: overview mode + mini-mapa CartoDB + L1/L2 breakdown

### Backup R2
- Full bulk + incremental checksum + NOOP mode + SessionStart hook

## 🧠 O ENTENDIMENTO

**O SWC é previsível.** 7 erros = 7 padrões mapeados. O ciclo DAG→Codar→Check→Commit elimina surpresas. A cada build quebrado, uma nova regra entra no KG.

**O pipeline L2 é o diferencial.** Extrair redes sociais, WhatsApp e emails do website completa o perfil GMB e gera insights que nenhum concorrente tem. 44 negócios já têm website — rodar 1 Discovery ativa L2 em todos.

**City backfill resolveu 65% de dados invisíveis.** Sem city, o /admin/market via só 49 dos 142 negócios. Agora vê todos.

## 📊 STATUS FINAL

| Métrica | Valor |
|---------|-------|
| KG total | 96,710 pts |
| Commits | 312 |
| ADRs | 23 |
| Listings (total/unique) | 404 / 142 |
| Cidades | 15 |
| City coverage | 100% |
| SP / RJ | 50 / 92 |
| Enrichment L1 | 5/142 (3%) |
| Enrichment L2 | 0/142 (0%) ← RODAR DISCOVERY! |

## ▶️ PRÓXIMO

1. **Rodar Discovery RJ 5km** — validar pipeline L2 completo (redes sociais, emails, SEO)
2. **Ver /admin/market pós-L2** — Content Maturity, TOP Gaps W1-W11, hasAnalytics
3. **Fase A Geo (ADR-0022)** — `@turf/turf` no market-intel
4. **M2 Frontend** — React 19 + Vite + shadcn/ui
5. **Hetzner CAX11** — provisionar

---
*HANDOFF v012 · 2026-07-16 · adsentice*
