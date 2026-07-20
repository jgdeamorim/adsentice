# ADR-0050 · Category Intelligence — O Motor de Mercado Interno que Ninguém Tem

**Status:** ACCEPTED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Extends:** ADR-0023 (Auto-Pilot), ADR-0024 (L4 IBGE), ADR-0025 (RM Discovery), ADR-0046 (Realinhamento Pipeline), ADR-0049 (Discovery Layer)
**Sources:** DAG completa — 29 ICP categories, Supabase live, IBGE tables, Qdrant 832 pts

---

## 1. Contexto

O adsentice tem 29 categorias ICP no `scoring.ts` — mas elas são usadas apenas como **labels planas** para filtrar e classificar leads. Cada categoria é uma string (`"dentist"`, `"lawyer"`, `"restaurant"`...), não uma **dimensão de mercado** com inteligência própria.

O Auto-Pilot decide ONDE prospectar baseado em IBGE (população, renda) — mas não sabe QUAL categoria tem maior gap de cobertura naquela região. O Pre-flight conta candidatos antes de pagar — mas é manual (usuário escolhe categoria + cidade). O Discovery Layer (ADR-0049) tem 832 pts de marketing intelligence — mas não sabe para qual categoria aplicar.

**O que ninguém tem:** inteligência de mercado POR CATEGORIA, alimentada por dados reais de cobertura, atualizada a cada discovery, e conectada ao motor de decisão do Auto-Pilot.

---

## 2. Decisão

**Criar o Category Intelligence Engine — um módulo que transforma cada uma das 29 categorias ICP em uma dimensão de mercado viva, com cobertura %, oportunidades ranqueadas, e integração automática com o Auto-Pilot.**

### 2.1 O que cada categoria vai saber sobre si mesma

```typescript
interface CategoryIntelligence {
  // ── Identidade ──
  category: string                    // "dentist"
  label: string                       // "Dentista"
  segment: SegmentId                  // "saude"
  icpSignals: string[]                // ["F1", "F3", "W6"] — quais sinais mais pesam?

  // ── Mercado (IBGE) ──
  marketSize: {
    totalBR: number                   // quantos estabelecimentos no Brasil?
    topUFs: { uf: string; count: number; pct: number }[]  // top 5 UFs
    densityPerCapita: number          // estabelecimentos por 100K habitantes
    avgRevenue: string                // "R$ 150-500/consulta"
  }

  // ── Cobertura (nossa base) ──
  coverage: {
    totalDiscovered: number           // quantos leads já temos?
    uniquePlaceIds: number            // quantos place_ids únicos?
    coveragePctBR: number             // % coberto do mercado total
    topCities: { city: string; count: number; pct: number }[]
    gaps: { city: string; state: string; estimatedMissing: number; priority: number }[]
  }

  // ── Qualidade ──
  quality: {
    avgScore: number                  // score médio dos leads
    scoreDistribution: { unaware: number; problemAware: number; solutionAware: number; productAware: number; mostAware: number }
    pctWithWebsite: number            // % com website
    pctWithPhone: number              // % com telefone
    pctBusinessWA: number             // % WhatsApp Business verificado
    pctEnrichedL2: number             // % com L2 completo
    pctEnrichedL3: number             // % com L3 completo
    topGaps: string[]                 // gaps mais frequentes neste nicho
  }

  // ── Conversão ──
  conversion: {
    raioXSent: number                 // quantos receberam Raio-X?
    proposalsGenerated: number        // quantos S11-MK gerados?
    clientsActive: number             // clientes ativos
    mrrByCategory: number             // MRR desta categoria
  }

  // ── Oportunidade (calculado) ──
  opportunity: {
    score: number                     // 0-100 · prioridade de prospecção
    recommendedRegions: { city: string; state: string; reason: string }[]
    nextAction: string                // "Prospectar Itaquera — 0% coberto, score médio estimado 55"
    estimatedCost: number             // custo estimado para cobrir gaps
    estimatedROI: string              // "R$ 3.000-5.000/mês em 3 meses"
  }

  // ── Inteligência de Marketing (ADR-0049) ──
  marketingIntel: {
    topSkills: string[]               // skills mais relevantes do Qdrant
    strategyRecommendation: string    // "Foco em SEO local + WhatsApp — 80% dos leads não têm site"
    competitiveLandscape: string      // "Alta densidade em SP capital, baixa no interior"
  }
}
```

