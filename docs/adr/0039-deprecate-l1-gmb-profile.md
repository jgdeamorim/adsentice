# ADR-0039 · Deprecate L1 GMB Profile — L0 supersede

**Status:** PROPOSED  
**Date:** 2026-07-19  
**Author:** jeffer + Claude Opus 4.8  
**Supersedes:** ADR-0008 (L1 section), ADR-0024 (L1 section)

---

## Contexto

O pipeline de enriquecimento do adsentice foi desenhado com 5 camadas:

```
L0 → business_listings/search/live    (descoberta por localização)
L1 → my_business_info/live            (perfil detalhado por nome)
L2 → on_page_instant_pages + domain_technologies (website+SEO)
L3 → content_parsing/live             (social media + contatos do site)
L4 → IBGE panorama                    (contexto de mercado)
```

A premissa original (ADR-0008, 2026-07-13) era que L0 retornava 11 campos básicos e L1 enriquecia com 27 campos canônicos (phone, website, fotos, descrição, etc.).

**Essa premissa era falsa.** O L0 (`business_listings/search/live`) sempre retornou 37 campos — o adapter é que mapeava só 18. Desde os fixes v104 (phone), v113 (total_photos+description), v114+v115 (37/37 campos), o L0 entrega **tudo que o L1 entrega, exceto 2 campos**.

---

## Auditoria completa

### 1. Comparação de endpoints DataForSEO

| Dimensão | L0 (business_listings/search) | L1 (my_business_info) |
|----------|:--:|:--:|
| Mecanismo | SEARCH por localização+categoria | LOOKUP por keyword (nome exato) |
| Custo por 100 leads | $0.048 | $0.0054 (batch 100) |
| Precisa de nome exato | NÃO | SIM — e FALHA com títulos longos |
| Match rate real (nosso sistema) | 100% | **0%** (0/50 — títulos 100+ chars) |
| Total campos retornados | **35** | **20** |
| phone | ✅ | ✅ |
| website | ✅ | ✅ |
| total_photos | ✅ | ✅ |
| description | ✅ | ✅ |
| main_image | ✅ | ✅ |
| rating + votes | ✅ | ✅ |
| is_claimed | ✅ | ✅ |
| city/district/zip/country | ✅ | ✅ |
| work_time | ✅ | ❌ |
| popular_times | ✅ | ❌ |
| first_seen/last_updated | ✅ | ❌ |
| people_also_search | ✅ | ❌ |
| place_topics | ✅ | ❌ |
| rating_distribution | ✅ | ❌ |
| attributes/services | ✅ | ❌ |
| logo | ✅ | ❌ |
| snippet | ✅ | ❌ |
| contact_info | ✅ | ❌ |
| additional_categories/category_ids | ✅ | ❌ |
| local_business_links | ✅ | ❌ |
| **price_level** | ❌ | ✅ (ÚNICO diferencial real) |
| **types** | ❌ | ✅ (ÚNICO diferencial real) |

**Conclusão:** L0 tem 35 campos vs 20 do L1. Dos 20 do L1, 18 já vêm no L0. Os 2 campos exclusivos do L1 (`price_level`, `types`) têm baixo valor de negócio — não justificam $0.0054/lead.

### 2. Estado real do banco de dados (Supabase, 2026-07-19)

```
Total discovery_listings: 8,626

┌──────────┬──────────┬──────────────┬───────────────┐
│  Nível   │  Total   │  Com Phone   │  Com Website  │
├──────────┼──────────┼──────────────┼───────────────┤
│  L0      │  4,943   │      0 (0%)  │      0 (0%)   │  ← pre-flights (sem persistência)
│  L1      │  3,597   │  1,370 (38%) │  2,679 (74%)  │  ← L0 completo (auto-level=1)
│  L2      │     86   │      0 (0%)  │     86 (100%) │
│  L3      │      0   │      0       │      0        │
└──────────┴──────────┴──────────────┴───────────────┘
```

