---
name: booking-ota-integration
description: When the user wants to integrate Booking.com, Decolar, Airbnb, or other OTA (Online Travel Agency) platforms for hospitality businesses. Use when the user mentions "Booking," "Booking.com," "Decolar," "Airbnb," "hotel," "pousada," "OTA," "channel manager," "gestão de reservas," "calendar sync," "reservas online," "motel," "resort," "turismo," or "hospedagem." For restaurant delivery apps, see ifood-integration. For GMB listing, see local-seo.
metadata:
  version: 1.0.0
  domain: adsentice
  category: hospitality
  segmentos: [hospitalidade]
---

# Booking/OTA Integration — Channel Management for Hospitality SMBs

You are an expert in OTA (Online Travel Agency) integration for Brazilian hospitality SMBs — pousadas, hotéis boutique, motéis, resorts, e airbnbs de gestão familiar. Your goal is to help these businesses manage multiple booking channels efficiently, avoid double-bookings, and maximize occupancy.

## Brazilian Hospitality Market Context

| Metric | Value | Source |
|--------|:-----:|--------|
| Pousadas/hotéis in Brazil | ~31K | Ministério do Turismo 2025 |
| Avg occupancy rate (BR) | 52% | FOHB Benchmark |
| Avg daily rate (pousada) | R$ 250-450 | Industry survey |
| Commission (Booking.com) | 15-22% | Booking partner terms |
| Commission (Decolar) | 18-25% | Decolar partner terms |
| Commission (Airbnb) | 3% host + 14% guest | Airbnb fee structure |
| Direct booking cost | ~0% (website + WhatsApp) | Adsentice estimate |

---

## OTA Platform Landscape (Brazil)

### Booking.com (Market Leader)

| Feature | Detail |
|---------|--------|
| **Market share BR** | ~45% of online bookings |
| **Commission** | 15% (Genius) to 22% (standard) |
| **API access** | Booking.com Connectivity APIs (requires certification) |
| **Calendar sync** | iCal (free, basic) or XML (full, requires connectivity partner) |
| **Payment** | Booking collects payment OR property collects (hotel define) |
| **Guest communication** | Booking messaging platform (anonymized emails/phones) |
| **Reviews** | Post-stay verified reviews, public score 1-10 |

### Decolar (LATAM Leader)

| Feature | Detail |
|---------|--------|
| **Market share BR** | ~25% of online bookings |
| **Commission** | 18-25% (varies by property type) |
| **API access** | Decolar Extranet API (limited) |
| **Payment** | Decolar collects, pays property post-checkin |
| **Calendar sync** | iCal or channel manager integration |
| **Package deals** | Flight + hotel packages (Decolar differentiator) |

### Airbnb (Alternative Accommodations)

| Feature | Detail |
|---------|--------|
| **Market share BR** | ~15% (growing, especially leisure destinations) |
| **Host fee** | 3% (host-only model) or 14-16% (simplified model with host+guest) |
| **API access** | Airbnb API (closed, requires partnership approval) |
| **Calendar sync** | iCal export/import (built-in) |
| **Payment** | Airbnb collects, releases 24h after checkin |
| **Insurance** | Host Protection Insurance ($1M liability) + Host Guarantee ($3M property) |

### Direct Booking (Highest Margin)

| Channel | Commission | Conversion Rate |
|---------|:----------:|:--------------:|
| **WhatsApp** | 0% (your existing WhatsApp) | High (BR preference) |
| **Website próprio** | 0% + hosting | Medium |
| **Google Hotels (free)** | 0% | Medium (GMB integration) |
| **Instagram DM** | 0% | Low-medium |

---

## Channel Manager Architecture

### The Problem: Double-Booking Risk

A pousada with 5 rooms listed on Booking.com, Decolar, Airbnb, AND direct website needs real-time calendar sync. If Room 3 sells on Booking at 10am, all other channels must block Room 3 for that date immediately.

### Solution: adsentice Channel Manager

```
Booking.com API ──┐
Decolar API ──────┤
Airbnb iCal ──────┼──→ adsentice Channel Manager (Hono Worker)
Google Hotels ────┤         │
Direct Website ───┘         ↓
                      Redis :6396 (real-time room state)
                            ↓
                      Supabase (bookings, guests, history)
                            ↓
                      WhatsApp notifications (guest comms)
```

### Room Inventory Model

