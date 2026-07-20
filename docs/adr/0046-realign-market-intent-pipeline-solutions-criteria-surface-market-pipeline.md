# ADR-0046 · Realinhamento Market Intent Pipeline — Solutions, Criteria, Surface, Market, Pipeline

**Status:** ACCEPTED  
**Date:** 2026-07-20  
**Author:** jeffer + Claude Opus 4.8  
**Supersedes:** Atualiza base-matriz (ADS.PRD, ADS.MIS), estende ADR-0024 (L4 IBGE), ADR-0037 (S11), ADR-0044 (L2b), ADR-0045 (S11-MK→S11K)  
**Sources:** DAG completa — 5 admin pages (2,344 loc), base-matriz, ADR-0024, ADR-0044, ADR-0045, scoring.ts, pipeline.ts, enrichment-layers.md, marketing-council-report.md

---

## 1. Contexto

O adsentice tem 5 páginas admin core que juntas formam a interface do **Market Intent Pipeline** — o funil completo de descoberta → enriquecimento → scoring → proposta → cliente:

| Página | LOC | Função |
|--------|-----|--------|
| `/admin/solutions` | 526 | 5 planos, 3 personas, projeção MRR |
| `/admin/criteria` | 607 | 60+ sinais de scoring em 8 famílias |
| `/admin/surface` | 434 | Surfaces ativas, A/B conversion, specialists |
| `/admin/market` | 497 | IBGE, cobertura, pré-flight, auto-pilot |
| `/admin/pipeline` | 280 | Funil S0→S7, barras L0/L1/L2/L3/L5, categorias |

**2,344 linhas de código-fonte analisadas.** Todas respondem (HTTP 307, compilando corretamente).

O problema: estas páginas foram escritas em momentos diferentes (v011→v084→v136), com definições de camadas que evoluíram. A sessão v133→v136 produziu 3 ADRs (0043, 0044, 0045) e 17 módulos L2b que **não estão refletidos** em nenhuma dessas páginas.

Este ADR documenta o estado real de cada página (DAG-sourced), mapeia os gaps de coerência, e propõe 6 ajustes leves que realinham o sistema.

---

## 2. Inventário do Estado Real (DAG-sourced)

### 2.1 `/admin/solutions` — Produtos e Planos

**Fonte:** `apps/web/src/app/[lang]/(dashboard)/(private)/admin/solutions/page.tsx:20-76`

```
PLANO           PREÇO       PIPELINE DOC    SIGNALS   STATUS REAL (v136)
─────────────────────────────────────────────────────────────────────
Raio-X          R$0         L0+L1+L2        37        🟡 spec; S10 LIVE (0.54s)
Sentinela       R$197/mês   Raio-X+recorr   37        🔴 page diz "recorrência mensal",
                                                         código não tem scheduler
Domínio         R$497/mês   Sentinela+L3    41        🔴 L3 backlinks existe, mas
                                                         não wireado no produto
Escala          R$997/mês   Domínio+L4      47        🔴 L4 (IBGE) dados existem,
                                                         não wireado
Growth OS       R$1.497/mês Todos+Multi     47        🔴 Multi-tenant não existe
```

**Projeção MRR (hardcoded):** mês 1 R$591 → mês 12 R$17,784

**3 Personas:** Dra. Estabelecida (60%), Dr. Recém-formado (10%), Dr. Tradicional (25%) — dados qualitativos, sem IBGE.

**Problema:** Pipeline declarado (`L0+L1+L2`) usa nomenclatura pré-ADR-0039 (L1 = GMB Profile, DEPRECATED). Status dos produtos todos 🔴, mas S10 e S11 estão LIVE.

### 2.2 `/admin/criteria` — Sinais de Scoring

**Fonte:** `apps/web/src/app/[lang]/(dashboard)/(private)/admin/criteria/page.tsx:29-101`

60+ sinais documentados em 8 famílias: FIT(10), INTENT(3), ENGAGEMENT(7), WEBSITE(12), SEO(4), ARCHITECTURE(4), SCHEMA(3), CONTENT(8)