**Fato crítico:** Nenhum dos 3,597 listings com `enrichment_level=1` foi realmente enriquecido pelo L1. O `enrichment_level` é auto-computado pelo `discovery-persistence.ts:117`:

```typescript
enrichment_level: (l as any).enrichment_level 
  ?? ((l as any).l2_onpage_score ? 2 
    : (l as any).website || (l as any).phone || (l as any).total_photos ? 1 
    : 0)
```

Ou seja: se o L0 retornar phone OU website OU fotos → já vira level 1. O campo `enrichment_level` **mente** — diz "L1 GMB" mas é L0 puro.

Todos os 1,370 phones e 2,679 websites no banco vieram do **L0** (adapter v104+), não do L1.

### 3. Inventário de colunas — auditoria completa do banco (88 colunas)

Auditoria exaustiva de todas as 18 migrations. A tabela `discovery_listings` tem **88 colunas** no total.

#### 3.1 Distribuição por camada de origem

| Camada | Colunas | Migrations | Inclui |
|--------|:-------:|------------|--------|
| L0 core | 11 | 001 | title, category, address, rating, place_id, coords, is_claimed |
| L0 extended 1/2 | 11 | 017 | main_image, rating_distribution, snippet, check_url, work_time, first_seen, last_updated, domain, people_also_search, attributes, logo |
| L0 extended 2/2 | 11 | 018 | additional_categories, category_ids, contact_info, feature_id, hotel_rating, local_business_links, original_title, place_topics, popular_times, services, source_type |
| **L0 total** | **33** | 001+017+018 | |
| L1 GMB | 12 | 001 | website, phone, total_photos, description, business_status, categories_arr, price_level, city, district, postal_code, country_code, contact_methods |
| L2 Website+SEO | 24 | 002+003+007 | onpage (8), domain tech (5), lighthouse (5), meta (2), content gap (2), contacts (2) |
| L3 Social | 3 | 010 | l3_emails, l3_social_links, l3_whatsapp |
| L4 IBGE | 4 | 010 | l4_ibge_populacao, l4_ibge_pib_per_capita, l4_ibge_densidade, l4_ibge_renda_media |
| CNPJ | 3 | 012 | cnpj_enriched, cnpj_raw, cnpj_data |
| Computed/System | 9 | 001 | id, search_id, scores (4), schwartz (2), signals, enrichment_level, created_at |
| **TOTAL** | **88** | | |

#### 3.2 As 12 colunas L1 — quantas são REALMENTE exclusivas? (CORRIGIDO por teste live)

Teste live 2026-07-19 (`tools/audit_l0_fields.py`, $0.0131, dentist Vitória ES) contra API DataForSEO real. **Correções do teste:**

| Coluna L1 | Quem também fornece? | Realmente exclusiva do L1? |
|-----------|---------------------|:--:|
| `website` | L0 (`item.url`) | ❌ Redundante |
| `phone` | L0 (`item.phone`) — v104 | ❌ Redundante |
| `total_photos` | L0 (`item.total_photos`) — v113 | ❌ Redundante |
| `description` | L0 (`item.description`) — v113 | ❌ Redundante |
| `city` | L0 (`address_info.city`) | ❌ Redundante |
| `district` | L0 (`address_info.borough`) | ❌ Redundante |
| `business_status` | — | ✅ **L1-only** (NÃO está no JSON L0 — confirmado live) |
| `categories_arr` | L0 (`item.category_ids`) — v114 | ❌ Redundante |
| `postal_code` | L0 (`address_info.zip`) — **v119** | ❌ Redundante (antes não mapeado!) |
| `country_code` | L0 (`address_info.country_code`) — **v119** | ❌ Redundante (antes não mapeado!) |
| `contact_methods` | COMPUTED (`detectContactMethods()`) | ❌ Computado, não da API |
| `price_level` | **L0 top-level key** (`item.price_level`) — **confirmado live!** | ❌ Redundante (antes pensávamos ser L1-only!) |

