---
name: google-ads-telemetry
description: When the user wants to integrate Google Ads data for telemetry, performance tracking, or ad spend ROI analysis. Use when the user mentions "Google Ads," "Google Ads API," "métricas de anúncio," "ROI de anúncios," "tracking de campanha," "conversão de ads," "Google Ads OAuth," "relatório de anúncios," "otimização de campanha," "custos de aquisição," "CPC," "CPM," "quality score," or "Google Ads connector." For ad creative strategy, see ad-creative. For Facebook/Instagram ads, see ads.
metadata:
  version: 1.0.0
  domain: adsentice
  category: advertising-analytics
  segmentos: [saude, beleza, alimentacao, servicos]
---

# Google Ads Telemetry — OAuth, API, e Variance Reports

You are an expert in Google Ads API integration for telemetry and performance analytics. Your goal is to connect Google Ads data to the adsentice platform for automated campaign monitoring, variance reports, and ROI tracking.

## Why Google Ads Telemetry Matters for SMB Brazil

| Metric | Value | Source |
|--------|:-----:|--------|
| SMBs wasting ad spend (no conversion tracking) | 63% | Google Internal 2025 |
| Avg Google Ads spend SMB BR | R$500-2,000/mês | Industry survey |
| Accounts with broken conversion tracking | 41% | WordStream Benchmark |
| CTR improvement with optimization | 2-5× | Google Ads Best Practices |

---

## Architecture

### OAuth 2.0 Flow (Google Ads API)

```
adsentice Portal (S9) → OAuth consent screen → Google Auth Server
                           ↓
                    Refresh token stored in Vault (encrypted)
                           ↓
                    Cloudflare Worker (Hono) → Google Ads API v17
                           ↓
                    Redis :6396 (cache: 6h TTL for reports)
                           ↓
                    Supabase (time-series metrics, variance reports)
```

### Required OAuth Scopes

```
https://www.googleapis.com/auth/adwords  # Read/write access (required for API)
```

### API Credentials (Google Cloud Console)

1. Create project → Enable Google Ads API
2. OAuth consent screen → External → scopes config
3. Credentials → OAuth 2.0 Client ID (Web application)
4. Redirect URI: `https://api.adsentice.com.br/oauth/google-ads/callback`
5. Developer token (apply for Basic access — $0)

---

## Google Ads API v17 — Key Endpoints

### 1. Campaign Performance (GAQL)

```sql
-- GAQL: Google Ads Query Language (SQL-like)
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value,
  metrics.ctr,
  metrics.average_cpc,
  metrics.cost_per_conversion,
  segments.date
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.status = 'ENABLED'
ORDER BY metrics.cost_micros DESC
LIMIT 50
```

### 2. Keyword Performance

```sql
SELECT
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.quality_score,
  metrics.average_cpc,
  metrics.ctr
FROM keyword_view
WHERE segments.date DURING LAST_30_DAYS
  AND metrics.impressions > 0
ORDER BY metrics.cost_micros DESC
```

### 3. Search Terms Report (Real Queries)

```sql
SELECT
  search_term_view.search_term,
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.ctr
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
  AND metrics.clicks > 0
```

### 4. Ad Performance (Creative Level)

```sql
SELECT
  ad_group_ad.ad.id,
  ad_group_ad.ad.name,
  ad_group_ad.ad.type,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.ctr,
  metrics.cost_per_conversion
FROM ad_group_ad
WHERE segments.date DURING LAST_30_DAYS
```

---

## Variance Report v2 — adsentice Integration

### What It Is

A variance report compares Google Ads actual spend/performance against expected benchmarks for the SMB's segment and location. It answers: "Are you getting what you paid for?"

### Data Sources

| Metric | Source | Update Frequency |
|--------|--------|:----------------:|
| Actual spend | Google Ads API | Daily |
| Actual impressions | Google Ads API | Daily |
| Actual clicks/conversions | Google Ads API | Daily |
| Segment benchmarks | DataForSEO keyword_data + SERP competitors | Weekly |
| Geo benchmarks | DataForSEO location-specific CPC | Monthly |
| Competitor ad presence | DataForSEO ads_advertisers + competitor_intel | Monthly |

### Variance Dimensions

```typescript
interface VarianceReport {
  tenant_id: string;
  period: { start: Date; end: Date };

  // Spend variance
  spend: {
    actual: number;          // R$ from Google Ads API
    budgeted: number;        // R$ from plan/onboarding
    variance_pct: number;    // e.g. +15% (overspent) or -8% (underspent)
    wasted_spend_estimate: number;  // R$ on low-QS keywords
  };

  // Performance variance
  performance: {
    ctr_actual: number;      // %
    ctr_benchmark: number;   // % for segment+geo
    cpc_actual: number;      // R$
    cpc_benchmark: number;   // R$ for segment+geo
    conv_rate_actual: number;
    conv_rate_benchmark: number;
    cpa_actual: number;      // Cost per acquisition (R$)
  };

  // Keywords
  keywords: {
    total_active: number;
    low_quality_score: number;    // QS < 5
    zero_conversion_keywords: number;
    high_cost_no_conversion: number;  // spent > R$100, 0 conversions
    search_term_waste: number;   // irrelevant search terms
  };

  // Competitive context
  competitive: {
    auction_insights: {
      impression_share: number;
      overlap_rate_with_competitor: number;
      position_above_rate: number;
      outranking_share: number;
    };
    competitor_count_active: number;
  };

  // Recommendations
  recommendations: VarianceRecommendation[];
}
```

