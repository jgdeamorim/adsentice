# HANDOFF v084 FINAL · 2026-07-18 · S11 Landing LIVE — A/B por Estratégia de Conversão

**Sessão S11 completa em 6 fases · commits 48c70b5→81c9917 · 2/22 surfaces live**

## Pipeline S11 end-to-end (medido)

```
GERAÇÃO (composeS11 · $0.002 · ~40s cold par A/B · ZERO DataForSEO)
  Supabase lead (enriquecido pelo admin — inclui phone) → classify NICHO_MAP
  → M9 + 4 queries Qdrant (Promise.all) + unifyTokens('S11' → 1200px)
  → resolveIntentVocab (+conversionFacets — gap KG fechado)
  → resolveStrategies: 8 facets vocab.conversion × SINAIS REAIS
     (rating 4.9★+131→social_proof · score<50→urgency · claimed→authority)
     → A dominante + B challenger de FAMÍLIA diversa (trust/pressure/relationship)
  → por estratégia: composeLayout(strategy) reordena narrativa + copy
     DeepSeek por slot (7 slots, LEIS honestas) c/ fallback determinístico
  → renderS11_GREEN 9 slots soberanos → par publicado (ADR-0038 reuso:
     R2 s11/{pid}/v{N}{A|B}.json + série surface='S11' + TTL 30d)

VIEW /s11-landing/[place_id] (0.84s quente)
  cookie ads_ab congela variante 30d → artefato → view event por variante

CONVERSÃO /r/[place_id]?v={A|B}
  cta_click POR ESTRATÉGIA → 302 wa.me do cliente (fallback Maps) → f0
```

## Prova E2E (Kamilla Scalzer)

- **A=social_proof**: "4.9★ com 131 avaliações: a confiança do seu sorriso no Praia do Canto" · ordem Confiança→Reputação→Nota→Números
- **B=urgency**: "Sorriso saudável começa com uma consulta gratuita — agende agora"
- Honesto: zero R$/depoimento/métrica inventada · Maps por place_id real
- Eventos: A 2 views+1 click · B 1 view → **conversão por estratégia MEDIDA**
- S10 regressão: 200 em TODAS as fases (guard-rail da memória cumprido)

## Entregas por fase

| F | Commit | Marco |
|---|--------|-------|
| 1-2 | 48c70b5 | S11_SPECIALIST (ontologia OD 9 slots) + conversionFacets + StrategyResolver (8 estratégias, score por sinais) + composeLayout(strategy?) aditivo |
| 3-4 | 6fc5b10 | generateLandingCopy 7 slots (LEIS honestas) + fallback digno + renderS11_GREEN (zero-lib, WCAG AA, scroll-driven @supports, Schema.org rating real) + composeS11 |
| 5-6 | 81c9917 | migration 015 (multi-surface + fix bug ab_variant v082 + s11_events) + S10 blindado (filtro surface) + rotas públicas + loop /r/ |

## URLs vivas

- `localhost:3000/s11-landing/ChIJoaw2X9QXuAARpTelu0iK5pY` (?v=A|B inspeção)
- `localhost:3000/s10-raio-x/ChIJoaw2X9QXuAARpTelu0iK5pY`
- Conversão por variante: `SELECT ab_variant, event, COUNT(*) FROM s11_events GROUP BY 1,2`

## Pendente

1. Conversão dashboard admin (taxa click/view por estratégia → BOA/f0)
2. S10 backport: StrategyResolver no raio-X (substituir score%2 legado)
3. Copy morph completo (hero usa copyAngle; expandir aos demais slots)
4. SurfaceSpecialist factory (S11 provou o template — 20 surfaces restantes)
5. Batch pre-warm Workers (ADR-0038 F2) · dual embed e0+e1