**Correção crítica do teste live:** `price_level` é uma top-level key no JSON do L0 (valor `null` na amostra, mas a key existe). Estava rotulado errado como "L1-only" na ADR-0039 original e na migration 001. O adapter v119 agora mapeia `item.price_level`.

**Único campo genuinamente L1-only:** `business_status` (OPERATIONAL, CLOSED, etc.) — não está no JSON de resposta do L0.

**Resultado:** Das 12 colunas "L1", **10 já vêm do L0**, 1 é computada, e **apenas 1** (`business_status`) depende genuinamente do L1. Todos os campos de contato e mídia que importam (phone, website, fotos, descrição, price_level) vêm do L0.

**O número "27 campos canônicos"** no comentário da migration 001 e nas ADRs 0008/0024 **é falso** — incluía campos base do L0 (title, category, address, rating, etc.) que nunca dependeram do L1.

#### 3.3 Índices — nenhum em colunas L1

Dos 8 índices em `discovery_listings`, **zero** indexam colunas L1-exclusivas. O índice `enrichment_level` (migration 002) é o único relacionado — e continuará útil com a nova semântica.

#### 3.4 Views e RPCs afetadas

| Objeto | Migration | Uso de enrichment_level | Impacto da deprecação |
|--------|-----------|------------------------|----------------------|
| `category_analytics` (VIEW) | 001 | `DISTINCT ON ... ORDER BY enrichment_level DESC` | Nenhum — continua funcionando |
| `get_score_distribution()` | 001/005 | `enrichment_level DESC` p/ dedup | Nenhum |
| `market_overview(cat, city)` | 005 | Filtro `enrichment_level >= 1` | Nenhum — semântica mantida |
| `count_unique_places(cat, city)` | 016 | Sem filtro de enrichment | Nenhum |

### 4. Impacto em código — inventário completo (dupla auditoria)

Dois agents fizeram varredura independente. Resultado consolidado:

#### 4.1 Três implementações de adapter L1 (só 1 ativa)

| Arquivo | Status | Função |
|---------|--------|--------|
| `provider-core-adapter.ts` | **ATIVO** — usado pelo pipeline | `businessProfileGmb()`, `businessProfileGmbBatch()` |
| `evo-mcp.ts:355-427` | Legacy MCP | `businessProfileGmb()` — via MCP tools/call |
| `dataforseo.ts:254-300` | Legacy standalone | `businessProfileSearch()` — implementação alternativa |

**Nenhum dos 3 adapters L1 enriqueceu um único lead real** — match rate 0%.

#### 4.2 Arquivos que contêm lógica L1 (a remover/deprecar)

| Arquivo | Linhas | Função L1 | Ação |
|---------|--------|-----------|------|
| `provider-core-adapter.ts` | 198-242 | `businessProfileGmb()` — chamada individual | Deprecar (manter export p/ compat, marcar `@deprecated`) |
| `provider-core-adapter.ts` | 245-315 | `businessProfileGmbBatch()` — batch 100 keywords | Deprecar |
| `provider-core-adapter.ts` | 64-73 | `GMBProfile` interface | Deprecar |
| `discovery-search/route.ts` | 29-99 | `enrichTopLeads()` — pipeline L1 | Remover chamada, manter função como no-op p/ compat |
| `discovery-search/route.ts` | 12 | Import `businessProfileGmb, businessProfileGmbBatch` | Remover do import |

#### 4.3 Arquivos com referência visual/informativa a L1 (a atualizar)

