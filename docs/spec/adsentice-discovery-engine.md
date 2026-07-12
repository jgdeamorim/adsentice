---
id: adsentice-discovery-engine
title: "Ads​entice Discovery Engine — Motor de Descoberta Parametrizável"
status: living
type: spec
version: "1.0.0"
date: 2026-07-14
owner: "Jeferson Galote de Amorim"
tags: [discovery, leads, gmb, filters, scoring, dataforseo]
---

# Adsentice Discovery Engine v1.0.0

> **Propósito:** Motor de descoberta de leads com filtros parametrizáveis sobre dados REAIS do Google Meu Negócio (DataForSEO MCP / EVO-API MCP). Não é nicho fixo — é máquina de encontrar DOR detectável em QUALQUER categoria e região.

---

## 1. ARQUITETURA DO MOTOR

```
┌────────────────────────────────────────────────────────────┐
│  INPUT                                                      │
│  {                                                          │
│    categories: ["clinica_estetica", "dentista", ...],       │
│    location: { bairro, cidade, estado, pais },              │
│    filters: { reviews_min, seo_max, photos_min, ... }       │
│  }                                                          │
├────────────────────────────────────────────────────────────┤
│  STAGE 0 · SELEÇÃO DE SEGMENTO ($0)                         │
│  Founder define: categorias, região, filtros de dor          │
├────────────────────────────────────────────────────────────┤
│  STAGE 1 · DESCOBERTA (~$0.01/lead)                         │
│  business_listings_search(categories, location)              │
│  → lista BRUTA de candidatos (~50-200)                       │
├────────────────────────────────────────────────────────────┤
│  STAGE 2 · ENRIQUECIMENTO (~$0.05/lead)                     │
│  Para CADA candidato com website:                            │
│    business_profile_gmb → perfil completo (27 campos)        │
│    on_page_lighthouse → SEO/Performance scores               │
│    domain_technologies → stack tech                          │
├────────────────────────────────────────────────────────────┤
│  STAGE 3 · SCORING DE DOR ($0)                               │
│  Aplica matriz de critérios → score 0-100                    │
│  Filtra leads abaixo do threshold                            │
│  Ranqueia por prioridade (urgente > quente > frio)           │
├────────────────────────────────────────────────────────────┤
│  OUTPUT: LEADSHEET                                          │
│  [{ business, score, dor_detectada, sinais, prioridade }]   │
└────────────────────────────────────────────────────────────┘
```

---

## 2. FILTROS DE DOR PARAMETRIZÁVEIS

### 2.1 Plataforma: Google Meu Negócio

| Critério | Campo DataForSEO | Threshold Padrão | Significado |
|----------|-----------------|-----------------|-------------|
| **Tem GMB** | `business_listings_search` retornou | `exists` | Presença digital detectável |
| **Ficha reivindicada** | `is_claimed` | `true` | Dono ativo (≠ abandonado) |
| **Negócio ativo** | `business_status` | `OPERATIONAL` | Não fechado/temporário |

### 2.2 Reviews & Reputação

| Critério | Campo | Threshold | Significado |
|----------|-------|-----------|-------------|
| **Reviews mínimas** | `rating_votes` | `> 2` | Tem histórico (não é novo) |
| **Reviews recentes** | `business_reviews_google` + `timestamp` | `> 2 nos últimos 90d` | Atividade recente |
| **Nota baixa** | `rating_value` | `< 4.0` | ⚠️ DOR — reputação ruim |
| **Reviews sem resposta** | `business_reviews_google` → `owner_answer == null` | `> 1` | ⚠️ DOR — dono não responde |
| **Distribuição ruim** | `rating_distribution` | `1★ + 2★ > 20%` | ⚠️ DOR — experiência inconsistente |

### 2.3 Website & SEO

