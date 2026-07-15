---
id: adr-0022
title: Geo Intelligence Engine — Turf.js + H3 + Leaflet para Discovery Geoespacial
status: accepted
date: 2026-07-15
deciders: founder, claude
extends: [adr-0008, adr-0009, adr-0017]
references:
  - docs/spec/adsentice-discovery-engine.md
  - apps/web/src/lib/geo-data.ts (27 capitais IBGE 2024)
  - apps/web/src/lib/geo-resolver.ts (Nominatim reverse geocode)
  - apps/web/src/lib/market-intel.ts (densidade competitiva com área mágica)
  - apps/web/src/app/(dashboard)/(private)/admin/market/page.tsx
  - Turf.js (MIT) — https://turfjs.org
  - H3 (Apache 2.0) — https://h3geo.org
  - Leaflet + React-Leaflet (BSD) — https://leafletjs.com
  - Overpass API (ODbL) — https://overpass-turbo.eu
  - IBGE Censo 2022 — https://servicodados.ibge.gov.br/api/docs
---

# ADR-0022 · Geo Intelligence Engine — Turf.js + H3 + Leaflet

## Contexto

O adsentice Discovery Engine funciona com coordenadas (lat, lng) + raio (km), usando 27 capitais BR fixas (`geo-data.ts`). O sistema atual tem 3 gargalos:

### GAP 1 — Raio cobre só ~40% de megacidades

SP tem 11.4M habitantes e 1.521 km². O raio de 25km a partir da Sé cobre ~40% do município. Zona Sul extrema, Zona Leste, Guarulhos e ABC ficam fora de uma única busca. O usuário não pode escolher "Pinheiros", "Santana", "Itaquera" — só a capital inteira.

### GAP 2 — Densidade competitiva usa área fictícia

`market-intel.ts:152` calcula `densityPerKm2 = count / 100` (valor mágico). A área real de cobertura depende do raio, mas o raio não está salvo no `discovery_listings` nem é usado no cálculo.

### GAP 3 — Sem mapa, sem visualização geoespacial

A `/admin/market` mostra tabelas e barras, mas não responde visualmente "onde estão os concorrentes?", "qual a densidade por bairro?". A `/admin/discovery` é um seletor textual de capitais, não um mapa clicável.

### Oportunidade estratégica

Para SMB Brasil (clínicas, barbearias, petshops), a geolocalização **é** o produto. O dono da clínica quer saber: "tem dentista demais no meu bairro?" e "qual o raio ideal pra minha campanha?". Um motor de inteligência geoespacial responde isso com $0 em APIs externas usando ferramentas open source maduras.

## Referência externa

O usuário forneceu um benchmark de stack geo para Next.js + TypeScript, analisando 12 tecnologias (Leaflet, Mapbox, Turf.js, H3, Overpass, IBGE, Meta/Google Geo APIs, PostGIS, etc.). A análise completa está na conversa da sessão `seed-20260711160437` e serviu como insumo para esta ADR.

## Decisão

**Adotamos um Geo Intelligence Engine em 3 fases incrementais, começando com $0 em ferramentas open source:**

### Fase A — Agora: correção de geometria + mapa interativo

| Camada | Biblioteca | Licença | Função |
|--------|-----------|---------|--------|
| Geometria | `@turf/turf` | MIT | Raio real, área de cobertura, união de regiões, circle, booleanPointInPolygon, area |
| Mapa | `react-leaflet` + `leaflet` | BSD-2 | Mapa interativo no admin, desenho de raios/polígonos, clustering de listings |
| Tiles | OpenStreetMap | ODbL | Camada base gratuita, sem API key |

**Entregáveis imediatos:**

1. `@turf/turf` no `market-intel.ts` — substituir `areaKm2: 500` mágico por `turf.area(turf.circle(point, radiusKm))` real
2. `react-leaflet` no `/admin/discovery` — substituir dropdown de capitais por mapa clicável com raio visual
3. `react-leaflet` no `/admin/market` — mini-mapa mostrando densidade de listings por região

**Custo: $0. Tempo: 1-2 sessões.**

### Fase B — Expansão: megacidades com grade H3