**Problema crítico:** A UI mostra **mais sinais do que o código implementa.** O `scoring.ts` tem ~35 sinais wireados. Sinais W9-W12 e C1-C8 aparecem na UI mas não têm código correspondente. Os novos sinais de Design DNA (D1-D7, ADR-0044 §7.3) e Market Context (M1-M4, ADR-0024) não existem na UI.

### 2.3 `/admin/surface` — Surfaces e Conversão

**Fonte:** `apps/web/src/app/[lang]/(dashboard)/(private)/admin/surface/page.tsx:47-233`

Consome `GET /api/surface/status`:
- **Surfaces ativas:** S10, S11, ... (lista dinâmica)
- **Specialists:** gramática por surface (surfaceId, name, status)
- **Conversão A/B:** variante congelada por visitante (surface, variant, rate)
- **Artifacts:** s10_artifacts com versão, modelo, variante

**Problema:** S11 mostra "2/22 surfaces". ADR-0045 define S11 em 2 etapas (S11-MK pré-venda + S11K pós-venda), mas a surface page não conhece essa distinção. A conversão A/B existe no código mas está em 0 para todas as surfaces.

### 2.4 `/admin/market` — Mercado e Cobertura

**Fonte:** `apps/web/src/app/[lang]/(dashboard)/(private)/admin/market/page.tsx:28-205`

Consome `nicheIntelligence()`, `listMarketCategories()`, `marketOverview()`, `getPreflightMarketIntel()`:
- **Cobertura:** mapa de buscas por cidade (pins no mapa)
- **Categorias:** distribuição com filtros clicáveis
- **IBGE:** pré-flight com população e coordenadas (district_registry)
- **Auto-Pilot:** State Scorer + Target Scorer

**Problema:** Dados IBGE são mostrados na UI (população, renda) mas **não alimentam o scoring.** O market page tem os dados, o criteria page poderia ter sinais M1-M4, mas o código não conecta.

### 2.5 `/admin/pipeline` — Funil de Leads

**Fonte:** `apps/web/src/app/[lang]/(dashboard)/(private)/admin/pipeline/page.tsx:30-208`

```
ESTÁGIO   LABEL              COUNT   FONTE                  REALIDADE
─────────────────────────────────────────────────────────────────────
S0        Descoberto         ~1400   enrichmentCounts.l0    ✅ L0 GMB Data
S1        Perfilado          ~700    enrichmentCounts.l1    🔴 L1 = DEPRECATED (ADR-0039)
S2        Auditado           ~400    enrichmentCounts.l2    🟡 L2 genérico (não distingue L2a/L2b)
S3        Qualificado        ~120*   (estimado 30% de S2)   🔴 estimativa, não medido
S4        Contatado          0       —                      🔴 não existe automação
S5        Em Negociação      0       —                      🔴 não existe CRM
S6        Cliente            0       —                      🔴 0 clientes
S7        Embaixador         0       —                      🔴 0 clientes
```

**Cards métricos:** S0 Descobertos, S2 Auditados (L2), S1 Perfilados (L1), L5 CNPJ

**Barras ausentes:** L4 IBGE (dados existem no Supabase), L2b (17 módulos prontos, zero wire), L3 (backlinks existem mas não são contados)

---

## 3. Matriz de Gaps (5 páginas × sistema real)

```
                         SOLUTIONS   CRITERIA    SURFACE     MARKET      PIPELINE
                         ─────────   ────────    ───────     ──────      ────────
L0 GMB Data              ✅ menciona  ✅ 10 sigs  —           —           ✅ S0
L1 GMB Profile           ✅ "L0+L1"   ❌ DEPREC   —           —           🔴 ainda conta
L2a SEO Técnico          ✅ "L2"      ✅ 12 sigs  —           —           🟡 L2 genérico
L2b Conteúdo+Design      ❌ ausente   ❌ 0 sigs   ❌ ausente   —           ❌ ausente
L3 Competitive Intel     ✅ "L3"      ❌ 0 sigs   —           —           ❌ não conta
L4 IBGE Market Context   ✅ "L4"      ❌ 0 sigs   —           ✅ mostra    ❌ não conta
L5 CNPJ                  ❌ ausente   ❌ ausente  —           —           ✅ barra L5
L6 Geração (S10, S11)    —           —           ✅ 2/22     —           ❌ ausente
L7 Analytics             ❌ ausente   —           ✅ A/B (0)  —           ❌ ausente

Preços                   R$0→R$1.497 —           —           —           —
Status produtos          todos 🔴    —           —           —           —
29 categorias            —           F1 menção   —           ✅ filtros   ✅ top 10
IBGE nos sinais          ❌ ausente   ❌ ausente  —           ✅ dados     ❌ ausente
S11-MK / S11K            ❌ ausente   —           ❌ ausente   —           ❌ ausente
Wa-Check                 ❌ ausente   ✅ E5 (WA)  —           —           ❌ ausente
```