| Arquivo | Linha(s) | Ocorrência | Ação |
|---------|----------|------------|------|
| `discovery/page.tsx` | 170, 183 | L1 enriched fields comment, `enrichment_level` type | Atualizar comentário |
| `discovery/page.tsx` | 313-315, 349-350, 363-364, 393, 506 | Default layer state, custo, preflight | Remover L1 do cálculo |
| `discovery/page.tsx` | 1162-1180 | Toggle chip L1 com custo | Remover toggle |
| `discovery/page.tsx` | 1298, 1320 | pipelinePhase "l1", mensagem status | Remover fase |
| `discovery/page.tsx` | 1564-1565, 1587-1588 | Cost summary + total inclui L1 | Remover linha |
| `discovery/page.tsx` | 1758 | Loading text "L0+L1+L4" | Atualizar texto |
| `discovery/page.tsx` | 1813-1814, 1859, 1902-1926 | L1 badge, modal "L1 Enriquecido", seção contato | Renomear labels |
| `LeadTable.tsx` | 114-115 | Chip color `enrichment_level >= 1 ? success` | Manter — semântica igual |
| `LeadTable.tsx` | 133-138, 184-186 | Chip "🔬 L1 Enriquecido (27 campos)", seção "📞 Contato (L1)" | Renomear labels |
| `pipeline/page.tsx` | 40-55, 72-74, 126 | enrichment counts, S1 descrição, CardStatVertical | Atualizar labels |
| `costs/page.tsx` | 69, 133-134, 240, 263 | L1 cost tracking, supabase count, cap display | Atualizar/remover |
| `settings/page.tsx` | 176, 223 | L1 cost labels | Atualizar labels |
| `categories/page.tsx` | 97, 112-113, 246 | enrichment_level query, dedup, CardStatVertical | Manter lógica, atualizar label |
| `leads/page.tsx` | 28 | `enrichment_level` type | Sem alteração |
| `market/page.tsx` | 131 | `L1 ${l1Count}` no subtítulo | Atualizar label |
| `leads/[id]/page.tsx` | 260 | Pipeline flow display "business_listings_search → business_profile_gmb" | Atualizar texto |
| `criteria/page.tsx` | 24 | Type union `'L0' \| 'L1' \| 'L2' \| 'L3'` | Remover 'L1' do union |
| `DiscoveryAutoPilot.tsx` | 87 | Label "Pipeline: L0→L1→L2→L3" | Atualizar texto |

#### 4.4 Libs e packages com dependência L1

| Arquivo | Impacto | Ação |
|---------|---------|------|
| `scoring.ts:682-742` | `detectContactMethods()` e `contactStrategy()` — usam `input.phone`, `input.website` | **Sem alteração** — campos vêm do L0 agora |
| `market-intel.ts:167,185,220-222,432-434` | Dedup + count por `enrichment_level` | **Sem alteração** — campo continua |
| `warp-composer.ts:363,393,1299-1306` | `enrichment_level` em lead type + cache | **Sem alteração** — campo continua |
| `packages/provider-core/src/tools/business-profile-gmb.ts` | Tool L1 standalone | Marcar `@deprecated` |
| `packages/provider-core/src/shapes/business-data.ts:12,53-89` | EP constant + `ProfileGmbItem` | Marcar `@deprecated` |
| `packages/provider-core/src/types.ts:71-95` | `GMBProfile` interface | Marcar `@deprecated` |
| `packages/provider-core/src/index.ts:25-27` | Barrel export L1 | Adicionar `@deprecated` comment |
| `packages/provider-core/cost-registry.yaml:18-19` | Cost entry `business.profile.gmb` | Marcar `@deprecated`, manter valor |
| `packages/vault/src/gmb/translate.ts:1-53` | `GmbProfile` rich (39 campos) | **Manter** — vault é cofre histórico, não pipeline |

#### 4.3 Migrations e schema

| Migration | Impacto | Ação |
|-----------|---------|------|
| 001_discovery_tables.sql | Comentário "L1 enrichment fields (27 canonical GMB fields)" na linha 45 e colunas `price_level`, `types` | **NÃO alterar migration** (imutável). Criar migration 019 com `COMMENT ON COLUMN` atualizado |
| 002_l2_website_enrichment.sql | Comentário "0=L0 only, 1=L1 GMB, 2=L2 Website+SEO" na linha 34 | Idem — migration 019 atualiza COMMENT |
| 010_enrichment_l3_l4.sql | Colunas L3/L4 — sem referência a L1 | Sem alteração |

#### 4.5 ADRs e docs afetados