---

## 3. Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│              CATEGORY INTELLIGENCE ENGINE                             │
│                                                                      │
│  SOURCES                                                             │
│  ├── Supabase: discovery_listings (1,370+ leads, 29 categorias)     │
│  ├── IBGE:     ibge_panorama + ibge_income (Supabase)               │
│  ├── Qdrant:   832 pts marketing intelligence (ADR-0049)            │
│  └── Redis:    OODA + pipeline stats                                │
│                                                                      │
│  OUTPUT                                                              │
│  ├── category-intel.ts          → CategoryIntelligence por categoria│
│  ├── GET /api/category/intel    → todas as 29 categorias            │
│  ├── GET /api/category/intel?cat=dentist → 1 categoria detalhada   │
│  └── Admin UI:                   → "📊 Market Intel" dashboard     │
│                                                                      │
│  CONSUMERS                                                           │
│  ├── Auto-Pilot:     "Qual categoria × região prospectar agora?"    │
│  ├── Pre-flight:     "Quantos candidatos em X categoria Y cidade?"  │
│  ├── Discovery:      "Quais categorias buscar nesta região?"        │
│  ├── S11-MK:         "Proposta personalizada POR nicho"             │
│  └── Pipeline:       "Funil por categoria"                           │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 Fluxo de Decisão do Auto-Pilot

```
State Scorer (QUAL estado?)
  │  "SP tem 45K dentistas, renda R$2.300. Cobertura: 12%."
  │  "RJ tem 22K dentistas, renda R$1.800. Cobertura: 25%."
  │  → SP prioritário (maior população × menor cobertura)
  │
  ▼
Target Scorer (QUAL município?)
  │  "SP capital: 85% coberto (saturado)"
  │  "Guarulhos: 8% coberto, renda R$1.900 (oportunidade)"
  │  "São Bernardo: 0% coberto, renda R$2.400 (oportunidade OURO)"
  │  → São Bernardo (maior gap × maior renda)
  │
  ▼
Category Intelligence (QUAL categoria?)
  │  "dentist: 62 score médio, 35% têm website, 28% WA Business"
  │  "medical_aesthetic_clinic: 58 score médio, 45% têm website"
  │  "restaurant: 41 score médio, 15% têm website"
  │  → dentist (maior potencial de conversão para Sentinela)
  │
  ▼
Pre-flight ($0 · QUANTOS candidatos?)
  │  "dentist em São Bernardo, raio 5km: ~40 candidatos estimados"
  │  "Custo L0: 1 página = $0.048"
  │  "Custo L2 (top 30): $0.30"
  │  "ROI estimado: 1 cliente Sentinela (R$197) = payback imediato"
  │
  ▼
Discovery L0 (EXECUTA)
  │  businessListingsSearch({ categories: ["dentist"], lat, lng, radiusKm: 5 })
  │  → 40 listings → L2 (top 30) → L3 → L4 (todos) → scoring
  │
  ▼
Raio-X + S11-MK (CONVERTE)
     → Top 10 leads recebem Raio-X automático
     → Vendedor recebe S11-MK com dados REAIS
```

---

## 4. Implementação

### 4.1 `category-intel.ts` — Motor Principal (~200 linhas)

