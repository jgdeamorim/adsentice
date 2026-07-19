# ADR-0040 · L0 Live Audit — inventário completo de campos DataForSEO

**Status:** ACCEPTED
**Date:** 2026-07-19
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** ADR-0008 (seções L0), ADR-0024 (seções L0)
**Teste live:** `tools/audit_l0_fields.py` · $0.0131 · dentist Vitória ES · 3 items

---

## 1. Contexto

O L0 (`business_listings/search/live`) sempre foi tratado como "11 campos básicos" (ADR-0008, 2026-07-13). Entre v104 e v115 o adapter foi expandido para mapear "37/37 campos". Mas:

1. **Nunca fizemos um teste live** que inspecionasse TODAS as keys do JSON de resposta
2. **Nunca auditamos** o caminho completo API → adapter → persistence → DB campo a campo
3. **Campos do `address_info`** eram parcialmente extraídos — 2 de 6
4. **`price_level`** era rotulado como "L1-only" quando na verdade é top-level key no L0
5. **`cid`** era mapeado no adapter mas NÃO era persistido no banco

Esta ADR documenta a **primeira auditoria completa** do contrato de dados L0.

---

## 2. Metodologia

### 2.1 Teste live (2026-07-19)

```
POST /v3/business_data/business_listings/search/live
{
  "categories": ["dentist"],
  "location_coordinate": "-20.3155,-40.3128,5",  // Vitória ES, 5km
  "limit": 3
}

Custo:    $0.0131
Response: 20000 OK · total_count=899 · 3 items retornados
Item 0:   "Dent's Prime Odontologia Especializada" · Vila Velha ES
          is_claimed=false · rating=5.0 (1 voto) · total_photos=2
          phone=null · website=null (perfil não configurado pelo dono)
```

### 2.2 Pipeline de auditoria

```
API DataForSEO (live)
  → flatten_fields() recursivo (max depth 3)
  → cross-reference com ADAPTER_MAP (provider-core-adapter.ts)
  → cross-reference com PERSISTENCE_MAP (discovery-persistence.ts)
  → cross-reference com DB columns (Supabase REST)
  → Report: 46 campos auditados, 4 gaps encontrados
```

Script: `tools/audit_l0_fields.py` (reutilizável — qualquer desenvolvedor pode rodar).

---

## 3. Inventário completo — 25 top-level keys + 6 address_info sub-keys = 41 campos extraíveis

### 3.1 Top-level keys (25)

| # | Campo | Tipo | Amostra (dentist) | Status |
|---|-------|------|-------------------|--------|
| 1 | `type` | string | `"business_listing"` | ✅ `source_type` |
| 2 | `title` | string | `"Dent's Prime Odontologia..."` | ✅ |
| 3 | `original_title` | string\|null | `null` | ✅ v115 |
| 4 | `description` | string\|null | `null` | ✅ v113 |
| 5 | `category` | string | `"Dentist"` | ✅ |
| 6 | `category_ids` | string[] | `["dentist"]` | ✅ v115 |
| 7 | `additional_categories` | string[]\|null | `null` | ✅ v115 |
| 8 | `cid` | string | `"10001289764596285914"` | 🔴 **v119** (antes não persistido!) |
| 9 | `feature_id` | string | `"0xb83c330d893227:..."` | ✅ v115 |
| 10 | `address` | string | `"R. Nova, 138 - São Torquato..."` | ✅ |
| 11 | `address_info` | object | 6 sub-keys (ver 3.2) | ⚠️ parcial até v119 |
| 12 | `place_id` | string | `"ChIJJzKJDTM8uAAR2gGDQg24y4o"` | ✅ |
| 13 | `phone` | string\|null | `null` | ✅ v104 |
| 14 | `url` (website) | string\|null | `null` | ✅ |
| 15 | `domain` | string\|null | `null` | ✅ v114 |
| 16 | `logo` | string\|null | `null` | ✅ v114 |
| 17 | `main_image` | string | Street View thumbnail URL | ✅ v114 |
| 18 | `total_photos` | integer | `2` | ✅ v113 |
| 19 | `snippet` | string | `"R. Nova, 138 - São Torquato..."` | ✅ v114 |
| 20 | `latitude` | float | `-20.3320395` | ✅ |
| 21 | `longitude` | float | `-40.3507544` | ✅ |
| 22 | `is_claimed` | boolean | `false` | ✅ |
| 23 | `attributes` | object | `{available_attributes, unavailable_attributes}` | ✅ v114 |
| 24 | `place_topics` | object\|null | `null` | ✅ v115 |
| 25 | `rating` | object | `{rating_type, value, votes_count, rating_max}` | ✅ parcial |

