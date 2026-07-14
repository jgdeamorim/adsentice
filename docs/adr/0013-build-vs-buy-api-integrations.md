---
id: adr-0013
title: Build vs Buy — Estratégia de Integração de APIs para os 8 gaps do SGA
status: proposed
date: 2026-07-14
deciders: founder, claude
extends: [adr-0008, adr-0010, adr-0011]
references:
  - SGA Health Score (sga-score.ts): 74/100, 8 features faltando, 12 arestas órfãs
  - ADR-0010 (Cloudflare Free Tier como Plataforma Enterprise)
  - z-api.io (WhatsApp API terceira, R$99/mês, Brasil)
  - Cloudflare Pages, Workers, D1, KV, Queues, R2
  - Resend (email), Stripe (pagamento), Cal.com (agendamento)
  - Meta Graph API (social media)
---

# ADR-0013 · Build vs Buy — Estratégia de Integração de APIs

## Contexto

O SGA Health Score (v0.7) detectou **8 features faltando** no grafo semântico e **12 arestas órfãs**. Esses gaps representam capacidades que o adsentice precisa para entregar os planos Sentinela, Domínio e Growth OS — mas que não existem no código hoje.

Cada gap pode ser resolvido de 3 formas:
1. **Integrar API terceira** (buy/integrate)
2. **Construir próprio** (build)
3. **Usar Cloudflare free tier** (já mapeado na ADR-0010)

## Decisão

**Adotamos uma estratégia híbrida: integrar APIs terceiras para features complexas (WhatsApp, pagamento), usar Cloudflare free para infraestrutura (hosting, cache, filas), e construir apenas o que é core (CRM no Supabase, review auto-response com DataForSEO + Brain OODA).**

### Matriz de decisão por feature

| # | Feature | Solução escolhida | Custo mensal | Prazo | Justificativa |
|:--:|---------|------------------|:-----------:|:-----:|--------------|
| 1 | **WhatsApp Hub** | **z-api.io** | R$99 | 2 dias | API REST brasileira, ilimitada, multi-instância. Construir com Meta API custaria 3-4 semanas + risco de rejeição. 60K clientes em 79 países. |
| 2 | **Email Automation** | **Resend** | R$0 (3K/mês) | 1 dia | SDK React, 3.000 emails/mês grátis. Cloudflare Email Routing não faz envio programático. |
| 3 | **Payment Gateway** | **Stripe** | %/transação | 1 semana | Padrão mundial, checkout hosted, subscription management. Pix direto: risco de homologação bancária (4-6 semanas). |
| 4 | **Landing Page** | **Cloudflare Pages** | R$0 (free) | 1 semana | Já mapeado ADR-0010. 500 builds/mês, CDN global. Construir gerador do zero: 4-6 semanas. |
| 5 | **Social Media Analytics** | **Meta Graph API** | R$0 (free) | 1 semana | Rate limit generoso para SMB. Detectar presença + básico de engajamento. Construir scraper: frágil, quebra ToS. |
| 6 | **CRM Lightweight** | **Supabase próprio** | R$0 (já temos) | 2 semanas | Já temos auth + DB + RLS. Adicionar tabela `customers`, `interactions`, `deals`. HubSpot free: 2K contatos — limitado. |
| 7 | **Review Auto-Response** | **Construir** | R$0 (já temos) | 1 semana | DataForSEO `business_reviews_google` já wireado no `voc-extractor.ts`. Brain OODA gera resposta. Só falta o endpoint POST. |
| 8 | **Agendamento** | **Cal.com self-host** | R$0 (open source) | 2 dias | Open source (AGPL), Docker, white-label. Google Calendar API: OAuth complexo, depende de conta Google do cliente. |

### Análise de custo-benefício

| Cenário | Custo/mês | Tempo implementação | Risco |
|---------|:---------:|:-------------------:|:-----:|
| **Construir tudo próprio** | R$0 | ~4 meses | Alto (Meta rejeição, homologação Pix, spam deliverability) |
| **Integrar APIs** (esta ADR) | **~R$99** | **~2 semanas** | Baixo (APIs maduras, planos free generosos) |
| **Só Cloudflare** | R$0 | ~3 meses | Médio (Cloudflare não tem WhatsApp, email sending, payment) |

**Economia estimada:** 3.5 meses de desenvolvimento evitados por R$99/mês.

### Custos mensais consolidados

| Serviço | Custo/mês |
|---------|:---------:|
| z-api.io (WhatsApp, 1 instância Ultimate) | R$99 |
| Resend (Email, 3K/mês free) | R$0 |
| Stripe (Pagamento, % por transação) | ~R$0 até 1a venda |
| Cloudflare Pages (Landing) | R$0 |
| Meta Graph API (Social) | R$0 |
| Supabase (CRM, auth, DB) | R$0 |
| DataForSEO + Brain OODA (Reviews) | R$0 |
| Cal.com self-host (Agendamento) | R$0 |
| **TOTAL** | **~R$99/mês** |

### O que NÃO vamos integrar (e por que)

| Serviço | Motivo da rejeição |
|---------|-------------------|
| **Jasper.ai** | Gerador de copy — não é nosso core. Brain OODA + templates bastam para review responses. |
| **HubSpot CRM** | Limite de 2K contatos no free. Supabase já resolve com schema próprio e sem limite. |
| **Twilio WhatsApp** | $0.005/conversa. 1.000 conversas = R$27. z-api.io é R$99 fixo ilimitado. |
| **SendGrid** | 100 emails/dia free. Resend oferece 3.000/mês com SDK melhor. |
| **Google Calendar API** | OAuth por cliente (cada lead precisaria autorizar). Cal.com self-host centraliza. |