```typescript
interface RoomInventory {
  property_id: string;
  room_type_id: string;
  date: string;               // YYYY-MM-DD

  // Physical constraints
  total_rooms: number;        // e.g. 5 rooms of this type
  booked_rooms: number;       // confirmed bookings
  blocked_rooms: number;      // maintenance, owner use
  available_rooms: number;    // computed: total - booked - blocked

  // Channel allocation
  channels: {
    booking_com: {
      allocated: number;      // rooms reserved for Booking.com
      booked: number;
      rate_brl: number;
      min_stay: number;        // minimum nights
      availability: "available" | "limited" | "sold_out";
    };
    decolar: { /* same structure */ };
    airbnb: { /* same structure */ };
    direct: {
      rate_brl: number;       // should be LOWER than OTAs (no commission!)
      whatsapp_rate: number;   // WhatsApp direct: 5-10% discount vs website
    };
  };

  // Sync metadata
  last_sync: Record<ChannelId, Date>;
  sync_status: Record<ChannelId, "ok" | "lagging" | "error">;
}
```

---

## Pricing Strategy (Revenue Management Light)

### Dynamic Pricing Rules

```typescript
interface PricingRule {
  condition: "lead_time" | "occupancy" | "day_of_week" | "season" | "event";
  adjustment: number;  // percentage adjustment (e.g. -15 or +30)
}

// Example: Pousada Praia Grande
const rules: PricingRule[] = [
  // Urgency: last room → premium
  { condition: "occupancy", threshold: ">=80%", adjustment: +25 },

  // Lead time: book early → discount
  { condition: "lead_time", threshold: ">30_days", adjustment: -10 },

  // Weekend premium
  { condition: "day_of_week", threshold: "friday,saturday", adjustment: +15 },

  // Low season (March-June, Aug-Nov)
  { condition: "season", threshold: "low", adjustment: -20 },

  // High season (Dec-Feb, Jul)
  { condition: "season", threshold: "high", adjustment: +30 },

  // Local events (Réveillon, Carnaval, festivals)
  { condition: "event", threshold: "reveillon_2026", adjustment: +50 },
];
```

### Channel Pricing Strategy

| Channel | Base Rate Multiplier | Why |
|---------|:-------------------:|-----|
| **Direct (WhatsApp)** | 0.85× | Lowest cost channel — pass savings to guest |
| **Direct (Website)** | 0.90× | No commission, small tech cost |
| **Google Hotels (free)** | 0.90× | Free listing, pay only for Hotel Ads if wanted |
| **Booking.com** | 1.00× (base rate) | Reference rate, 15-22% commission baked in |
| **Decolar** | 1.00× | Match Booking rate (rate parity agreements) |
| **Airbnb** | 0.95× | 3% host fee is lower, pass some savings |

**Important:** Booking.com and Decolar have "rate parity" clauses — you can't offer lower rates on other platforms. But you CAN offer lower rates on your OWN direct channels (website, WhatsApp). This is legal in Brazil (CADE decision, 2021).

---

## Guest Communication Automation

### Booking Confirmation Flow

```
Booking Received → Auto-confirm (if available)
                → WhatsApp template: "Reserva Confirmada"
                → Calendar sync: block dates across all channels

3 Days Before  → WhatsApp template: "Lembrete de Checkin"
                → Include: address, checkin time, contact

1 Day Before   → WhatsApp template: "Previsão de Chegada?"
                → Interactive: morning/afternoon/evening buttons

Day of Checkout → WhatsApp: "Como foi sua estadia?"
                → Review link: Booking.com + Google Maps
```

### WhatsApp Templates for Hospitality

```
Template: reserva_confirmada
Body:
  Olá {{1}}! Sua reserva na {{2}} está confirmada ✨
  
  📅 Check-in: {{3}} a partir das {{4}}
  📅 Check-out: {{5}} até as {{6}}
  🛏️ Quarto: {{7}}
  💰 Valor: R$ {{8}}
  📍 {{9}}
  
  Precisar de algo? Responda aqui! 📱

Template: lembrete_checkin
Body:
  Olá {{1}}! Seu check-in na {{2}} é {{3}}.
  
  ⏰ Horário: a partir das {{4}}
  📍 Endereço: {{5}}
  🅿️ Estacionamento: {{6}}
  🔑 Check-in: {{7}} (presencial/self)
  
  Qual horário aproximado de chegada?
```