| Critério | Campo | Threshold | Significado |
|----------|-------|-----------|-------------|
| **Tem website** | `website` != null | `exists` | Presença digital |
| **Performance ruim** | `on_page_lighthouse` → `performance_score` | `< 60` | ⚠️ DOR — site lento |
| **SEO técnico ruim** | `on_page_lighthouse` → `seo_score` | `< 70` | ⚠️ DOR — não otimizado |
| **CMS detectado** | `domain_technologies` | qualquer | Stack conhecida |
| **Sem analytics** | `domain_technologies` → `analytics[]` | `vazio` | ⚠️ DOR — não mede tráfego |

### 2.4 Conteúdo Visual

| Critério | Campo | Threshold | Significado |
|----------|-------|-----------|-------------|
| **Fotos no GMB** | `total_photos` | `> 3` | Perfil cuidado |
| **Imagem principal** | `main_image` != null | `exists` | Identidade visual |
| **Descrição** | `description` != null | `exists` | Dono preencheu perfil |

### 2.5 Contato & Comunicação

| Critério | Campo | Threshold | Significado |
|----------|-------|-----------|-------------|
| **Telefone** | `phone` != null | `exists` | Canal de contato |
| **É WhatsApp?** | `phone` + regex `^(\(?\d{2}\)?\s?9?\d{4}-?\d{4})$` | `formato BR celular` | Canal principal de venda |
| **Website funcional** | `website` + HTTP 200 | `online` | Site no ar |

### 2.6 Atividade & Engajamento

| Critério | Campo | Threshold | Significado |
|----------|-------|-----------|-------------|
| **Sem posts recentes** | `business_profile_gmb` (posts) | `> 30 dias` | ⚠️ DOR — GMB abandonado |
| **Horário de pico** | `popular_times` | `exists` | Movimento detectável |
| **Q&A não respondido** | `business_qa` | `perguntas sem resposta` | ⚠️ DOR — não engaja |

### 2.7 Competição

| Critério | Campo | Threshold | Significado |
|----------|-------|-----------|-------------|
| **Concorrentes no raio** | `domain_competitors` | `> 2` | Mercado competitivo |
| **Anuncia no Google?** | `serp_ads_search` | `NÃO` | ⚠️ DOR — não investe em ads |
| **Posição Google ruim** | `serp_organic` | `pos > 10 para keyword principal` | ⚠️ DOR — invisível |

---

## 3. MATRIZ DE SCORING

### 3.1 Dimensões e Pesos

| Dimensão | Peso | Critérios |
|----------|------|-----------|
| **Saúde Técnica** | 20% | SEO <60, Perf <50, sem analytics, CMS detectado |
| **Presença Local** | 20% | GMB ativo, fotos >3, descrição, posts recentes |
| **Reputação** | 20% | Rating, reviews recentes, respostas do dono, distribuição |
| **Engajamento** | 15% | WhatsApp, Q&A, popular_times, reviews respondidas |
| **Concorrência** | 15% | Concorrentes no raio, anuncia?, posição Google |
| **Maturidade Digital** | 10% | Website, CMS, analytics, stack tech |

### 3.2 Fórmula de Dor

```
DOR SCORE = Σ (critério atendido × peso da dimensão × 100)

EXEMPLO:
  - SEO <60%              → 1 × 0.20 × 100 = 20 pts
  - Reviews >2 sem resposta → 1 × 0.20 × 100 = 20 pts
  - Sem analytics           → 1 × 0.20 × 100 = 20 pts
  - Não anuncia             → 1 × 0.15 × 100 = 15 pts
  - WhatsApp detectado      → 1 × 0.15 × 100 = 15 pts
  ─────────────────────────────────────────────
  DOR SCORE = 90/100 (URGENTE — lead com múltiplas dores detectáveis)
```

### 3.3 Thresholds de Prioridade

| Score | Prioridade | Ação |
|-------|-----------|------|
| 80-100 | 🔴 URGENTE | Contato imediato — múltiplas dores críticas |
| 60-79 | 🟠 QUENTE | Contato em 48h — dor significativa |
| 40-59 | 🟡 MORNO | Nutrir — algumas dores, aguardar sinal |
| 0-39 | 🟢 FRIO | Baixa prioridade — monitorar |

---

## 4. FILTROS GEOGRÁFICOS HIERÁRQUICOS

