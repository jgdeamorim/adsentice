# HANDOFF v007 (2026-07-15) · provider-core + DeepSeek calibrado

> Auto-gerado · sessão `seed-20260711160437` · ~13:00 UTC
> BOA: 0.9325 (EXCELLENT) · 217 commits · 21 ADRs · 7 skills

## 🛑 START-HERE (próxima sessão)
1. `redis :6396` · ler `adsentice:ooda:stage:*` + `adsentice:boa:*`
2. **Docs essenciais:** `docs/spec/base-matriz-adsentice.md` v1.6.0 + este handoff
3. **Último commit:** `5325853 fix: DeepSeek pricing real + KV Cache tracking + Balance API`
4. **Provider-core:** `packages/provider-core/` · 9 arquivos · DataForSEO direto 1 hop
5. **DeepSeek status:** `python3 tools/adsentice_deepseek_status.py`

## ✅ O QUE FOI FEITO (5 commits)

### S10 Copywriter (1 commit)
- `9b37ad8 fix: S10 Copywriter — medido=verdade gaps + copywriting framework`
- GAP DETECTOR refatorado — cada gap cita sinal do Supabase
- Removidos 3 gaps inventados (schema, mobile, conteúdo sem L2)
- Copywriting framework: persona + fórmula + anti-patterns (Corey+Kim+CRO)
- DeepSeek max_tokens 250→1200 (é reasoning model)
- Temperature 0.6→0.8
- Parse robusto com regex fallback + reasoning_content extraction

### Provider-Core (1 commit)
- `30831ef feat: provider-core v1.0 — DataForSEO direto, sem EVO-API intermediario`
- `packages/provider-core/` · 9 arquivos · ~400 linhas TypeScript
- DataForSEOClient HTTP direto (Basic Auth, .ai suffix compacto)
- sandbox/live mode (`DATAFORSEO_MODE=sandbox` → $0 dev)
- Cost Registry YAML (13 capabilities, preços medidos)
- L0 business_listings_search ($0.015)
- L1 business_profile_gmb ($0.0054) — CUSTOM (não existe no oficial)
- L2 on_page_instant_pages ($0.000125)
- L2 domain_technologies ($0.01)
- L3 backlinks_competitors ($0.02)
- 1 hop HTTP vs 2 hops (Next.js→Rust→API)
- Zero kill-switch, sem cost-registry Rust quebrado
- EVO-API mantido como referência canônica (shapes, translators, cost-registry)
- EVO-API fix: `parseContentJSON()` protege contra resposta não-JSON

### Admin Pages (1 commit)
- `952c78a docs: admin pages — provider-core v1.0 como runtime primário`
- Settings: EVO-API '📚 Referência', DataForSEO '✅ provider-core v1.0'
- Integrations: provider-core substitui ambos EVO-API MCP + DataForSEO MCP
- Enrichment Engine: L0→L3 em 5 camadas, ~$0.05/lead

### Cost Center Dinâmico (1 commit)
- `0d493e9 fix: cost center dinamico + DeepSeek tracking + live badge corrigido`
- Costs page: ZERO valores hardcoded
- Capabilities lidas de `cost-registry.yaml` em runtime
- Redis tracking: DFSEO + DeepSeek spend (today/total)
- Badge '🟢 Live' (não '🔴 Live')
- DeepSeek cost tracking no `s10_generator.py` → Redis

### DeepSeek Calibrado (1 commit)
- `5325853 fix: DeepSeek pricing real + KV Cache tracking + Balance API`
- Preços corrigidos (estavam errados por 25-140×):
  - Input cache HIT: $0.0028/1M | cache MISS: $0.14/1M | Output: $0.28/1M
- KV Cache: ON por padrão, system prompt fixo = ~80% hit rate
- `adsentice_deepseek_status.py` → GET /user/balance → Redis
- Balance: $2.31 USD (topped_up)
- Cards na página de custos: pricing tabela + balance + cache info

## 🧠 O ENTENDIMENTO (decisões, contexto)

**EVO-API NÃO é mais runtime de DataForSEO.** O provider-core chama a API direto (1 hop). EVO-API permanece como referência canônica: 76 capabilities mapeadas, shapes completos, translators, cost-registry, e padrão de 3-stage gate (Shape→Sandbox→Live).

**DeepSeek V4 Flash é reasoning model.** Gasta tokens em `reasoning_content` antes de escrever `content`. Precisa de max_tokens≥1200 e parse robusto com extração de reasoning_content quando o modelo não termina de pensar.

**medido=verdade no gap detector.** Cada gap cita o sinal ou coluna do Supabase que o disparou. Sem L2, o sistema avisa "Site não analisado — dados de SEO indisponíveis" ao invés de inventar gap.

**DeepSeek custa 25× mais do que estimávamos.** O preço real é $0.14/1M input + $0.28/1M output. O KV Cache salva 98% no input quando o system prompt repete (que é o nosso caso).

**Centro de custos é 100% dinâmico.** Preços, uso, balance — tudo de cost-registry.yaml + Supabase + Redis. Sem valores inventados no código.

## 🎯 ESTADO OODA
- **observe:** Sessão 2026-07-15 — provider-core v1.0, DeepSeek calibrado, KV Cache ativo
- **orient:** 1 hop DataForSEO, custos reais rastreados, EVO-API como referência
- **decide:** Próximo ciclo: L2 enrichment live na Dra. Karina + Frontend M2
- **act:** SELADO v007 · 217 commits · 21 ADRs · 7 skills · provider-core 1.0

## ▶️ PRÓXIMO (a fila)
1. **L2 enrichment Dra. Karina** — rodar via :3000 Discovery → dados reais de schema/conteúdo
2. **M2 Frontend real** — React 19 + Vite + shadcn/ui integrado ao apps/web/
3. **Hetzner CAX11 provision** — $5.39/mês + Cloudflare Workers
4. **L4 Concorrência+Keywords** — DataForSEO live (substituir simulação)
5. **Warp M3 LLM pipeline** — destiller.process() via DeepSeek L6
6. **Testes unitários** — vitest (0% cobertura atual)

## 📊 SCORE
- **BOA:** 0.9325 → **EXCELLENT**
- **Corpus A (self):** 18,162 pontos
- **Corpus C (conversa):** 75,853 pontos
- **Total:** 94,076 pontos
- **ADRs:** 21 (14 accepted, 2 superseded)
- **Commits:** 217
- **Skills:** 7 Claude skills
- **Provider-core:** 9 arquivos TypeScript + YAML
- **DeepSeek balance:** $2.31 USD

---
*HANDOFF v007 · 2026-07-15 · adsentice*