| Camada | Biblioteca | Licença | Função |
|--------|-----------|---------|--------|
| Grade geoespacial | `h3-js` | Apache 2.0 | Divide SP (>2M) em hexágonos resolution 7-8 (5-1.5km² cada) |
| Demografia | IBGE API | Dados abertos | População, renda, idade, escolaridade por setor censitário |
| POIs | Overpass API | ODbL | Concorrentes reais por região (ex: todas clínicas num raio de 3km) |

**Gatilho:** quando SP for o foco de prospecção ativa (3+ categorias com dados).

**Custo: $0. Tempo: 2-3 sessões.**

### Fase C — Enterprise: campanhas geo-targeted

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| Banco geoespacial | PostgreSQL + PostGIS no Hetzner CAX11 | Queries espaciais nativas, índices GiST |
| Google Ads API | `google-ads-api` | Radius Targeting + Postal Code + City |
| Meta Ads | Meta Marketing API | Públicos por geolocalização, raio de campanha |

**Gatilho:** cliente pagante no plano Escala (R$997/mês).

## Arquitetura proposta

```
/apps/web/src/lib/geo/
├── index.ts            # barrel export (Fase A)
├── geometry.ts         # turf.circle, turf.area, pointInPolygon (Fase A)
├── resolution.ts       # H3 hexágonos para megacidades (Fase B)
├── demographics.ts     # IBGE via API pública (Fase B)
├── pois.ts             # Overpass API → concorrentes reais (Fase B)
└── campaign-radius.ts  # Raio ideal com base em concorrência + persona (Fase C)

/apps/web/src/components/
├── DiscoveryMap.tsx    # leaflet + React-Leaflet, clicável (Fase A)
├── MarketDensityMap.tsx # mini-mapa de densidade (Fase A)
├── CitySelector.tsx    # wrapper: Leaflet map + chip fallback
└── H3Grid.tsx          # visualização de hexágonos (Fase B)
```

### Fluxo de dados

```
Usuário clica no mapa (lat,lng)
  │
  ▼
geometry.ts: turf.circle([lng,lat], radiusKm)
  │
  ├─► DataForSEO: business_listings_search com location_coordinate real
  │
  ▼ (Fase B)
resolution.ts: h3.geoToH3(lat, lng, 7) → hexágono
  │
  ├─► IBGE: população/renda do setor censitário
  ├─► Overpass: POIs concorrentes no hexágono
  │
  ▼
market-intel.ts: densityPerKm2 = count / turf.area(geometry)  ← REAL
```

## Por que NÃO usar X

### Mapbox GL / Google Maps ($)
Excelentes visualmente, mas custam por tile view. Leaflet + OSM cobre 100% do MVP com $0 e tiles ilimitados. Migrar depois é trivial — React-Leaflet e Mapbox GL têm APIs similares.

### Precisely / Esri / HERE
Soluções corporativas, caras, overkill para SMB Brasil. O IBGE fornece dados demográficos públicos equivalentes.

### PostGIS agora
Exige migração Hetzner (ADR-0016) + Docker PostGIS. A Fase A+B roda 100% client-side/browser com Turf.js. Só migrar quando tivermos volume que justifique queries espaciais server-side.

### Meta Ads API para "raio automático"
A Meta não expõe endpoint de recomendação de raio. O raio é input, não output. Nossa recomendação será heurística (Turf + H3 + IBGE), não via API da Meta.

## Consequências

### Positivas
- Corrige densidade competitiva (área real, não mágica)
- Substitui seletor textual de capitais por mapa clicável
- Expansão gradual: começa com $0, escala com cliente pagante
- Stack madura: Turf.js (10K+ estrelas), Leaflet (40K+), H3 (4.8K+)
- Zero dependência de APIs pagas nas Fases A e B

### Riscos
- Overpass API tem rate limit (1 req/s) — usar cache Redis
- IBGE API pode ter latência — cache por setor censitário no Supabase
- Leaflet em RSC (React Server Components) requer `"use client"` — componente isolado
- Bundle size: Turf.js completo é ~500KB. Usar imports seletivos (`@turf/circle`, `@turf/area`)

## Status

**Accepted** — 2026-07-15. Fase A começa na próxima sessão.
