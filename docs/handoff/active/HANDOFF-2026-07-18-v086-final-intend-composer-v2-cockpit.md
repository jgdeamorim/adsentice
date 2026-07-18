# HANDOFF v086 FINAL · 2026-07-18 · Intend Composer v2 — Cockpit de Composição Real

**commit 0a3cfe0 · demo defasado (ts_morph) → cockpit do stack real**

## Entrega

```
admin/surface · 🧬 Intend Composer v2   [⚡Real default] [🧪Genérico preservado]
  dropdown 24 leads reais (Supabase GET /api/surface/compose)
  × [S10 Raio-X | S11 Landing] → ▶ Compor de verdade
  → preview iframe sandbox (a página real, A↔B clicável)
  → estratégias + hypothesis + QG/variante + copy_model + trace resolveStrategies
  → link rota pública do artefato
```

## Provas medidas no cockpit

- **Adaptação por segmento**: Barbearia (beleza) → A=social_proof + **B=liking**
  ("Seu novo lugar favorito para cuidar do visual") — dentista era B=urgency.
  Priors do conversionFacets funcionando entre segmentos.
- **QG expôs falha real**: renderS11 sem <main>/landmarks → 2/5. Fix honesto:
  <main role=main> + footer contentinfo → **4-5/5** (a11y real, não gaming).
- Régua performance: aceita display=swap via URL Google Fonts (equivalente
  legítimo de font-display:swap CSS).
- Par A/B fresh: 33s · $0.002 · regressões S10 200 · S11 200 · admin 307.

## Incidente e lição

GET duplicado no endpoint (o arquivo já tinha um GET na linha 129; li até a 80)
→ "Identifier GET already declared" cascateou 500 por ~3min. Guard-rail pegou;
fundido leads+info num GET. Lição: medir o ARQUIVO INTEIRO antes de editar.

## Técnica

- /api/surface/compose: GET leads (24, score desc) + POST branch S11
  (composeS11 → variants c/ QG) · caminhos S10 e genérico intactos
- WarpComposeDemo reescrito: modo real default, genérico preservado p/ 16 planned

## Pendente

1. **BUG conhecido a resolver JÁ**: React keys duplicadas no dropdown —
   discovery_listings tem place_id DUPLICADO (Kamilla 2 rows idênticas desde
   o início da sessão) → dedup no GET + avaliar UNIQUE na tabela (raiz)
2. StrategyResolver backport S10 · factory 20 surfaces · pre-warm Workers
3. Conversão: aguardar volume p/ significância (6 views = sinal)