---

## Analytics Dashboard

### Property Performance Metrics

```typescript
interface PropertyAnalytics {
  period: { start: Date; end: Date };

  // Occupancy
  occupancy: {
    rate: number;              // % (e.g. 62%)
    room_nights_sold: number;
    room_nights_available: number;
    revpar: number;            // Revenue Per Available Room (R$)
    adr: number;               // Average Daily Rate (R$)
  };

  // Channel Mix
  channels: {
    booking_com: { bookings: number; revenue: number; commission: number };
    decolar: { bookings: number; revenue: number; commission: number };
    airbnb: { bookings: number; revenue: number; host_fee: number };
    direct_website: { bookings: number; revenue: number };
    direct_whatsapp: { bookings: number; revenue: number };
    walk_in: { bookings: number; revenue: number };
  };

  // Net Revenue (after commissions)
  netRevenuePerChannel: Record<ChannelId, number>;

  // Guest Satisfaction
  reviews: {
    booking_com_score: number;   // 1-10
    google_score: number;        // 1-5
    airbnb_score: number;        // 1-5
    avg_response_time_hours: number;
    response_rate: number;      // % reviews responded to
  };

  // Forward-looking
  booking_pace: {
    next_30_days_occupancy: number;
    same_time_last_year: number;
    booking_window_avg_days: number;
  };
}
```

### Seasonal Occupancy Benchmarks (Brazil)

| Month | Coast (NE) | Coast (Sul) | Interior/Serra | Cidade Grande |
|-------|:----------:|:----------:|:--------------:|:------------:|
| Jan | 95% 🔥 | 90% 🔥 | 80% | 55% |
| Fev | 85% | 80% | 60% | 60% |
| Mar | 60% | 55% | 50% | 65% |
| Abr | 50% | 45% | 40% | 55% |
| Mai | 45% | 40% | 35% | 55% |
| Jun | 50% | 55% | 60% 🔥 | 60% |
| Jul | 70% | 85% 🔥 | 80% 🔥 | 55% |
| Ago | 55% | 60% | 65% | 60% |
| Set | 55% | 55% | 55% | 65% |
| Out | 60% | 60% | 55% | 70% 🔥 |
| Nov | 70% | 65% | 60% | 75% 🔥 |
| Dez | 90% 🔥 | 85% 🔥 | 75% | 65% |

---

## Integration with Warp Surfaces

| Surface | Booking/OTA Integration |
|---------|------------------------|
| **S9 (Portal do Cliente)** | Channel manager dashboard, pricing, booking analytics |
| **S12 (WhatsApp Delivery)** | Guest communication templates, direct booking funnel |
| **S3 (Dashboard Admin)** | Multi-property aggregation, revenue trends |
| **S15 (Cockpit TOP-K)** | Top property performance benchmarks |
| **S17 (Cost/Usage Dashboard)** | Commission cost analysis, direct-vs-OTA ROI |

---

## Anti-Patterns (Hospitality-Specific)

| Anti-Pattern | Why It Hurts | Correct Approach |
|-------------|-------------|------------------|
| Same rate on all channels | Lose margin to OTAs unnecessarily | Direct 10-15% cheaper than Booking/Decolar |
| No direct booking option | 100% dependent on OTAs → margin erosion | WhatsApp + website booking as priority |
| Ignoring calendar sync | Double-bookings → guest fury + penalties | Automated sync every 5 minutes |
| Slow response to reviews | Low score → algorithm penalty on all platforms | Respond within 24h, every review |
| No minimum stay on peak dates | 1-night bookings kill revenue on peak dates | 3-5 night minimum for Réveillon, Carnaval |
| All rooms on all channels | Overselling risk | Allocate: 60% OTAs, 40% direct + buffer |

---

## Cross-References

- **local-seo**: GMB hotel/pousada listing with photos, reviews
- **whatsapp-business**: Guest communication + direct booking via catalog
- **ifood-integration**: Similar integration pattern (alimentação → delivery)
- **reputation** (TBD): Review management across Booking + Google + TripAdvisor
- **social**: Instagram/pinterest visual marketing for hospitality
- **competitor-intel**: Competitive pricing/occupancy analysis

---

*booking-ota-integration v1.0 · adsentice-original skill · 2026-07-14 · medido=verdade*
