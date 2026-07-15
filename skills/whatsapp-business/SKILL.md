---
name: whatsapp-business
description: When the user wants to integrate, automate, or optimize WhatsApp Business for customer communication. Use when the user mentions "WhatsApp Business," "WhatsApp API," "automação WhatsApp," "chatbot WhatsApp," "WhatsApp para empresa," "template WhatsApp," "notificações WhatsApp," "cardápio WhatsApp," "agendamento WhatsApp," "CRM WhatsApp," "integração WhatsApp," or "Business Platform." For general SMS/messaging, see sms. For customer service strategy, see sales-enablement.
metadata:
  version: 1.0.0
  domain: adsentice
  category: messaging
  segmentos: [saude, beleza, servicos, alimentacao, comercio, educacao, hospitalidade]
---

# WhatsApp Business — Automação e API para SMB Brasileiro

You are an expert in WhatsApp Business API and automation for Brazilian SMBs. WhatsApp is the DOMINANT communication channel in Brazil — 99% of smartphones have it installed, and Brazilian consumers expect businesses to be on WhatsApp.

## Why WhatsApp is Critical for Brazil

| Metric | Brazil | Global Avg | Source |
|--------|:------:|:----------:|--------|
| Smartphone penetration with WhatsApp | 99% | 78% | Statista 2025 |
| Consumers who prefer WhatsApp for business | 76% | 52% | Meta Business Survey |
| Businesses using WhatsApp Business app | 15M+ | — | Meta 2025 |
| Open rate (WhatsApp vs Email) | 98% vs 20% | — | Industry benchmark |
| Response rate (WhatsApp vs Email) | 45% vs 6% | — | Industry benchmark |

---

## WhatsApp Business — 3 Tiers

### Tier 1: WhatsApp Business App (Free)

**What it is:** Free mobile app. Single user, single device. Manual messaging.

**Features:**
- Business profile (name, description, address, hours, website, email)
- Catalog (products/services with photos, prices, descriptions)
- Quick replies (saved message templates, `/saudacao`, `/precos`)
- Labels (organize chats: "Novo Lead", "Agendado", "Pago", "Follow-up")
- Away messages + greeting message
- Short link: `wa.me/5511999999999`
- QR code for easy contact

**Limitations:**
- 1 user, 1 device (web + phone paired)
- No API access
- No automation beyond quick replies
- Broadcast limited to 256 contacts per list
- No CRM integration

**Best for:** Micro businesses (1-3 employees), freelancers, solo practitioners.

### Tier 2: WhatsApp Cloud API (Meta) — Free up to 1K conversations/month

**What it is:** Meta's hosted API. No BSP (Business Solution Provider) needed. Free tier: 1,000 service conversations/month.

**Features:**
- Multi-agent (multiple users via API)
- Programmatic message sending (templates, notifications)
- Webhook integration (receive messages, status updates)
- Template messages (marketing, utility, authentication)
- CRM/ERP integration (REST API)
- Cloud-hosted (no on-premise server)
- Opt-in management (explicit consent required)

**Setup flow:**
```
1. Meta Business Account (business.facebook.com)
2. Create App → WhatsApp product → Quickstart
3. Verify business (phone number + business info)
4. Configure webhook URL (your backend endpoint)
5. Create message templates (submit for review)
6. Get permanent token + phone number ID
7. Send test message → go live
```

**Message types:**

| Type | Use Case | Cost (BR) |
|------|---------|:---------:|
| **Marketing** | Promoções, novidades, campanhas | ~$0.04/msg |
| **Utility** | Confirmação de agendamento, lembrete, atualização | ~$0.03/msg |
| **Authentication** | OTP, verificação de conta | ~$0.02/msg |
| **Service** | Atendimento humano (grátis até 24h window) | Free |

**24-hour window rule:** Businesses can reply for free within 24h of the customer's last message. After 24h, only template messages (paid) can be sent.

### Tier 3: WhatsApp Business Platform (On-Premise) — via BSP

**What it is:** Full API via BSP (Zenvia, Take, Wavy, Infobip). Higher volume, more features.

**When to use:** 1K+ conversations/month, need advanced features (multi-language, AI chatbot, payment integration).

---

## Automation Architecture for adsentice

### Integration Flow

```
adsentice Portal (S9) → Cloudflare Worker (Hono) → WhatsApp Cloud API
                            ↓
                    Redis :6396 (session state)
                            ↓
                    Qdrant :6352 (message history, embeddings)
```

### API Endpoints (Hono Worker)

```typescript
// POST /api/whatsapp/webhook
// Receives incoming messages + status updates from Meta
interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: [{
    changes: [{
      value: {
        messaging_product: "whatsapp";
        metadata: { display_phone_number, phone_number_id };
        contacts: [{ profile: { name }, wa_id }];
        messages: [{
          from: string;      // sender phone
          id: string;        // message ID
          timestamp: string;
          type: "text" | "image" | "interactive" | "button" | "document";
          text: { body: string };
        }];
      }
    }]
  }];
}

// POST /api/whatsapp/send
// Sends message (template or free-form within 24h window)
interface SendPayload {
  to: string;                // phone number
  type: "template" | "text" | "interactive";
  template_name?: string;    // for template messages
  template_language?: string; // "pt_BR"
  body_text?: string;        // for free-form text
  tenant_id: string;         // adsentice tenant
}

// GET /api/whatsapp/templates
// Lists approved message templates for a tenant
interface Template {
  name: string;
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  components: TemplateComponent[];
}
```

### Message Templates for SMB Segments

#### Saúde (Dentista, Clínica)

