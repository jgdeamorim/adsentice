# HANDOFF v008 (2026-07-15) · Fase 1 + Auditoria EVO-API + Dataset BR

> Auto-gerado · sessão `seed-20260711160437` · ~15:00 UTC
> BOA: 0.933 (EXCELLENT) · 224 commits · 21 ADRs · 7 skills

## 🛑 START-HERE (próxima sessão)
1. `redis :6396` · ler `adsentice:ooda:stage:*` + `adsentice:boa:*`
2. **Docs essenciais:** `docs/spec/base-matriz-adsentice.md` v1.7.0 + este handoff
3. **Auditoria completa:** `docs/spec/auditoria-evo-api-capabilities-adsentice.md`
4. **Dataset BR:** `EVO-API/self-essentials/dataforseo/dataset/.../BR_pt.json` (1000 keywords)
5. **Último commit:** `4a75821 fix: costs page — 8 caps em uso (Fase 1 wireada)`

## ✅ O QUE FOI FEITO (14 commits nesta sessão)

### S10 Copywriter (1 commit)
- `9b37ad8` Gap detector `medido=verdade` + copywriting framework (Corey+Kim+CRO)
- DeepSeek max_tokens 250→1200, temperature 0.6→0.8, KV Cache ON

### Provider-Core (3 commits)
- `30831ef` **provider-core v1.0** — DataForSEO direto, 1 hop, 6 tools L0-L3
- `da3ee18` Discovery migration EVO-API→provider-core (adapter inline)
- `0e4b7c9` **Fase 1** — 3 novas tools: lighthouse + serp_organic + reviews_google

### DeepSeek Calibração (3 commits)
- `5325853` Preços REAIS (input $0.14/1M miss, $0.0028/1M hit, output $0.28/1M)
- KV Cache tracking + Balance API ($2.31 USD)
- `adsentice_deepseek_status.py` → Redis

### Admin Pages (3 commits)
- `952c78a` Settings + Costs refletem provider-core v1.0
- `0d493e9` Cost center 100% dinâmico (YAML + Supabase REST + Redis)
- `4a75821` Costs page com 8 caps em uso (Fase 1 wireada)

### Auditoria EVO-API (2 commits)
- `af4b0df` **73 capabilities mapeadas** com custo + prioridade + endpoint
- `93abc46` 10 padrões de translator + template de implementação

### Selos (2 commits)
- `6b26c9d` HANDOFF v007 + BASE-MATRIZ v1.6.0
- `2123514` Plans canônico + CardStatVertical fix

## 🧠 O ENTENDIMENTO (decisões, contexto)

**EVO-API NÃO é só proxy — é inteligência de telemetria aprofundada:**
- WebFetch de TODA documentação DataForSEO (111 endpoints)
- Sandbox $0 probe em CADA endpoint (shapes REAIS, não documentação)
- Shape catalog com árvore de resposta completa por cluster
- 50+ translators com flatten+rename+normalize
- Cost registry com confidence level (provider/measured/provider+measured)
- 3-stage gate: Shape Contract → Sandbox → Live
- Canonical I/O padronizado cross-provider com tiers

**Dataset BR de ouro:** 1000 keywords brasileiras (755KB JSONL) com search_volume,
CPC, intent, history 12 meses, keyword_difficulty. Playground pra keyword.research $0.

**Provider-core: 7 tools ativas (17.5% de 40 relevantes):**
L0: business_listings_search
L1: business_profile_gmb
L2: instant_pages, domain_technologies, lighthouse 🆕
L3: backlinks_competitors
L4: serp_organic 🆕, google_reviews 🆕

**Fase 2 planejada:** domain.competitors, ranked_keywords, keyword.research (L3 complete)

## 🎯 ESTADO OODA
- **observe:** Auditoria EVO-API completa. Dataset BR 1000 keywords. Fase 1 implementada.
- **orient:** 224 commits, 7 tools provider-core, pipeline L0→L4 ~$0.058/lead
- **decide:** Fase 2 (domain.competitors + ranked_keywords + keyword.research)
- **act:** SELADO v009 · Fase 1 completa · 7/40 caps (17.5%)

## ▶️ PRÓXIMO (a fila)
1. **Fase 2 provider-core** — domain.competitors + domain.ranked_keywords + keyword.research
2. **L2 enrichment Dra. Karina** — rodar via :3000 Discovery com lighthouse live
3. **Integrar reviews reais no S10** — substituir "Reputação 4.9★" por depoimentos reais
4. **Playground keyword.research** — usar dataset BR_pt.json pra testar sem custo
5. **M2 Frontend real** — React 19 + Vite + shadcn/ui
6. **Hetzner CAX11 provision**

## 📊 SCORE
- **BOA:** 0.933 → **EXCELLENT**
- **Corpus A (self):** 18,190 pontos
- **Corpus C (conversa):** 75,853 pontos
- **Claude Memory:** 29 decisões
- **ADRs:** 21 (14 accepted, 2 superseded)
- **Commits:** 224
- **Skills:** 7 Claude skills
- **Provider-core:** 7 tools L0→L4 · 8 arquivos TypeScript
- **DeepSeek balance:** $2.31 USD

---
*HANDOFF v008 · 2026-07-15 · adsentice*