---

## 4. Decisão

**Realinhar as 5 páginas admin com a realidade do sistema v136, aplicando 6 ajustes leves e coerentes.** Não é um redesign — é uma correção de narrativa. O que o código faz e o que a UI diz precisam ser a mesma coisa.

### Ajuste 1: Pipeline — Renomear estágios para refletir camadas canônicas (15min)

```diff
Arquivo: apps/web/src/app/[lang]/(dashboard)/(private)/admin/pipeline/page.tsx

- S0: Descoberto         L0
- S1: Perfilado          L1 (DEPRECATED)
- S2: Auditado           L2 (genérico)
- S3: Qualificado        (estimado)
+ S0 · L0 GMB Data       (Descoberto — Google Meu Negócio)
+ S1 · L2a SEO Técnico   (Auditoria técnica — Lighthouse, CMS)
+ S2 · L2b Conteúdo      (Perfil completo — serviços, DNA, staff)
+ S3 · L3 Competitivo    (Inteligência — backlinks, SOV, keywords)
+ S4 · L4 Market Context  (Qualificado — IBGE renda/PIB/pop)
+ S5 · L5 CNPJ           (Formalizado — CNAE, regime, sócios)

  (S4-S7 mantidos: Contatado → Em Negociação → Cliente → Embaixador)
```

**Justificativa:** L1 (GMB Profile) foi deprecado pela ADR-0039. Pipeline page ainda conta `enrichment_level >= 1` como "Perfilado" — mas L1 não é mais executado. L2b (17 módulos, 2,482 linhas) não aparece em estágio nenhum. L4 (IBGE) tem dados no Supabase mas zero visibilidade no pipeline. A nova nomenclatura alinha os estágios com as 7 camadas canônicas (ADR-0024 + ADR-0044).

### Ajuste 2: Pipeline — Adicionar barras L4 e L3 (30min)

```typescript
// Adicionar ao enrichmentCounts:
enrichmentCounts.l3 = list.filter((r: any) => 
  (r.enrichment_level || 0) >= 3 || r.l3_social_links != null
).length
enrichmentCounts.l4 = list.filter((r: any) => 
  r.ibge_renda != null || r.ibge_populacao != null
).length

// Adicionar CardStatVertical:
<CardStatVertical stats={enrichmentCounts.l3.toLocaleString('pt-BR')}
  title='L3 · Competitive Intel'
  subtitle='Backlinks + SOV + keywords' />
<CardStatVertical stats={enrichmentCounts.l4.toLocaleString('pt-BR')}
  title='L4 · Contexto IBGE'
  subtitle='Renda, PIB, população do município' />
```

### Ajuste 3: Criteria — Adicionar sinais L2b + L4 + Design DNA (1h)