| Documento | Seções L1 | Ação |
|-----------|-----------|------|
| ADR-0008 | §§ L1 ($0.0054/lead, 27 campos, pipeline) | Marcar seções como SUPERSEDED |
| ADR-0024 | §§ L1 (tabela de camadas, custos, fluxo) | Marcar seções como SUPERSEDED |
| ADR-0009 | Ref "27 campos GMB", L1/L2 failure bias | Nota de deprecação |
| ADR-0028 | L1 Profile 36% no pipeline progress | Atualizar percentuais |
| ADR-0030 | Ref L1 batch, L1 contact methods, L1 WhatsApp | Atualizar referências |
| `base-matriz-adsentice.md` | `ADS.CAP.dataforseo.profile_gmb`, `ADS.PRD.enrich.l1_website` | Atualizar no próximo sync |
| `adsentice-GMB-solution-engine-v0.md` | Ref my_business_info, 66 campos | Nota de deprecação |
| `adsentice-enrichment-layers.md` | Anatomia 27 campos GMB, L1 como camada | Nota de deprecação |
| `adsentice-discovery-guia-operacional.md` | Matriz L0+L1, restrição L1, custos | Atualizar guia |
| `fases-provider-core-dataforseo.md` | S1 · Perfilado, L1 completo | Atualizar fase |
| `adsentice-lead-enrichment-capabilities.md` | CAMADA L1 — PERFIL COMPLETO | Marcar como DEPRECATED |
| `auditoria-evo-api-capabilities-adsentice.md` | L1 capability audit entry | Atualizar status |
| `adsentice-MANAGER-metamodelo-v0.md` | `plugin: dataforseo.my_business_info` | Nota de deprecação |
| `adsentice-infrastructure-architecture.md` | 30+ colunas L0/L1/L2, custo L1 | Atualizar diagrama |

#### 4.6 Achados arquiteturais da auditoria de código

1. **Colisão de nomes "L1":** Existe um "L1 enrichment layer" (GMB profile) e um "L1 cache tier" (memory LRU em `warp/src/7-cache.ts`, `warp/src/composer-core.ts`). São conceitos completamente diferentes que compartilham o label "L1". A deprecação do L1 enrichment **não afeta** o L1 cache.

2. **`enrichment_level` é coluna compartilhada:** O campo é um contador progressivo (0=L0, 1=L1, 2=L2, 3=L3) usado por TODAS as camadas. Remover o L1 **não remove a coluna** — só muda o que o valor `1` significa.

3. **Espec conflitante:** O doc `adsentice-enrichment-layers.md` redefine L1 como "WEBSITE LIGHTHOUSE" ($0.0001/lead), diferente do código onde L1 = GMB profile ($0.0054). Isso cria ambiguidade — a spec e o código usam o mesmo label para coisas diferentes.

4. **Custo multiplicador:** O `l1Cost` no discovery page é multiplicado por `batchEffective` (número de municípios). Em modo RM/estado com 50 municípios, L1 pode chegar a $13.50 — dinheiro queimado com 0% de match.

5. **Três adapters, zero resultados:** Existem 3 implementações diferentes de L1 (provider-core-adapter ativo, evo-mcp legacy, dataforseo legacy). Nenhuma delas enriqueceu um único lead real — match rate 0% em todas.

6. **O vault NÃO é afetado:** `packages/vault/src/gmb/translate.ts` tem um `GmbProfile` de 39 campos que é um cofre histórico (R2 blob). Este continua existindo independentemente do pipeline — é dado bruto, não enriquecimento.

7. **Auditoria L0 live 2026-07-19** (`tools/audit_l0_fields.py`, $0.0131): 46 campos auditados cruzando API real → adapter → persistence → DB. Bugs encontrados: (a) `cid` mapeado no adapter mas NÃO persistido — corrigido no persistence v119, (b) `address_info.region`, `address_info.zip`, `address_info.country_code`, `price_level` — mapeados no adapter v119, (c) migration 019 adiciona colunas `cid` + `region` e corrige COMMENTs.