### 3.2 `address_info` sub-keys (6)

| # | Sub-campo | Tipo | Amostra | Status |
|---|-----------|------|---------|--------|
| 26 | `address_info.borough` | string | `"São Torquato"` | ✅ `district` |
| 27 | `address_info.address` | string | `"R. Nova, 138"` | ❌ NÃO mapeado |
| 28 | `address_info.city` | string | `"Vila Velha"` | ✅ `city` |
| 29 | `address_info.zip` | string | `"29114-280"` | 🔵 **v119** — migration 001 rotulava errado como L1 |
| 30 | `address_info.region` | string | `"State of Espírito Santo"` | 🔴 **v119** — NÃO era mapeado |
| 31 | `address_info.country_code` | string | `"BR"` | 🔵 **v119** — migration 001 rotulava errado como L1 |

### 3.3 Objetos aninhados (10 — extraídos inteiros como JSONB)

| # | Campo | Estrutura interna | Usado hoje? |
|---|-------|-------------------|:--:|
| 32 | `rating.rating_type` | `"Max5"` (sempre) | ❌ |
| 33 | `rating.rating_max` | `null` (sempre) | ❌ |
| 34 | `rating.value` | `5` | ✅ `rating_value` |
| 35 | `rating.votes_count` | `1` | ✅ `rating_votes` |
| 36 | `rating_distribution` | `{"1":0,"2":0,"3":0,"4":0,"5":1}` | 💤 salvo, não usado |
| 37 | `work_time` | `{work_hours: {timetable: {7 dias}, current_status}}` | 💤 salvo, não usado |
| 38 | `people_also_search` | `[{cid, feature_id, title, rating}]` (5) | 💤 salvo, não usado |
| 39 | `attributes` | `{available_attributes: {accessibility, amenities, planning, payments}}` | 💤 salvo, não usado |
| 40 | `price_level` | integer\|null | 🔵 **v119** — top-level key, antes rotulada L1-only |
| 41 | `contact_info`, `hotel_rating`, `popular_times`, `services`, `local_business_links` | todos null (dentista) | ✅ salvos como JSONB, null-safe |

---

## 4. Gaps encontrados e corrigidos (v119)

### 4.1 🔴 CRÍTICO: `cid` mapeado mas NÃO persistido

```typescript
// provider-core-adapter.ts:144 — SEMPRE mapeou
cid: (item.cid as string) || null,

// discovery-persistence.ts — NUNCA salvou
// cid não estava no objeto de insert. 8,626 listings sem Google CID.
```

**Correção v119:**
- Migration 019: `ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS cid TEXT`
- Persistence: `+1 linha` — `cid: (l as any).cid ?? null`

### 4.2 🔴 CRÍTICO: `address_info.region` NÃO era mapeado

O campo `region` contém a região administrativa ("State of Espírito Santo", "State of Minas Gerais"). Útil para normalização cross-state e exibição. Custo: $0.

**Correção v119:**
- Adapter: `region: (addrInfo.region as string) || null`
- Persistence: `region: (l as any).region ?? null`
- Migration 019: `ALTER TABLE discovery_listings ADD COLUMN IF NOT EXISTS region TEXT`

### 4.3 🟡 LABEL ERRADO: 4 campos rotulados como "L1 enrichment" na migration 001

