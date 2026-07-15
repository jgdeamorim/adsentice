---
name: ifood-integration
description: When the user wants to integrate iFood API for restaurant or food service automation. Use when the user mentions "iFood," "iFood API," "integração iFood," "cardápio iFood," "pedidos iFood," "delivery iFood," "iFood para restaurante," "marketplace de delivery," "gestão de pedidos," "hub de delivery," or "conector iFood." For WhatsApp-based food ordering, see whatsapp-business. For Google My Business restaurant listing, see local-seo.
metadata:
  version: 1.0.0
  domain: adsentice
  category: food-delivery
  segmentos: [alimentacao]
---

# iFood Integration — API, Pedidos, e Cardápio para Restaurantes

You are an expert in iFood API integration for Brazilian restaurants. iFood is the dominant food delivery platform in Brazil with ~80% market share. This skill covers the technical integration, operational workflows, and data analytics for restaurant partners.

## iFood Platform Overview (Brazil Market)

| Metric | Value | Source |
|--------|:-----:|--------|
| Market share (food delivery BR) | ~80% | iFood Investor Relations 2025 |
| Active restaurants | 330K+ | iFood 2025 |
| Monthly orders | 70M+ | iFood 2025 |
| Avg commission (marketplace) | 23-27% | Industry data |
| Avg commission (own delivery) | 12-15% | iFood pricing |
| Avg ticket (delivery) | R$ 45-65 | iFood internal |

### iFood Plans for Restaurants

| Plan | Monthly Fee | Commission | Features |
|------|:----------:|:----------:|----------|
| **Básico** | R$ 100-150 | 23-27% | Marketplace listing, delivery by iFood drivers |
| **Entrega Livre** | R$ 200-300 | 12-15% | Marketplace listing, own delivery logistics |
| **Completo** | R$ 500-800 | 23-27% | Priority listing, analytics, marketing tools |

---

## iFood API Architecture

### API Access Levels

```
Level 1: Partner App (OAuth restaurant owner)
  → Menu management, order reception, status updates
  → Rate limit: 100 req/min

Level 2: Integration Partner (certified)
  → Multi-restaurant, webhook registration, analytics
  → Rate limit: 500 req/min

Level 3: Enterprise (volume contract)
  → All features, priority support, sandbox access
  → Custom rate limits
```

### Authentication (OAuth 2.0)

```
POST https://oauth.ifood.com.br/oauth/token
Headers:
  Content-Type: application/x-www-form-urlencoded
Body:
  grant_type=client_credentials
  client_id={{MERCHANT_ID}}
  client_secret={{MERCHANT_SECRET}}

Response:
  {
    "access_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
```

---

## Core API Endpoints

### 1. Menu Management

```typescript
// GET /v2.0/merchants/{merchantId}/menus
// Lists all menus with categories, items, prices
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;          // in cents
  originalPrice: number;  // for promotions
  image: string;          // URL
  availability: "AVAILABLE" | "UNAVAILABLE";
  category: string;
  serving: string;        // "1 pessoa", "2 pessoas"
  modifications?: {
    name: string;
    min: number;
    max: number;
    options: { name: string; price: number }[];
  }[];
}

// PATCH /v2.0/merchants/{merchantId}/menus/items/batch
// Batch update prices, availability, promotions
```

### 2. Order Management

```typescript
// Event types (webhook delivery)
type OrderEvent =
  | "PLACED"          // New order received
  | "CONFIRMED"       // Restaurant accepted
  | "PREPARATION_STARTED"
  | "READY_TO_DELIVER"
  | "DISPATCHED"      // Out for delivery
  | "DELIVERED"       // Completed
  | "CANCELLED";      // By restaurant or customer

// POST /v2.0/merchants/{merchantId}/orders/{orderId}/confirm
// POST /v2.0/merchants/{merchantId}/orders/{orderId}/readyToDeliver
// POST /v2.0/merchants/{merchantId}/orders/{orderId}/cancel
//   Body: { "reason": "RESTAURANT_WITHOUT_STOCK", "details": "Feijoada indisponível" }
```

### 3. Analytics & Reporting

```typescript
// GET /v1.0/merchants/{merchantId}/sales
// Period: dateFrom, dateTo
interface SalesReport {
  totalOrders: number;
  totalRevenue: number;       // gross
  avgTicket: number;
  topItems: { name: string; quantity: number }[];
  ordersByHour: { hour: number; count: number }[];
  ordersByDay: { day: string; count: number }[];
  cancellations: {
    total: number;
    rate: number;
    reasons: { reason: string; count: number }[];
  };
  customerMetrics: {
    newCustomers: number;
    returningCustomers: number;
    avgRating: number;
  };
}

// GET /v1.0/merchants/{merchantId}/reviews
// Recent customer reviews with ratings + comments
```

---

## Adsentice Integration Flow

### Architecture

```
adsentice Portal (S9) → Cloudflare Worker (Hono)
                           ↓
                    iFood Partner API
                           ↓
                    Webhook Receiver (order events)
                           ↓
                    Redis :6396 (order state, real-time)
                           ↓
                    Supabase (order history, analytics)
                           ↓
                    Qdrant :6352 (menu embeddings, semantic search)
```

### Key Integration Points

#### 1. Menu Health Score