#### 4.7 Análise de Re-Enrich L0

**Estado atual:** O modo re-enrich (`discovery-search/route.ts`, layers.l0=false) suporta apenas L2, L3, L4. L0 re-enrich NÃO existe.

**Oportunidade:** 7,170 listings no banco têm dados L0 incompletos:

| Grupo | Count | Problema |
|-------|:-----:|----------|
| Pre-flight (L0) | 4,943 | Zero dados de contato — phone, website, fotos, descrição, tudo null |
| L1 sem phone | 2,227 | Capturados antes do fix v104 (adapter descartava phone) |
| L1 sem main_image | 3,498 | Capturados antes do fix v114 |
| L1 sem first_seen | 3,498 | Capturados antes do fix v114 |
| L1 sem work_time | 3,530 | Capturados antes do fix v114 |

**Como implementar L0 re-enrich:**

1. Re-executar `businessListingsSearch()` com mesmas categorias + coordenadas da busca original
2. Cruzar resultados por `place_id` — MATCH sem ambiguidade
3. PATCH nos listings existentes (via `id`) com campos L0 novos/atualizados
4. Só PATCH campos que estavam null (não sobrescrever dados bons com null da API)

**Custo estimado:**
- 1 página (limit=100): $0.048 por município
- Pre-flight NÃO tem coordenadas do search original — usar centro da cidade via IBGE
- Re-enrich completo de 4,943 pre-flights + 2,227 sem phone: ~$0.048 × 50 municípios ≈ $2.40
- **Custo total estimado: ~$5-10 para backfill completo**

**Arquitetura:** Igual ao re-enrich L2/L3 existente — nova função `enrichTopLeadsL0()` no route, mesmo padrão de PATCH por `id`.

**Prioridade:** Média. Os dados faltantes não bloqueiam nenhuma feature. Pode ser executado sob demanda por município.

#### 4.8 Interfaces TypeScript — sem breaking changes

| Interface | Arquivo | Uso | Impacto |
|-----------|---------|-----|---------|
| `GMBProfile` | `provider-core-adapter.ts:64` | Tipo de retorno L1 | Deprecar, manter export |
| `GMBProfile` | `dataforseo.ts:237` | Legacy | Sem alteração (fora de uso) |
| `GMBListing` | `provider-core-adapter.ts:62` | Alias de BusinessListing | Sem alteração (usado por persistence) |
| `GMBListing` | `evo-mcp.ts:50` | Legacy | Sem alteração (fora de uso) |
| `LeadRow.enrichment_level` | `LeadTable.tsx:32`, `leads/page.tsx:28`, `discovery/page.tsx:183` | Display condicional | Sem alteração — campo continua existindo |

---

## Decisão

**Deprecar L1 (`my_business_info/live`) como camada de enriquecimento do pipeline Discovery.**

A semântica do `enrichment_level` passa a ser:

| Nível | Significado atual | Novo significado |
|-------|-------------------|------------------|
| 0 | L0 apenas | L0 pre-flight (sem dados de contato) |
| 1 | L1 GMB | L0 completo (com phone OU website OU fotos) |
| 2 | L2 Website+SEO | L2 Website+SEO (igual) |
| 3 | L3 Social | L3 Social (igual) |
| 4 | L4 IBGE | L4 IBGE (igual) |

**O campo `enrichment_level` NÃO muda de tipo ou valores — só muda o que cada nível significa.**

### Razões

1. **Redundância de dados:** L0 entrega 35 campos, L1 entrega 20. Overlap de 18 campos (90% dos campos do L1 já vêm no L0).

2. **Match rate 0%:** O L1 usa keyword (nome do negócio) como chave de busca. Títulos GMB no Brasil têm 80-150 caracteres (nome + especialidades + endereço). A API `my_business_info` não encontra correspondência com esses títulos — 0/50 match rate comprovado.

3. **Custo sem retorno:** $0.0054/batch queimado sem enriquecer nenhum lead real.