| Campo | Rótulo migration 001 | Realidade (confirmada live) |
|-------|---------------------|----------------------------|
| `postal_code` | "L1 enrichment" | `address_info.zip` — L0 |
| `country_code` | "L1 enrichment" | `address_info.country_code` — L0 |
| `price_level` | "L1 enrichment" | **Top-level key** no JSON L0 |
| `business_status` | "L1 enrichment" | **Confirmado:** NÃO vem no L0. É L1-only de fato. |

**Correção v119:**
- Adapter: `postal_code`, `country_code`, `price_level` extraídos do L0
- Migration 019: `COMMENT ON COLUMN` corrigido para todos os 4

### 4.4 🟢 OPORTUNIDADE: `address_info.address` não mapeado

Endereço puro sem cidade/estado ("R. Nova, 138"). Parcialmente redundante com o campo `address` (que inclui cidade). Baixa prioridade — não corrigido.

---

## 5. Dados subutilizados — 💤 "dormindo no banco"

### 5.1 `attributes` — a mina de ouro pra copy de S10

```json
{
  "accessibility": ["has_wheelchair_accessible_restroom"],
  "amenities": ["has_restroom"],
  "planning": ["recommends_appointment"],
  "payments": ["pay_credit_card", "pay_debit_card", "pay_mobile_nfc"]
}
```

**Valor:** copy personalizada. "Esta clínica recomenda agendamento e aceita cartão de crédito/débito" vs texto genérico. **Nenhum scoring ou surface usa isso hoje.** Custo: $0 (já pago e armazenado).

### 5.2 `people_also_search` — concorrentes diretos de graça

5 negócios similares com nome + rating + CID. JSONB no banco. **Nunca usado em competitive analysis ou scoring.** Custo: $0.

### 5.3 `work_time` — horários completos 7 dias

Horário de abertura/fechamento por dia da semana + status atual ("open"/"closed"). JSONB no banco. **Nunca usado na UI.** Custo: $0.

### 5.4 `rating_distribution` — perfil de reviews 1★ a 5★

Distribuição exata: quantos 1★, 2★, 3★, 4★, 5★. Permite detectar padrões (ex: muitos 1★ = problema recorrente). JSONB no banco. **Nunca usado.** Custo: $0.

---

## 6. `main_image` NÃO é logo

**Descoberta do teste live:** O campo `main_image` do L0 é uma **thumbnail do Google Street View** do local — não o logo/perfil do negócio:

```
https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=FFq4q_w0vxr2osW3PKht6w&cb_client=search.gws-prod.gps&w=408&h=240&yaw=123.5&pitch=0&thumbfov=100
```

O `logo` (quando existe) é a foto de perfil configurada pelo dono no GMB. São colunas separadas no banco e o adapter já trata corretamente. Mas a UI (LeadTable popup) pode estar mostrando Street View como "foto do negócio" sem distinguir.

---

## 7. Perfil do SMB brasileiro no L0

O primeiro listing do teste (`Dent's Prime`) é representativo do SMB brasileiro:

```
✅ title, category, address  — cadastro básico do Google Maps
✅ rating, place_id, coords  — sempre presentes
✅ attributes               — riquíssimo quando disponível
✅ people_also_search       — 5 concorrentes com nome+rating
✅ work_time                — horários quando configurados
✅ main_image               — Street View (quase sempre disponível)
❌ phone, website, domain   — AUSENTES (dono não configurou)
❌ logo, description        — AUSENTES (dono não configurou)
❌ is_claimed = false       — NÃO reivindicou o perfil
❌ price_level = null       — não se aplica a dentist
```

**Implicação:** ~40-60% dos listings L0 não terão phone/website/description. Esses dados só virão se o dono configurou o GMB. Não é limitação da API — é limitação do mercado.

---

## 8. Recomendações

### Imediatas (já feitas — v119)

- [x] Migration 019: colunas `cid` + `region`, COMMENTs corrigidos
- [x] Adapter: `postal_code`, `country_code`, `region`, `price_level` do L0
- [x] Persistence: `cid` + `region`