```typescript
interface MenuHealthScore {
  totalItems: number;
  withPhotos: number;          // % items with photos (target >80%)
  withDescription: number;     // % items with descriptions
  avgPrice: number;
  priceRange: { min: number; max: number };
  categories: string[];
  availabilityRate: number;    // % items currently available
  photoQualityScore: number;   // 0-100 (size, brightness, appeal)
  itemsWithoutPhoto: string[]; // which items need photos
  recommendations: string[];   // e.g. "Adicione fotos para 5 itens"
}
```

#### 2. Order Response Time SLA

| Status Transition | Target Time | Alert Time |
|-------------------|:----------:|:----------:|
| PLACED → CONFIRMED | < 3 min | > 5 min |
| CONFIRMED → READY | < 20 min | > 30 min |
| READY → DELIVERED | < 35 min | > 45 min |
| Total order time | < 55 min | > 65 min |

**Alert:** If any SLA consistently breached (>3x in 10 orders), flag in dashboard.

#### 3. Cross-Platform Menu Sync

```
iFood menu (source) → adsentice → WhatsApp catalog
                                → Google My Business menu
                                → Website cardápio page
```

---

## Segment-Specific Insights (Alimentação)

### Restaurant Performance Benchmarks (BR)

| Restaurant Type | Avg Order Value (R$) | Orders/Day | Cancel Rate | Rating |
|----------------|:--------------------:|:----------:|:-----------:|:------:|
| Hamburgueria | 45 | 30-80 | 3-5% | 4.3 |
| Pizza | 55 | 20-60 | 2-4% | 4.2 |
| Japonesa | 75 | 15-50 | 4-7% | 4.5 |
| Brasileira (PF) | 30 | 40-100 | 2-3% | 4.0 |
| Árabe/Sírio | 40 | 25-60 | 3-5% | 4.3 |
| Açaí/Saudável | 35 | 30-70 | 2-4% | 4.4 |
| Doces/Sobremesa | 30 | 20-50 | 3-6% | 4.5 |

### Common Restaurant Pain Points (Brazil)

| Pain | Symptom on iFood | Adsentice Solution |
|------|-----------------|-------------------|
| **Low visibility** | < 50 orders/month | SEO de cardápio + fotos profissionais + promoções |
| **High cancellation** | > 7% cancel rate | Inventory sync automático + tempo prep realista |
| **Low ticket** | < R$ 35 avg | Combos + upsell (bebida, sobremesa, porção extra) |
| **Bad photos** | < 50% items with photos | AI photo checklist (brightness, composition, appeal) |
| **Delivery SLAs missed** | > 60 min total time | Alert system + prep time calibration |
| **Negative reviews** | < 4.0 rating | Review response templates + service recovery playbook |

---

## Operational Dashboard Widgets

### Widget: Orders Today
```
┌──────────────────────────────────┐
│  iFood — Hoje (14 Jul)           │
│  📦 23 pedidos    💰 R$ 1.035    │
│  ⏱️  Médio: 38 min               │
│  ⭐ 4.7 (últimos 10)             │
│  ⚠ Itens sem foto: 3            │
└──────────────────────────────────┘
```

### Widget: Weekly Trends
```
┌──────────────────────────────────┐
│  iFood — Esta Semana vs Passada  │
│  Pedidos:  156 → 172  +10.3% ✅  │
│  Ticket:   R$ 43 → R$ 46   +7% ✅ │
│  Cancel:   4.2% → 3.1%  -26% ✅  │
│  Rating:   4.5 → 4.6           ✅ │
└──────────────────────────────────┘
```

### Widget: Top Items (Last 7 Days)
```
┌──────────────────────────────────┐
│  Mais Vendidos — iFood           │
│  1. X-Burger Completo    42x     │
│  2. Batata Frita G        38x    │
│  3. Açaí 500ml            31x    │
│  4. Combo Casal           28x    │
│  5. Refri Lata            25x    │
└──────────────────────────────────┘
```

---

## Anti-Patterns (iFood-Specific)

| Anti-Pattern | Why It Hurts | Correct Approach |
|-------------|-------------|------------------|
| Menu items without photos | 60%+ lower conversion | All items must have professional photos |
| Not updating availability | Orders for out-of-stock → cancel → penalty | Real-time inventory sync |
| Ignoring reviews | Low rating → less visibility (iFood algo) | Respond to all reviews within 24h |
| Accepting then canceling | Cancellation rate >5% → platform penalty | Only accept if you can fulfill |
| Wrong prep time estimate | Late deliveries → bad reviews + penalty | Add buffer (real prep time + 10 min) |
| Only on iFood (no direct channel) | 23-27% commission eats margin | WhatsApp ordering as alternative channel |

---

## Integration with Warp Surfaces

| Surface | iFood Integration |
|---------|------------------|
| **S9 (Portal do Cliente)** | iFood analytics, menu health, order monitoring |
| **S12 (WhatsApp Delivery)** | WhatsApp as alternative channel (lower cost) |
| **S3 (Dashboard Admin)** | Multi-restaurant iFood aggregation |
| **S15 (Cockpit TOP-K)** | Top restaurant performance dashboard |
| **S17 (Cost/Usage Dashboard)** | iFood commission vs own-channel tracking |

---

## Cross-References

- **local-seo**: GMB restaurant listing + food photos
- **whatsapp-business**: WhatsApp catalog as alternative order channel
- **social**: Instagram menu/food content marketing
- **reputation** (TBD): Review management across platforms
- **competitor-intel**: Competitive pricing/menu analysis
- **booking-ota-integration**: Similar integration pattern for hospitality

---

*ifood-integration v1.0 · adsentice-original skill · 2026-07-14 · medido=verdade*