```typescript
// NOVAS FAMÍLIAS de sinais:

const DESIGN_SIGNALS: PainSignal[] = [
  { id: 'D1', name: 'Design Profissional', condition: 'designScore ≥ 70', points: 15, dimension: 'Engagement', layer: 'L2b', description: 'Site com design system consistente (cores, fontes, componentes)' },
  { id: 'D2', name: 'Design Amador', condition: 'designScore < 30', points: 10, dimension: 'Fit', layer: 'L2b', description: 'Design inconsistente ou datado — oportunidade de melhoria' },
  { id: 'D3', name: 'Identidade Consistente', condition: 'uxDNA.consistency ≥ 70', points: 10, dimension: 'Engagement', layer: 'L2b', description: 'Mesmos padrões visuais em todo o site' },
  { id: 'D4', name: 'Acessibilidade OK', condition: 'uxDNA.wcagLevel ≥ AA', points: 8, dimension: 'Engagement', layer: 'L2b', description: 'Site acessível (alt text, aria labels, navegável por teclado)' },
  { id: 'D5', name: 'Design Datado', condition: 'visualStyle.outdated', points: 8, dimension: 'Fit', layer: 'L2b', description: 'Site parece ter mais de 5 anos — pode afastar clientes' },
  { id: 'D6', name: 'Schema.org Presente', condition: 'hasSchemaOrg = true', points: 5, dimension: 'Engagement', layer: 'L2b', description: 'Dados estruturados LocalBusiness JSON-LD' },
  { id: 'D7', name: 'Redes Sociais Linkadas', condition: 'socialLinksCount ≥ 2', points: 5, dimension: 'Engagement', layer: 'L2b', description: 'Instagram + Facebook linkados no site = presença cross-channel' },
]

const CONTENT_L2B_SIGNALS: PainSignal[] = [
  { id: 'C9', name: 'Sem Serviços Listados', condition: 'services.length < 2', points: 8, dimension: 'Fit', layer: 'L2b', description: 'Site não lista serviços/procedimentos claramente' },
  { id: 'C10', name: 'Sem Equipe Visível', condition: '!staff.hasAnyStaff', points: 5, dimension: 'Engagement', layer: 'L2b', description: 'Site não mostra profissionais/equipe — perde credibilidade' },
  { id: 'C11', name: 'Sem Convênios', condition: '!insurance.acceptsInsurance', points: 5, dimension: 'Fit', layer: 'L2b', description: 'Não informa convênios/planos aceitos (saúde) ou credenciamentos' },
  { id: 'C12', name: 'Sem WhatsApp no Site', condition: '!hasWhatsAppLink', points: 10, dimension: 'Intent', layer: 'L2b', description: 'Canal #1 de venda no Brasil ausente do site' },
  { id: 'C13', name: 'Sem Agendamento Online', condition: '!hasBooking', points: 12, dimension: 'Intent', layer: 'L2b', description: 'Cliente não consegue agendar pelo site — perde conversão' },
  { id: 'C14', name: 'Blog Inativo', condition: '!blogActive', points: 5, dimension: 'Engagement', layer: 'L2b', description: 'Blog sem posts recentes (> 90 dias) ou inexistente' },
  { id: 'C15', name: 'Sem Depoimentos', condition: '!hasTestimonials', points: 5, dimension: 'Engagement', layer: 'L2b', description: 'Sem prova social no site (depoimentos, reviews, casos)' },
  { id: 'C16', name: 'Preços Ocultos', condition: '!hasPrices', points: 8, dimension: 'Intent', layer: 'L2b', description: 'Site não mostra preços — falta transparência' },
]

const MARKET_SIGNALS: PainSignal[] = [
  { id: 'M1', name: 'Baixa Renda do Bairro', condition: 'ibge_renda < 1500', points: 5, dimension: 'Fit', layer: 'L4', description: 'Renda média do município abaixo de R$1.500 — ticket menor' },
  { id: 'M2', name: 'Alta Densidade', condition: 'competitorsCount > 50', points: 10, dimension: 'Intent', layer: 'L4', description: 'Alta concentração de concorrentes na mesma categoria/cidade' },
  { id: 'M3', name: 'Mercado Grande', condition: 'ibge_pop > 500000', points: 10, dimension: 'Engagement', layer: 'L4', description: 'Município com mais de 500K habitantes — mercado grande' },
  { id: 'M4', name: 'PIB Per Capita Alto', condition: 'ibge_pib_per_capita > 30000', points: 10, dimension: 'Engagement', layer: 'L4', description: 'PIB per capita acima de R$30K — poder aquisitivo alto' },
]
```

**Total de sinais: ~60 → ~87 (+45%)**

### Ajuste 4: Solutions — Atualizar status dos produtos (30min)