```
Brasil (country_code: BR)
  └─ São Paulo (state)
       └─ São Paulo (city)
            ├─ Zona Sul
            │   ├─ Vila Mariana (district)
            │   ├─ Moema
            │   └─ Jardins
            ├─ Zona Oeste
            │   ├─ Pinheiros
            │   └─ Perdizes
            └─ Centro
                 ├─ Bela Vista
                 └─ Consolação
```

### 4.1 Mapeamento DataForSEO

| Nível | location_code | Exemplo |
|-------|--------------|---------|
| País | `2076` | Brasil |
| Estado | coordenadas + raio | SP (lat -23.5, lng -46.6, raio 200km) |
| Cidade | coordenadas + raio | São Paulo (raio 30km) |
| Bairro | coordenadas + raio | Pinheiros (raio 3km) |

O `business_listings_search` aceita `location_coordinate: "lat,lng,radius_km"`.

---

## 5. IMPLEMENTAÇÃO (pipeline.ts)

O pipeline `discoverLeads(params)` substitui o estágio "escolher nicho manualmente":

```typescript
interface DiscoveryParams {
  // Segmento
  categories: string[]          // ["clinica_estetica", "dentista"]
  
  // Localização
  location: {
    lat: number
    lng: number
    radiusKm: number
  }
  
  // Filtros de dor (todos opcionais, com defaults)
  filters: {
    // Reviews
    reviewsMin: number           // default: 2
    ratingMax: number            // default: 4.0 (lead com nota BAIXA)
    reviewsSemResposta: number   // default: 1
    reviewsRecentes90d: number   // default: 2
    
    // Website
    websiteObrigatorio: boolean  // default: true
    seoMax: number               // default: 70 (SEO abaixo disso = dor)
    perfMax: number              // default: 60
    
    // Contato
    whatsappDesejavel: boolean   // default: true
    
    // Conteúdo
    fotosMin: number             // default: 3
    postsInativoDias: number     // default: 30
    
    // Competição
    concorrentesMin: number      // default: 2
    naoAnuncia: boolean          // default: true
  }
  
  // Thresholds
  scoreMin: number               // default: 40 (MORNO+)
  maxResults: number             // default: 20
}
```

---

## 6. EXEMPLO DE USO

```typescript
// Founder quer descobrir leads em SP com dor detectável
const leads = await discoverLeads({
  categories: ["clinica_estetica", "dentista", "restaurante"],
  location: { lat: -23.5505, lng: -46.6333, radiusKm: 15 },
  filters: {
    reviewsMin: 3,
    ratingMax: 4.0,          // nota baixa = dor
    websiteObrigatorio: true,
    seoMax: 70,               // SEO ruim = dor
    reviewsSemResposta: 1,    // não responde = dor
    whatsappDesejavel: true,
    naoAnuncia: true          // não investe em ads = oportunidade
  },
  scoreMin: 40,
  maxResults: 25
})

// OUTPUT:
// [
//   { business: "Clínica Estética XPTO", score: 90, priority: "URGENTE",
//     dores: ["SEO 34/100", "3 reviews negativas sem resposta", "site WordPress lento", "não anuncia"] },
//   { business: "Dentista Sorriso SP", score: 72, priority: "QUENTE",
//     dores: ["GMB sem posts 6 meses", "não tem WhatsApp", "3 concorrentes no raio"] },
//   ...
// ]
```

---

## 7. ROADMAP

| Fase | O que | Dependência |
|------|-------|------------|
| **AGORA** | Spec + schema de filtros | — |
| **MVP** | `discoverLeads()` via EVO-API MCP `business_listings_search` | EVO-API :7700 online |
| **v0.2** | Enriquecimento automático (profile + lighthouse + reviews) para cada lead | `business_profile_gmb` 27 campos |
| **v0.3** | Scoring automático com matriz de dor | Pipeline L0→L5 |
| **v1.0** | Dashboard admin com filtros visuais (sliders de threshold, mapa de calor) | Materio UI |

---

*Especificação v1.0.0 · 2026-07-14 · Descoberta Parametrizável*