4. **2 campos não justificam:** `price_level` (1-4 $$$) e `types` (array) são os únicos dados que o L1 traria e o L0 não tem. Nenhum dos dois foi solicitado por usuários ou usado em lógica de scoring.

5. **Simplificação do pipeline:** Remover L1 reduz 1 chamada HTTP, 1 fase de pipeline, 1 toggle na UI, e ~70 linhas de código de merge.

### O que NÃO muda

- `enrichment_level` continua como coluna INTEGER — só a semântica dos níveis se ajusta. O campo é um contador progressivo **compartilhado por todas as camadas** (0=L0, 1=L1, 2=L2, 3=L3). Remover o significado de L1 não quebra queries, índices, views ou RPCs que usam `enrichment_level >= 1`.
- `price_level`, `business_status`, `categories_arr`, `postal_code`, `country_code`, `contact_methods` continuam como colunas (migration 001) — serão populadas apenas se encontrarmos fonte alternativa (algumas já vêm do L0 v115)
- `GMBProfile`, `GMBListing`, `businessProfileGmb()`, `businessProfileGmbBatch()` são marcados `@deprecated` mas mantidos no código (sem breaking change). Os 3 adapters (provider-core, evo-mcp, dataforseo) continuam exportando.
- `LeadTable`, `pipeline/page`, `categories/page`, `costs/page`, `discovery/page` — **ZERO alterações de lógica**, apenas atualização de labels/cópias. O chip `enrichment_level >= 1 ? 'success' : 'default'` continua funcionando.
- `detectContactMethods()` e `contactStrategy()` em `scoring.ts` — continuam iguais. Os inputs (`phone`, `website`) agora vêm do L0, não do L1.
- **L1 cache tier** (memory LRU em `warp/src/7-cache.ts`) — NÃO é afetado. É um conceito diferente do L1 enrichment layer.
- **Vault** (`packages/vault/src/gmb/translate.ts`) — NÃO é afetado. O `GmbProfile` de 39 campos é cofre histórico, não pipeline.

### Correções já aplicadas (v119, 2026-07-19)

Baseado no teste live contra API DataForSEO (`tools/audit_l0_fields.py`, $0.0131):

| Fix | Arquivo | Mudança |
|-----|---------|---------|
| `cid` → persistence | `discovery-persistence.ts` | +1 linha — salva Google CID |
| `region` → adapter + persistence | `provider-core-adapter.ts` + `discovery-persistence.ts` | +1 linha cada — `address_info.region` |
| `postal_code` → adapter | `provider-core-adapter.ts` | `address_info.zip` (antes só vinha do L1) |
| `country_code` → adapter | `provider-core-adapter.ts` | `address_info.country_code` (antes só vinha do L1) |
| `price_level` → adapter | `provider-core-adapter.ts` | Top-level key no L0 (antes só vinha do L1) |
| Migration 019 | `packages/db/supabase/migrations/` | Colunas `cid` + `region`, COMMENTs corrigidos |

---

## Plano de implementação

### Fase 1 · Labels e docs (0 risco, 0 código de lógica)

1. Atualizar labels na UI: "L1 · Perfilados" → "L0+ · Contatos", "🔬 L1 Enriquecido" → "📡 L0+ Completo"
2. Remover toggle L1 do discovery page (ou mantê-lo desabilitado com tooltip "L0 já inclui estes dados")
3. Criar migration 019 com `COMMENT ON COLUMN enrichment_level` atualizado
4. Atualizar ADR-0008 e ADR-0024 com nota de deprecação
5. Escrever esta ADR-0039

### Fase 2 · Código (baixo risco, additive only)

6. Marcar `businessProfileGmb()`, `businessProfileGmbBatch()`, `GMBProfile` como `@deprecated` no adapter
7. Remover chamada L1 do `discovery-search/route.ts` (manter `enrichTopLeads` como no-op ou remover do pipeline)
8. Atualizar `enrichment_level` auto-compute no `discovery-persistence.ts` — mudar comentário, lógica igual
9. Atualizar cost tracking (remover L1 dos caps)
10. `base-matriz-adsentice.md` sync