```diff
- Todos: "🔴 v0.3-v0.6"
+ Raio-X:     🟡 S10 LIVE (0.54s, ADR-0038) · L0+L2a
+ Sentinela:  🟡 S10+S11 LIVE · L2b wire pendente (17 módulos prontos)
+ Domínio:    🟡 L3 backlinks LIVE · S11K spec pronta (ADR-0045)
+ Escala:     🔴 requer L7 Analytics · DeepSeek diagnóstico pendente
+ Growth OS:  🔴 multi-tenant não implementado

- Pipeline declarado: "L0+L1+L2"
+ Pipeline declarado: "L0 + L2a + L2b + L3 + L4 + L5"
```

### Ajuste 5: Wire L2b → S11 (3h — o que desbloqueia o produto)

```typescript
// composeS11() expandido com dados L2b reais
const l2b = lead.website ? await enrichL2bContent(lead.website) : null

// Antes: NICHO_MAP hardcoded
const biz = { specialties: nicho.specialties, pains: nicho.pains, ... }

// Depois: dados REAIS do site
const biz = {
  name: lead.title,
  doctorName: l2b?.doctors?.[0]?.name,          // REAL: "Dra. Ana Oliveira"
  doctorCRM: l2b?.doctors?.[0]?.crm,            // REAL: "CRM 12345"
  specialties: l2b?.services?.length
    ? l2b.services                                // REAL: ["Limpeza", "Aparelho"]
    : nicho.specialties,
  insurance: l2b?.insurance || [],                // REAL: ["Unimed", "Bradesco"]
  bookingPlatform: l2b?.bookingPlatform,          // REAL: "whatsapp" | "doctoralia"
  instagram: l2b?.socialLinks?.instagram,         // REAL: "@odontoexcellence"
  hasPrices: l2b?.hasPrices,                      // REAL: true/false
  brandColors: l2b?.brandDNA?.colors,             // REAL: cores da marca
  brandFonts: l2b?.brandDNA?.typography,          // REAL: fontes da marca
}

// TokenComposer com Brand DNA REAL
const T = unifyTokens(seg, {
  primary: l2b?.brandDNA?.colors?.primary || p,
  secondary: l2b?.brandDNA?.colors?.secondary || s,
  accent: l2b?.brandDNA?.colors?.accent || a,
}, odSystem, materio, 'S11')
```

**Impacto:** S11 deixa de ser template genérico. Cada landing page tem as cores, fontes, serviços e médicos REAIS da clínica. S11-MK (proposta pré-venda, $0.001) pode ser gerado. S11K (landing técnica, $0.093) pode ser vendido como Sentinela (R$197/mês).

### Ajuste 6: Base-Matriz — Sincronizar (1h)

Atualizar as seções defasadas da `base-matriz-adsentice.md`:

```diff
- ADS.PRD.enrichment: 5 camadas L0-L4
+ ADS.PRD.enrichment: 7 camadas L0-L7 (ADR-0024 + ADR-0044 + ADR-0045)

- ADS.PRD.products.*: todos 🔴 v0.3-v0.6
+ Raio-X: 🟡 S10 LIVE · Sentinela: 🟡 S10+S11 LIVE · Domínio: 🟡 spec

- ADS.MIS.ticket: R$47-197/mês
+ ADS.MIS.ticket: R$0→R$197→R$497→R$997→R$1.497 (5 planos)

- ADS.PRD.enrich.l1_website: "Website Lighthouse"
+ ADS.PRD.enrich.l2a_seo: "SEO Técnico — Lighthouse, CMS, analytics"

+ ADS.PRD.enrich.l2b_content: "Conteúdo+Design DNA — crawler modular .TS (ADR-0044)"

- ADS.PRD.enrich.l4_diagnostic: "Diagnóstico LLM"
+ ADS.PRD.enrich.l4_ibge: "Market Context — IBGE renda/PIB/pop (ADR-0024)"
+ ADS.PRD.enrich.l5_cnpj: "CNPJ — ReceitaWS, CNAE, sócios (ADR-0028)"
+ ADS.PRD.enrich.l6_generation: "Geração — S10, S11, Warp Composer (ADR-0037, ADR-0045)"
+ ADS.PRD.enrich.l7_analytics: "Mensuração — A/B tracking, conversão, Learning Loop"
```

---

## 5. Plano de Execução