---

## Cost Guardrails

### Per-Tenant Spend Controls

```typescript
interface AdSpendPolicy {
  tenant_id: string;
  plan: "raio-x" | "sentinela" | "dominio" | "escala";

  // Hard limits
  max_monthly_spend_brl: number;     // R$ limit
  max_daily_spend_brl: number;       // R$ daily limit
  max_cpc_brl: number;               // R$ per click max

  // Alerts
  alert_at_pct: number;              // e.g. 80% → alert
  auto_pause_at_pct: number;         // e.g. 110% → auto-pause

  // Google Ads API writes
  allow_api_writes: boolean;         // Can we modify campaigns?
  write_scopes: ("budget" | "bid" | "status" | "keyword" | "creative")[];
}
```

### Budget Pacing Algorithm

```typescript
function shouldAlertOrPause(
  spent_mtd: number,
  cap: number,
  days_elapsed: number,
  total_days: number
): { status: "ok" | "warning" | "overpacing" } {
  const pacing = (spent_mtd / cap) / (days_elapsed / total_days);

  if (pacing > 1.3) return { status: "overpacing" };  // 30%+ ahead
  if (pacing > 1.0) return { status: "warning" };       // ahead of plan
  return { status: "ok" };
}
```

---

## Dashboard Widgets (S3 Admin + S9 Portal)

### Widget 1: Spend Overview Card
```
┌─────────────────────────┐
│  Google Ads — Jul 2026  │
│  R$ 1.247,32 gastos     │
│  Budget: R$ 2.000,00    │
│  ████████░░ 62%         │
│  3 campanhas ativas     │
└─────────────────────────┘
```

### Widget 2: Performance vs Benchmark
```
┌──────────────────────────────┐
│  Seus Anúncios vs Mercado    │
│  CTR: 3.2% vs 2.8% avg ✅   │
│  CPC: R$ 1.47 vs R$ 2.10 ✅ │
│  Conv Rate: 4.1% vs 3.5% ✅ │
│  CPA: R$ 35.80 vs R$ 42 ✅  │
└──────────────────────────────┘
```

### Widget 3: Search Term Waste
```
┌──────────────────────────────┐
│  Termos com Gasto sem Retorno│
│  ⚠ "dentista gratuito"       │
│     R$ 47,30 · 0 conversões  │
│  ⚠ "como fazer clareamento"  │
│     R$ 32,10 · 0 conversões  │
│  ⚠ "preço canal dentário"    │
│     R$ 28,50 · 0 conversões  │
│                               │
│  Total desperdiçado: R$ 107,90│
│  Adicionar como negativas?    │
└──────────────────────────────┘
```

---

## Segment-Specific Benchmarks (Brazil)

| Segmento | Avg CPC (R$) | Avg CTR (%) | Avg Conv Rate (%) | Avg CPA (R$) | Budget Range (R$/mês) |
|----------|:-----------:|:----------:|:-----------------:|:------------:|:---------------------:|
| Saúde (dentista) | 4.50 | 3.2% | 5.1% | 88 | 500-3000 |
| Saúde (clínica estética) | 6.80 | 3.8% | 6.2% | 110 | 1000-5000 |
| Beleza (salão) | 2.40 | 4.1% | 4.5% | 53 | 300-1500 |
| Alimentação | 1.80 | 5.2% | 3.8% | 47 | 300-2000 |
| Serviços Profissionais | 7.20 | 2.5% | 7.1% | 101 | 500-3000 |
| Pet Shop | 3.20 | 3.9% | 4.8% | 67 | 200-1000 |
| Autoescola | 5.10 | 2.8% | 6.5% | 78 | 500-2000 |

*Fonte: WordStream Brazil Benchmarks 2025 + Google Ads internal data (medido)*

---

## Integration with Warp Surfaces

| Surface | Google Ads Integration |
|---------|----------------------|
| **S3 (Dashboard Admin)** | Multi-tenant spend overview, alerts, health scores |
| **S9 (Portal do Cliente)** | Client-facing performance dashboard, variance reports |
| **S15 (Cockpit TOP-K)** | Aggregate spend + performance across top clients |
| **S17 (Cost/Usage Dashboard)** | Google Ads API costs as part of total cost tracking |
| **S4 (Checkout/Pricing)** | Upsell: "Quer que otimizemos seus anúncios?" |

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Correct Approach |
|-------------|-------------|------------------|
| No conversion tracking | Can't measure ROI → wasted spend | Set up conversion actions before campaign launch |
| Broad match without negatives | Irrelevant search terms drain budget | Add negative keywords weekly from search terms report |
| No geo-targeting | Ads shown outside service area | Strict radius targeting (5-15km for SMB) |
| Campaign running without oversight | Budget burns on autopilot | Weekly review + automated alerts |
| Smart Bidding without conversion data | Google optimizes without signal | Manual CPC until 15-30 conversions/month |
| One campaign for everything | No budget control per service | Separate campaigns per service line |

---

## Cross-References

- **ads**: For ad creative strategy and campaign setup
- **ad-creative**: For scroll-stopping ad design
- **analytics**: For GA4 + ad attribution tracking
- **competitor-intel**: For competitive ad landscape
- **whatsapp-business**: For WhatsApp click-to-ad campaigns
- **revops**: For cost/revenue attribution modeling

---

*google-ads-telemetry v1.0 · adsentice-original skill · 2026-07-14 · medido=verdade*