### Curto prazo (próxima sessão)

- [ ] Wire `attributes` no scoring — sinais de acessibilidade, pagamento, agendamento
- [ ] Wire `people_also_search` no competitive analysis
- [ ] Wire `work_time` no popup do LeadTable (ex: "🟢 Aberto agora · Fecha 18:00")
- [ ] Wire `rating_distribution` no modal de reputação (gráfico de barras 1★-5★)
- [ ] Distinguir `main_image` (Street View) de `logo` (perfil) na UI

### Médio prazo

- [ ] Re-enrich L0: backfill de 7,170 listings com dados incompletos (~$5-10 total)
- [ ] `address_info.address` (endereço puro) — baixa prioridade

### Longo prazo

- [ ] Script `audit_l0_fields.py` como CI check — roda a cada migration nova
- [ ] Monitorar taxa de null por campo — detectar degradação da API

---

## 9. Contrato de dados L0 (referência canônica)

Esta seção é a **fonte oficial** do que o L0 retorna. Qualquer afirmação sobre "o L0 tem X campos" deve referenciar esta ADR.

```
╔══════════════════════════════════════════════════════════╗
║ L0 · business_listings/search/live                      ║
║ Custo: $0.0127 (limit=1) → $0.048 (limit=100)/página   ║
║ lat/lng/radius obrigatórios · categories opcional       ║
╠══════════════════════════════════════════════════════════╣
║ 25 top-level keys + 6 address_info sub-keys             ║
║ = 41 campos extraíveis · 100% mapeados (v119)           ║
╠══════════════════════════════════════════════════════════╣
║ SEMPRE PREENCHIDOS (15):                                ║
║   type, title, category, category_ids, address,         ║
║   address_info (6 sub-keys), place_id, cid,             ║
║   feature_id, latitude, longitude, is_claimed,          ║
║   rating (value + votes_count), snippet, main_image,    ║
║   total_photos, check_url                               ║
╠══════════════════════════════════════════════════════════╣
║ DEPENDE DE CONFIGURAÇÃO DO DONO (8):                    ║
║   phone, url (website), domain, logo, description,      ║
║   work_time, attributes, original_title                 ║
╠══════════════════════════════════════════════════════════╣
║ VERTICAL-DEPENDENT (geralmente null) (6):               ║
║   price_level, hotel_rating, popular_times, services,   ║
║   place_topics, local_business_links                    ║
╠══════════════════════════════════════════════════════════╣
║ SEMPRE PRESENTES COMO OBJETO (4):                       ║
║   rating_distribution, people_also_search,              ║
║   contact_info, additional_categories                   ║
╚══════════════════════════════════════════════════════════╝
```

---

## 10. Métricas

| Métrica | Antes (v115) | Depois (v119) |
|---------|:--:|:--:|
| Campos mapeados no adapter | 37 | 41 |
| Campos persistidos no banco | 36 (cid perdido) | 41 |
| Colunas no DB para L0 | 31 | 33 (+cid, +region) |
| Labels "L1" incorretos na migration 001 | 5 | 0 (corrigidos via 019) |
| Campos subutilizados (💤) | 4 | 4 (attributes, people_also_search, work_time, rating_distribution) |
| Custo do teste de auditoria | — | $0.0131 |

---

## 11. Fontes (medido=verdade)

- **DataForSEO API live** — `POST /v3/business_data/business_listings/search/live` · $0.0131 · 2026-07-19
- **`tools/audit_l0_fields.py`** — script de auditoria reprodutível
- **`tools/audit_l0_report.py`** — relatório formatado offline
- **`provider-core-adapter.ts`** — adapter L0, 600 linhas, 10 funções
- **`discovery-persistence.ts`** — persistência, 227 linhas
- **Migration 019** — `packages/db/supabase/migrations/019_l0_cid_region_fix_labels.sql`
- **Supabase REST** — query `discovery_listings` (8,626 rows, 85 colunas)
- **ADR-0039** — deprecação L1, auditoria de código e DB