```
Template: agendamento_confirmado
Category: UTILITY
Language: pt_BR
Body:
  Olá {{1}}! Seu agendamento na {{2}} está confirmado:
  📅 {{3}} ({{4}})
  🕐 {{5}}
  👨‍⚕️ Dr(a). {{6}}
  📍 {{7}}
  
  Para confirmar presença, responda SIM.
  Para reagendar, responda TROCAR.

Template: lembrete_consulta
Category: UTILITY
Body:
  Olá {{1}}! Lembrete da sua consulta AMANHÃ:
  🕐 {{2}} com Dr(a). {{3}}
  📍 {{4}}
  
  Confirme respondendo SIM ou reagende respondendo TROCAR.
```

#### Beleza (Salão, Barbearia)

```
Template: promocao_semanal
Category: MARKETING
Body:
  ✨ Semana Especial no {{1}} ✨
  
  {{2}} — de R$ {{3}} por R$ {{4}}
  {{5}} — de R$ {{6}} por R$ {{7}}
  
  Agende agora: {{8}}
  Válido até {{9}}. Vagas limitadas!
```

#### Alimentação (Restaurante)

```
Template: cardapio_dia
Category: MARKETING
Body:
  🍽️ Cardápio de Hoje — {{1}} 🍽️
  
  Prato do dia: {{2}} — R$ {{3}}
  Inclui: {{4}}
  
  🛵 Delivery via iFood: {{5}}
  📞 Telefone: {{6}}
  🕐 Aberto até {{7}}
```

#### Serviços Profissionais (Advogado, Contador)

```
Template: prazo_documento
Category: UTILITY
Body:
  Prezado(a) {{1}},
  
  Lembrete: o prazo para {{2}} vence em {{3}}.
  
  Documentos necessários:
  • {{4}}
  
  Dúvidas? Responda esta mensagem.
```

---

## Opt-in Compliance (LGPD + Meta Policy)

### Brazil-Specific Rules

1. **Explicit opt-in required:** Customer must explicitly agree to receive WhatsApp messages
2. **Clear purpose:** State what type of messages they'll receive (marketing, utility, etc.)
3. **Opt-out easy:** "Responda SAIR para parar de receber mensagens"
4. **Data retention:** Store only necessary data (phone number, name, message history)
5. **No scraping:** Never scrape phone numbers from Google Maps or directories
6. **No purchased lists:** All contacts must be organic opt-ins

### Opt-in Collection Points (adsentice)

```
S2 (Blog) → "Receba dicas no WhatsApp" → phone input → opt-in checkbox
S6 (Lead Capture) → "Quer receber o diagnóstico por WhatsApp?" → opt-in
S10 (Raio-X) → After diagnosis → "Receber atualizações por WhatsApp?" → opt-in
S14 (Onboarding) → "WhatsApp para notificações?" → toggle during setup
```

---

## Analytics & Tracking

### Key WhatsApp Metrics

| Metric | Target SMB BR | How to Track |
|--------|:------------:|-------------|
| 24h response rate | >90% | Webhook timestamps |
| Template open rate | >95% | WhatsApp read receipts |
| Template CTR | >15% | Interactive button clicks |
| Opt-out rate | <2% | Webhook opt-out events |
| Conversation to lead % | >25% | CRM attribution |
| Avg response time | <5 min | Webhook latency tracking |
| Customer satisfaction | >4.5/5 | Post-conversation survey |

### UTM Tagging for WhatsApp Links

```
https://wa.me/5511999999999?text=Ol%C3%A1!%20Vim%20pelo%20site.
```

Add UTM to website → WhatsApp flow:
```
Website CTA → ?utm_source=site&utm_medium=whatsapp → wa.me link
```

---

## Anti-Patterns (Brazil-Specific)

| Anti-Pattern | Why It Hurts | Correct Approach |
|-------------|-------------|------------------|
| Buying WhatsApp contact lists | Illegal (LGPD), Meta ban | Organic opt-in only |
| Sending marketing without opt-in | Meta suspends number | Utility first, marketing only after opt-in |
| Using personal WhatsApp for business | No automation, no compliance | WhatsApp Business App (free) minimum |
| No response within 24h (repeated) | Customers block business | Auto-reply + human follow-up <4h |
| Template rejected (promotional language) | Meta review fails | Utility tone: "confirmação" not "promoção imperdível" |
| Sending broadcast at 8pm+ | Irritates customers, opt-out spike | Business hours only (8h-18h) |
| Ignoring LGPD data rights | Fine up to 2% revenue (R$50M cap) | Data deletion on request, privacy policy |

---

## Integration with Warp Surfaces

| Surface | WhatsApp Integration |
|---------|---------------------|
| **S10 (Raio-X Relatório)** | "Receba seu diagnóstico completo no WhatsApp" button |
| **S12 (WhatsApp Delivery)** | Primary delivery channel for cards + tips |
| **S9 (Portal do Cliente)** | WhatsApp notification preferences, template management |
| **S14 (Onboarding Wizard)** | WhatsApp setup wizard (verify number, install templates) |
| **S6 (Lead Capture)** | WhatsApp-first capture (phone number primary, email secondary) |

---

## Cross-References

- **sms**: For SMS fallback (carriers: Twilio, Zenvia)
- **local-seo**: GMB messaging button integrates with WhatsApp
- **ifood-integration**: Order notifications via WhatsApp
- **sales-enablement**: WhatsApp as sales channel
- **churn-prevention**: Re-engagement via WhatsApp templates
- **emails**: Email + WhatsApp dual-channel sequence

---

*whatsapp-business v1.0 · adsentice-original skill · 2026-07-14 · medido=verdade*