```typescript
// apps/web/src/lib/category-intel.ts
import { ICP_CATEGORIES, ICP_CATEGORY_LABELS } from "./scoring"
import { getAdminClient } from "./supabase-admin"
import { discoverSkills } from "@/../packages/warp/src/marketing-kg"

export async function getCategoryIntelligence(category?: string): Promise<CategoryIntelligence[]> {
  const supabase = getAdminClient()
  const categories = category ? [category] : [...ICP_CATEGORIES]

  // 1. Aggregate from discovery_listings
  const { data: listings } = await supabase.from("discovery_listings")
    .select("category,place_id,city,score_compound,schwartz_label,website,phone,wa_is_business,enrichment_level")
    .in("category", categories)

  // 2. IBGE panorama (market context)
  const { data: ibge } = await supabase.from("ibge_panorama")
    .select("municipio_nome,populacao,pib_per_capita,densidade_demografica,uf")

  // 3. Build per-category intelligence
  const results: CategoryIntelligence[] = []

  for (const cat of categories) {
    const catListings = (listings || []).filter(l => l.category === cat)
    const uniquePlaces = new Set(catListings.map(l => l.place_id)).size

    // Coverage by city
    const byCity = new Map<string, number>()
    for (const l of catListings) {
      if (l.city) byCity.set(l.city, (byCity.get(l.city) || 0) + 1)
    }

    // Gaps: cities in IBGE that have 0 coverage
    const ibgeCities = new Set((ibge || []).map(r => r.municipio_nome?.toLowerCase()))
    const coveredCities = new Set([...byCity.keys()].map(c => c.toLowerCase()))
    const gaps = [...ibgeCities].filter(c => !coveredCities.has(c))
      .slice(0, 10)
      .map(city => ({
        city, state: (ibge || []).find(r => r.municipio_nome?.toLowerCase() === city)?.uf || "",
        estimatedMissing: Math.round((ibge || []).find(r => r.municipio_nome?.toLowerCase() === city)?.populacao || 0 / 10000),
        priority: 0, // calculated below
      }))

    // Quality metrics
    const scores = catListings.map(l => l.score_compound || 0).filter(s => s > 0)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const pctWithWebsite = Math.round((catListings.filter(l => l.website).length / Math.max(catListings.length, 1)) * 100)
    const pctBusinessWA = Math.round((catListings.filter(l => l.wa_is_business).length / Math.max(catListings.length, 1)) * 100)

    // Opportunity score (0-100)
    const coveragePct = Math.round((uniquePlaces / Math.max(gaps.length + uniquePlaces, 1)) * 100)
    const opportunityScore = Math.min(100, Math.round(
      (100 - coveragePct) * 0.40 +  // gap de cobertura
      (avgScore > 50 ? 30 : avgScore > 30 ? 20 : 10) * 1.5 +  // qualidade dos leads
      (pctWithWebsite > 30 ? 20 : 10) * 1.0  // maturidade digital
    ))

    // Marketing intelligence (ADR-0049 Discovery Layer)
    let marketingIntel = { topSkills: [] as string[], strategyRecommendation: "" }
    try {
      const skills = await discoverSkills({
        businessName: ICP_CATEGORY_LABELS[cat] || cat,
        category: cat, segment: catToSegment(cat), city: "Brasil",
        district: "", score: avgScore, rating: 0, reviews: 0,
        isClaimed: false, hasWebsite: pctWithWebsite > 30,
        competitorCount: uniquePlaces, topGaps: [], schwartzLevel: "Problem Aware",
      }, 5)
      marketingIntel = {
        topSkills: skills.map(s => s.skillName).slice(0, 5),
        strategyRecommendation: skills[0]?.content?.slice(0, 200) || "",
      }
    } catch (e: unknown) { void e }

    results.push({
      category: cat,
      label: ICP_CATEGORY_LABELS[cat] || cat,
      segment: catToSegment(cat),
      icpSignals: ["F1", "F3"],
      coverage: {
        totalDiscovered: catListings.length,
        uniquePlaceIds: uniquePlaces,
        coveragePctBR: coveragePct,
        topCities: [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({
          city, count, pct: Math.round((count / catListings.length) * 100)
        })),
        gaps: gaps.map(g => ({
          ...g,
          priority: Math.round((g.estimatedMissing / Math.max(...gaps.map(x => x.estimatedMissing), 1)) * 100)
        })),
      },
      quality: {
        avgScore,
        pctWithWebsite,
        pctWithPhone: Math.round((catListings.filter(l => l.phone).length / Math.max(catListings.length, 1)) * 100),
        pctBusinessWA,
        pctEnrichedL2: Math.round((catListings.filter(l => l.enrichment_level >= 2).length / Math.max(catListings.length, 1)) * 100),
        pctEnrichedL3: Math.round((catListings.filter(l => l.enrichment_level >= 3).length / Math.max(catListings.length, 1)) * 100),
        scoreDistribution: { unaware: 0, problemAware: 0, solutionAware: 0, productAware: 0, mostAware: 0 },
        topGaps: [],
      },
      conversion: { raioXSent: 0, proposalsGenerated: 0, clientsActive: 0, mrrByCategory: 0 },
      opportunity: {
        score: opportunityScore,
        recommendedRegions: gaps.slice(0, 3).map(g => ({
          city: g.city, state: g.state,
          reason: `${g.city} (${g.state}) — ${g.estimatedMissing} estabelecimentos estimados, 0% cobertura`,
        })),
        nextAction: gaps.length > 0
          ? `Prospectar ${gaps[0].city} (${gaps[0].state}) — 0% coberto, potencial ${gaps[0].estimatedMissing}+ leads`
          : "Categoria bem coberta. Expandir raio ou testar nova categoria.",
        estimatedCost: gaps.length > 0 ? gaps.slice(0, 3).length * 0.048 : 0,
        estimatedROI: avgScore > 50 ? "ROI positivo em < 1 mês (1 cliente Sentinela cobre custo)" : "ROI incerto — leads com score baixo",
      },
      marketingIntel,
    })
  }

  return results.sort((a, b) => b.opportunity.score - a.opportunity.score)
}

function catToSegment(cat: string): string {
  const saude = ["dentist", "orthodontist", "medical_aesthetic_clinic", "medical_clinic", "psychologist", "physical_therapist", "ophthalmologist", "cardiologist"]
  const beleza = ["barber_shop", "beauty_salon"]
  if (saude.includes(cat)) return "saude"
  if (beleza.includes(cat)) return "beleza"
  return "servicos"
}
```