### z-api.io — Análise detalhada

**Prós:**
- R$99/mês fixo, mensagens ILIMITADAS (vs Meta $0.005/conversa)
- API REST + JSON + Webhooks (sem dependência de SDK Meta)
- Multi-instância: gerencia múltiplos números no mesmo painel
- Usa número EXISTENTE (pessoal ou comercial) — não precisa de número dedicado
- 60.000+ clientes em 79 países
- Suporte 24/7 em português
- 2 dias de trial gratuito (sem cartão de crédito)
- Fila de mensagens, envio de arquivos até 100MB

**Contras:**
- Não é oficial Meta — risco de bloqueio se Meta mudar política
- Vendor lock-in: se sair, perde histórico de conversas
- 1 instância no plano Ultimate (R$99) = 1 número. Multi-número = Partner
- Sem HIPAA/LGPD explícito na documentação pública
- Sem SLA contratual publicado

**Mitigação de risco:** Exportar conversas periodicamente via webhooks para Supabase (audit trail próprio). Começar com trial de 2 dias para validar.

### Cloudflare — O que já cobre (ADR-0010)

| Produto | Aplicação adsentice |
|---------|-------------------|
| **Pages** | Hosting de landing pages geradas dinamicamente |
| **Workers** | Webhooks do z-api.io e Stripe, cron jobs |
| **KV** | Cache de templates de email, landing pages, respostas |
| **R2** | Assets de landing pages (imagens, CSS) |
| **Queues** | Fila de envio de emails (Resend), processamento assíncrono |
| **D1** | Cache de CRM (clientes, interações, deals) |
| **Email Routing** | `jeferson@adsentice.com.br` — email profissional grátis |

### Roadmap de implementação

#### Fase 1 · Esta semana — WhatsApp + Email + CRM
- [ ] z-api.io: criar conta, trial 2 dias, testar envio/recebimento
- [ ] `lib/whatsapp-hub.ts`: wrapper da API z-api.io (send, receive, webhook)
- [ ] Resend: criar conta, configurar domínio, testar envio
- [ ] `lib/email-hub.ts`: wrapper da API Resend (send transactional, templates)
- [ ] CRM no Supabase: tabela `customers` + `interactions` + `deals`
- [ ] `lib/crm-hub.ts`: CRUD de clientes, pipeline de deals

#### Fase 2 · Próxima semana — Landing + Review + Payment
- [ ] Cloudflare Pages: CI/CD GitHub → deploy automático
- [ ] `lib/landing-generator.ts`: template HTML + deploy via Pages API
- [ ] `lib/review-responder.ts`: DataForSEO reviews + Brain OODA → resposta
- [ ] Stripe: criar conta, configurar produtos, webhook
- [ ] `lib/payment-hub.ts`: checkout session + webhook handler

#### Fase 3 · Em 2 semanas — Social + Agendamento
- [ ] Meta Graph API: app review, token, testar
- [ ] `lib/social-hub.ts`: detectar perfis, puxar métricas básicas
- [ ] Cal.com: Docker self-host, configurar
- [ ] `lib/calendar-hub.ts`: criar/manage booking links

### Impacto no SGA Health Score

| Métrica | Antes (hoje) | Depois (pós-integração) | Delta |
|---------|:-----------:|:---------------------:|:-----:|
| Graph Coverage | 85% (46/54) | **100% (54/54)** | +15% |
| Edge Quality | 90.8% (119/131) | **100% (0 órfãs)** | +9.2% |
| SGA Score | 74 STABLE | **~90 HEALTHY** | +16 |

## Consequências

### Positivas
- 8 features em 2 semanas (vs 4 meses construindo)
- Custo total R$99/mês — cabe em 1 assinatura Sentinela (R$197)
- APIs maduras, testadas em escala, suporte em português
- Cloudflare free cobre a infraestrutura (Pages, Workers, KV, Queues, R2, D1)
- SGA Health Score sobe de 74 → 90+
- z-api.io trial de 2 dias sem compromisso permite validar antes de pagar

### Negativas
- Dependência de terceiros (z-api.io, Resend, Stripe)
- Risco Meta com z-api.io (não-oficial)
- Stripe cobra % por transação (margem reduzida)
- Cal.com self-host precisa de manutenção (Docker, updates)
- Vendor lock-in se não exportarmos dados periodicamente

## Prova (medido)

- SGA Health Score 74/100, 12 arestas órfãs, 8 features faltando (commit `b45b375`)
- z-api.io: 2 dias trial gratuito, R$99/mês Ultimate (fonte: `z-api.io`)
- Cloudflare free: 10 produtos mapeados ADR-0010
- DataForSEO `business_reviews_google` já wireado no `voc-extractor.ts`
- Supabase já provisionado: auth, DB, RLS, pg Pool
- Resend: 3.000 emails/mês free tier (fonte: `resend.com`)
- Stripe: checkout hosted, subscription API (fonte: `stripe.com/br`)
- Cal.com: open source AGPL, Docker (fonte: `cal.com`)

## Referências
- ADR-0008 (EVO-API Motor de Enriquecimento L0-L4)
- ADR-0010 (Cloudflare Free Tier como Plataforma Enterprise)
- ADR-0011 (Brain OODA)
- `lib/sga-score.ts` — SGA Health Score (74/100)
- `lib/brain/semantic-registry.ts` — 50 nós em 4 camadas
- `lib/voc-extractor.ts` — DataForSEO business_reviews_google
- `docs/NOVA ARQUITETURA INFRA-DEVOPS.txt`