| # | Ajuste | Esforço | Bloqueia | Arquivos |
|---|--------|---------|----------|----------|
| **1** | Pipeline: renomear estágios | 15min | — | `pipeline/page.tsx` |
| **2** | Pipeline: adicionar barras L3, L4 | 30min | — | `pipeline/page.tsx` |
| **3** | Criteria: adicionar D1-D7, C9-C16, M1-M4 | 1h | — | `criteria/page.tsx` |
| **4** | Solutions: atualizar status + pipeline | 30min | — | `solutions/page.tsx` |
| **5** | Wire L2b → S11 | 3h | S11-MK, S11K | `warp-composer.ts`, `l2b/` |
| **6** | Base-matriz: sincronizar | 1h | — | `base-matriz-adsentice.md` |

**Total: ~6.5h. Custo: $0. Todos os ajustes são no código existente — sem novas dependências.**

---

## 6. Impacto no Produto

### Antes (v136 atual)

```
Raio-X:   S10 genérico (NICHO_MAP hardcoded)
Sentinela: mesma coisa que Raio-X, mas "com recorrência"
Domínio:   L3 backlinks no banco, não visível pro cliente
Proposta:  não existe (vendedor não tem ferramenta)
```

### Depois (pós-realinhamento)

```
Raio-X:   S10 com dados reais (serviços, Brand DNA, médicos)
Sentinela: S11K — landing page A/B com SEO real + cores da marca
          S11-MK — proposta visual com dados reais ($0.001/lead)
Domínio:   S11K + L3 competitive intel visível no dashboard
Proposta:  vendedor clica 1 botão → MockUp ReBrand com dados REAIS
```

---

## 7. Consequências

### Positivas

1. **Coerência produto-código:** As 5 páginas admin refletem exatamente o que o sistema faz. O que o vendedor vê é o que o código entrega.
2. **L2b vira produto:** 2,482 linhas de código implementadas e testadas finalmente aparecem na UI e geram valor.
3. **Pipeline visível ponta-a-ponta:** L0→L7 visível no funil, cada camada com métricas reais.
4. **Criteria expandido:** +27 sinais documentados na UI, alinhados com `scoring.ts`.
5. **Funil de vendas ativável:** S11-MK (proposta $0.001) pronto para o vendedor usar. S11K (landing $0.093) pronto para entregar.

### Negativas

1. **L1 oficialmente removido do pipeline:** Perda de visibilidade do `enrichment_level >= 1`. Mitigação: L1 já estava deprecated (ADR-0039), 0% match rate.
2. **S4-S7 continuam em 0:** Os estágios de CRM (contatado, negociação, cliente) dependem de automação que não existe. Mas agora estão claramente separados dos estágios de dados (S0-S5).

---

## 8. Riscos

| Risco | Mitigação |
|-------|----------|
| Renomear estágios quebra links no LeadTable | Manter `filterMap` com mapeamento antigo→novo |
| L2b wire quebra S11 existente | Feature flag: `useL2bData` default false, ativar por lead |
| Sinais novos no Criteria sem código correspondente | Marcar `status: 'spec'` nos sinais sem wire |
| Base-matriz desatualizada de novo | Atualizar como parte do pipeline auto-compact |

---

## 9. Verificação

1. `/admin/pipeline` — estágios renomeados, barras L3+L4 visíveis com dados reais
2. `/admin/criteria` — 87 sinais, D1-D7 + C9-C16 + M1-M4 documentados
3. `/admin/solutions` — status atualizados (S10 ✅ LIVE, S11 🟡)
4. `composeS11(placeId)` com L2b wireado — landing page com Brand DNA real
5. S11-MK gerado com dados reais (serviços, médicos, cores)
6. `base-matriz-adsentice.md` — 7 camadas, 5 planos, status corretos
7. BOA mantido ≥ 0.85 (sem regressão)

---

## 10. Próximos Passos

- [x] ADR-0046 escrita (DAG completa 5 páginas admin)
- [ ] Ajuste 1: Pipeline renomear estágios
- [ ] Ajuste 2: Pipeline adicionar barras L3+L4
- [ ] Ajuste 3: Criteria adicionar D1-D7, C9-C16, M1-M4
- [ ] Ajuste 4: Solutions atualizar status
- [ ] Ajuste 5: Wire L2b → S11
- [ ] Ajuste 6: Base-matriz sincronizar