### Fase 3 · Limpeza (opcional, futuro distante)

11. Remover `businessProfileGmb` e `businessProfileGmbBatch` do adapter
12. Remover `GMBProfile` interface
13. Remover `price_level` e `types` das migrations (via nova migration — NUNCA editar migrations existentes)

---

## Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|-------|:--:|-----------|
| Dado do L1 era útil em algum edge case | Baixa | Manter funções no adapter marcadas `@deprecated` — se surgir caso de uso, reativar com `place_id` em vez de keyword |
| `price_level` faz falta no scoring | Baixa | Scoring atual não usa price_level. Se precisar, buscar fonte alternativa (L0 `attributes` já tem indícios) |
| Quebra de UI em páginas que referenciam L1 | Nenhuma | Só mudamos labels, não lógica. `enrichment_level >= 1` continua funcionando igual |
| Confusão com "L1 cache tier" | Baixa | Documentar claramente: L1 enrichment != L1 cache (memory LRU). São namespaces diferentes |
| Espec `adsentice-enrichment-layers.md` redefine L1 como Website Lighthouse | Média | O doc já conflita com o código. A deprecação força resolver essa ambiguidade |

---

## Alternativas consideradas

### A) Corrigir o match rate do L1 (truncar títulos)

Truncar o título no primeiro separador (`-`, `|`, `·`) antes de enviar como keyword. Custo: $0.0054/batch com chance de match parcial. **Rejeitado:** mesmo com match 100%, os dados seriam redundantes com L0.

### B) Usar `place_id` como chave no L1

A API `my_business_info` **não aceita** `place_id` — apenas `keyword`. Confirmado via teste live e documentação DataForSEO.

### C) Manter L1 e ignorar o problema

Acumular dívida técnica e custo desnecessário. **Rejeitado:** viola `medido=verdade`.

---

## Métricas pós-deprecação

| Métrica | Antes | Depois |
|---------|-------|--------|
| Custo por Discovery (50 leads, 1 município) | $0.048 (L0) + $0.0054 (L1) = $0.0534 | $0.048 (L0) |
| Custo por Discovery multi-município (50 mun.) | $0.048 + $0.27 (L1 batch) = $0.318 | $0.048 — **economia de 85% em RM** |
| Campos por lead | 37 (L0) + potencialmente 2 via L1 | 37 (L0) — sem perda |
| Chamadas HTTP no pipeline | L0 + L1 batch + L2 + L3 | L0 + L2 + L3 |
| Linhas de código L1 | ~200 (3 adapters + route + types) | ~30 (@deprecated stubs) |
| Match rate de enriquecimento real | 0% (L1 via keyword) | 100% (L0 direto) |
| Arquivos tocados (Fase 1+2) | — | ~25 arquivos (labels + docs + código) |
| Colunas "L1" que continuam sendo populadas | 6 de 12 | 11 de 12 (todas exceto `price_level`) |

## Fontes da auditoria (medido=verdade)

- **Supabase REST API** — query direta em `discovery_listings` (8,626 rows, 2026-07-19)
- **18 migration files** — `packages/db/supabase/migrations/001-018.sql`
- **provider-core-adapter.ts** — 600 linhas, 10 funções exportadas, 9 endpoints DataForSEO
- **discovery-search/route.ts** — 942 linhas, pipeline L0-L4 completo
- **Agent code audit** — 71 tool uses, 22 áreas de impacto, 43+ arquivos analisados
- **Agent DB audit** — 40 tool uses, 88 colunas classificadas, 8 índices, 5 views/RPCs
- **discovery/page.tsx** — 2000+ linhas, UI do pipeline com toggle L1
- **Custo real DataForSEO** — $0.0054/POST confirmado via curl live (não hardcoded)
- **Match rate real** — 0/50 confirmado (títulos GMB 80-150 chars vs API keyword lookup)