### 4.2 API Route

```typescript
// apps/web/src/app/api/category/intel/route.ts
export async function GET(request: NextRequest) {
  const cat = request.nextUrl.searchParams.get("cat")
  const intel = await getCategoryIntelligence(cat || undefined)
  return NextResponse.json(cat ? intel[0] : intel)
}
```

### 4.3 Integração com Auto-Pilot

```typescript
// target-scorer.ts — enriquecer com category intelligence
export async function scoreMunicipalityTarget(city: string, state: string): Promise<MunicipalityTarget> {
  // ... existing IBGE logic ...

  // NOVO: quais categorias têm maior gap nesta cidade?
  const catIntel = await getCategoryIntelligence()
  const cityGaps = catIntel
    .filter(ci => ci.coverage.gaps.some(g => g.city.toLowerCase() === city.toLowerCase()))
    .sort((a, b) => b.opportunity.score - a.opportunity.score)

  return {
    ...base,
    recommendedCategories: cityGaps.slice(0, 3).map(ci => ({
      category: ci.category,
      label: ci.label,
      opportunityScore: ci.opportunity.score,
      reason: ci.opportunity.nextAction,
    })),
  }
}
```

---

## 5. Impacto

### Antes

```
Discovery: "Quero buscar dentist em SP, raio 5km"
  → Usuário decide categoria E região manualmente
  → 29 categorias como strings planas
  → Sem noção de cobertura % por categoria × região
  → Pre-flight manual
```

### Depois

```
GET /api/category/intel
  → TOP 5 categorias por oportunidade:
    1. dentist (82)       — 15% coberto, score médio 62
    2. medical_clinic (71) — 8% coberto, score médio 55
    3. lawyer (65)         — 5% coberto, score médio 48

Auto-Pilot: "São Bernardo (SP) → TOP categorias: dentist, lawyer, restaurant"
  → Discovery automático para as 3 categorias com maior gap
  → Pre-flight automático ($0, conta candidatos)
  → Se ROI positivo → executa L0

Pipeline: Funil POR categoria
  → dentist: 120 leads → 35 Raio-X → 5 S11-MK → 2 clientes
  → lawyer:  45 leads → 12 Raio-X → 1 S11-MK  → 0 clientes
  → "Investir mais em dentist: 2× mais conversão que lawyer"
```

---

## 6. Custo

| Recurso | Custo |
|---------|-------|
| Supabase queries | $0 (plano free) |
| Qdrant embed | $0 (localhost :8081) |
| Cálculos | $0 (TypeScript puro) |
| **Total** | **$0** |

---

## 7. Próximos Passos

- [x] ADR-0050 escrita
- [ ] Implementar `category-intel.ts`
- [ ] Criar `GET /api/category/intel`
- [ ] Integrar com Auto-Pilot (target-scorer.ts)
- [ ] Integrar com Pre-flight
- [ ] Admin UI: "📊 Category Market Intel" dashboard
- [ ] Wire no Pipeline (funil por categoria)
