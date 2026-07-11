# adsentice Chat — Especificação Completa

> 2026-07-11 · Inspirado no Jasper Chat, com a alma do adsentice
> Referência: https://www.jasper.ai/chat + Stage 0→7 (adsentice-lead-flow) + 73 caps DataForSEO

---

## 1. A TESE

> **O empresário NÃO sabe o que perguntar. O Jasper Chat resolve isso entrevistando o usuário. O adsentice Chat resolve isso DESCOBRINDO sozinho.**

```
Jasper Chat:  Agente pergunta → usuário responde → agente gera copy
adsentice Chat: Pipeline descobre TUDO → sistema APRESENTA → empresário decide o que aprofundar
```

---

## 2. EXPERIÊNCIA DO USUÁRIO

### 2.1 Tela inicial (antes de colocar URL)

```
┌──────────────────────────────────────────────────────────┐
│  🤖 ADSENTICE                                            │
│                                                           │
│  Sua sentinela de mercado.                                │
│                                                           │
│  Cole o site do seu negócio e descubra em segundos:       │
│  • Onde você aparece (e onde não aparece) no Google       │
│  • O que seus concorrentes estão fazendo                  │
│  • Sua reputação online e o que os clientes dizem         │
│  • Oportunidades de melhoria com impacto real             │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🔗 minhaclinica.com.br              [ Analisar ]  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  📊 Grátis · sem cartão · resultado em <10s               │
│                                                           │
│  ── Exemplos de negócios analisados ──                    │
│  🦷 Clínicas · 🍕 Restaurantes · 🛍️ E-commerce           │
│  ⚖️ Advocacia · 🏠 Imobiliárias · 💈 Salões              │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Pipeline rodando (3-10 segundos)

```
┌──────────────────────────────────────────────────────────┐
│  🤖 Analisando minhaclinica.com.br...                     │
│                                                           │
│  ✅ Site encontrado · WordPress 6.4 · LiteSpeed           │
│  ✅ Google Meu Negócio · 4.3★ · 128 reviews              │
│  ⏳ Analisando SEO...                                     │
│  ⏳ Descobrindo concorrentes...                           │
│  ⏳ Verificando reputação...                              │
│  ⏳ Rastreando redes sociais...                           │
│  ⏳ Checando anúncios ativos...                           │
│                                                           │
│  [████████████████░░░░] 78%                               │
└──────────────────────────────────────────────────────────┘
```

### 2.3 Resultado da descoberta

```
┌──────────────────────────────────────────────────────────┐
│  🤖 Pronto! Diagnóstico completo de minhaclinica.com.br   │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📊 Score de Mercado                           62/100│  │
│  │ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  │ Boa base, com ganhos rápidos em SEO e reputação   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ 🔍 SEO       │ │ ⭐ Reputação │ │ 🏢 Concorr.  │     │
│  │ 54/100       │ │ 71/100       │ │ 3º de 4       │     │
│  │ 23 keywords  │ │ 4.3★ 128 rev │ │ +7 possíveis  │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ 📍 GMB       │ │ 📱 Social    │ │ 💰 Anúncios   │     │
│  │ Ficha ativa  │ │ IG 1.2k      │ │ Não anuncia   │     │
│  │ Sem posts 6m │ │ FB 800       │ │ Concorre. A   │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                           │
│  ═══════════════════════════════════════════════════════  │
│                                                           │
│  🎯 Suas 3 prioridades (grátis):                          │
│                                                           │
│  1. ⚠️ Responda 3 reviews negativas deste mês             │
│     → 8% dos seus reviews são negativos. Isso afeta       │
│       a decisão de novos pacientes.                       │
│                                                           │
│  2. 🔍 "dentista perto de mim" = 2.900 buscas/mês        │
│     → Você está na 8ª posição. Com otimização de SEO     │
│       local, dá pra alcançar o top 3.                     │
│                                                           │
│  3. 📍 Atualize seu Google Meu Negócio                    │
│     → Sem posts há 6 meses. Perfil ativo = +35%           │
│       de chance de contato.                               │
│                                                           │
│  ═══════════════════════════════════════════════════════  │
│                                                           │
│  📊 Análises aprofundadas (consomem créditos):            │
│                                                           │
│  [ 🏢 Análise de concorrentes (5 créditos) ]              │
│  [ 🔍 Estratégia SEO completa (10 créditos) ]            │
│  [ ⭐ Plano de gestão de reviews (3 créditos) ]           │
│  [ 🔧 Auditoria técnica do site (8 créditos) ]            │
│  [ 💰 Análise de anúncios (15 créditos) ]                 │
│                                                           │
│  ─────────────────────────────────────────────────────    │
│  💬 Ou me pergunte qualquer coisa sobre seu negócio...    │
│  ┌──────────────────────────────────────────────────┐    │
│  │ "Como faço pra aparecer mais no Google?"          │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 2.4 Deep-dive (após consumir créditos)

```
┌──────────────────────────────────────────────────────────┐
│  📊 Estratégia SEO Local para minhaclinica.com.br         │
│  💰 10 créditos consumidos                               │
│                                                           │
│  ── Keywords Prioritárias (por volume × oportunidade) ──  │
│                                                           │
│  #1 "dentista perto de mim"       2.900/mês  Pos #8 → #3 │
│    📈 +127% de tráfego estimado se alcançar top 3        │
│    Ação: Otimizar title + meta + página de localização   │
│                                                           │
│  #2 "clareamento dental preço"     1.600/mês  Pos #14    │
│    📈 Subindo 22% este trimestre                         │
│    Ação: Criar página de serviço com preços e FAQ        │
│                                                           │
│  #3 "implante dentário zona sul"     880/mês  Não ranqueia│
│    Concorrente A domina (pos #1, #2, #4)                │
│    Ação: Criar conteúdo comparativo + depoimentos        │
│                                                           │
│  #4 "avaliação clínica dentária"     720/mês  Pos #3     │
│    ✅ Já está bem! Manter e monitorar                     │
│                                                           │
│  #5 "dentista emergência 24h"        650/mês  Não ranqueia│
│    Alta intenção de contato (emergência)                  │
│    Ação: Landing page dedicada + extensão de horário     │
│                                                           │
│  ── Plano de ação (em ordem de impacto) ──                │
│                                                           │
│  Semana 1-2: Otimizar keywords #1 e #2                    │
│  Semana 3-4: Criar conteúdo para #3 e #5                 │
│  Semana 5+: Monitorar ranqueamento e ajustar              │
│                                                           │
│  📈 Previsão: +40% tráfego orgânico em 90 dias            │
│                                                           │
│  ─────────────────────────────────────────────────────    │
│  💬 Tirar dúvidas ou pedir mais análises...               │
└──────────────────────────────────────────────────────────┘
```

---

## 3. ARQUITETURA TÉCNICA

### 3.1 Stack

```
Frontend: Next.js 15 + MUI (Materio) — apps/web/src/app/chat/
Backend:  apps/api/ — Railway (TypeScript)
          • POST /api/chat/discover
          • POST /api/chat/analyze
          • POST /api/chat/message
          • GET  /api/chat/thread/:id

Data:     DataForSEO MCP (oficial) — dados REAIS
          Vault (R2 + Supabase) — cofre durável
          DeepSeek (evo-llm) — síntese de estratégia
          Supabase — créditos, tenant, auth, RLS
```

### 3.2 Endpoints

#### `POST /api/chat/discover`

```typescript
// Request
{
  url: string  // minhaclinica.com.br
}

// Response (streaming SSE)
event: progress
data: {"step": "site", "status": "done", "detail": "WordPress 6.4 · LiteSpeed"}

event: progress
data: {"step": "gmb", "status": "done", "detail": "4.3★ · 128 reviews"}

event: progress
data: {"step": "seo", "status": "running"}

...

event: complete
data: {
  "business": {
    "url": "minhaclinica.com.br",
    "domain": "minhaclinica.com.br",
    "analyzed_at": "2026-07-11T15:30:00Z"
  },
  "score": {
    "overall": 62,
    "seo": 54,
    "reputation": 71,
    "competition": 48
  },
  "cards": [
    {
      "id": "seo",
      "icon": "search",
      "title": "SEO & Descoberta",
      "score": 54,
      "highlights": [
        "23 keywords ranqueadas",
        "Posição média #14",
        "\"dentista perto de mim\" = 2.900 buscas/mês · você está em #8"
      ]
    },
    {
      "id": "gmb",
      "icon": "map-pin",
      "title": "Google Meu Negócio",
      "score": 65,
      "highlights": [
        "Ficha encontrada e verificada",
        "4.3★ · 128 reviews",
        "⚠️ Sem posts há 6 meses"
      ]
    },
    {
      "id": "reputation",
      "icon": "star",
      "title": "Reputação",
      "score": 71,
      "highlights": [
        "78% positivo · 8% negativo",
        "⚠️ 3 reviews negativas sem resposta este mês",
        "+9 reviews este mês"
      ]
    },
    {
      "id": "competitors",
      "icon": "users",
      "title": "Concorrência",
      "score": 48,
      "highlights": [
        "3 concorrentes no raio de 5km",
        "Você: 3º lugar (score 62)",
        "Concorrente A lidera (score 78)"
      ]
    },
    {
      "id": "social",
      "icon": "share-2",
      "title": "Redes Sociais",
      "score": 40,
      "highlights": [
        "Instagram @minhaclinica · 1.2k seguidores",
        "Facebook · 800 curtidas",
        "❌ TikTok não encontrado"
      ]
    },
    {
      "id": "ads",
      "icon": "trending-up",
      "title": "Anúncios",
      "score": 0,
      "highlights": [
        "❌ Não está anunciando no Google",
        "Concorrente A anuncia em 12 keywords",
        "Oportunidade: ads.traffic_forecast disponível"
      ]
    }
  ],
  "tips": [
    {
      "priority": 1,
      "urgency": "high",
      "title": "Responda 3 reviews negativas deste mês",
      "detail": "8% dos seus reviews são negativos. Responder reduz o impacto e mostra que você se importa.",
      "action": "Ver reviews",
      "credit_cost": 0
    },
    {
      "priority": 2,
      "urgency": "medium",
      "title": "Otimize seu SEO local",
      "detail": "\"dentista perto de mim\" tem 2.900 buscas/mês e você está na 8ª posição. Dá pra subir para o top 3.",
      "action": "Ver estratégia SEO",
      "credit_cost": 10
    },
    {
      "priority": 3,
      "urgency": "low",
      "title": "Atualize seu Google Meu Negócio",
      "detail": "Sem posts há 6 meses. Perfis ativos recebem 35% mais contatos.",
      "action": "Ver checklist GMB",
      "credit_cost": 0
    }
  ],
  "deep_dives": [
    {
      "id": "competitor_analysis",
      "title": "Análise de concorrentes",
      "description": "Relatório detalhado: quem são, onde estão, o que fazem melhor que você",
      "credit_cost": 5,
      "caps": ["domain.competitors", "domain.keyword_gap", "domain.ranked_keywords"]
    },
    {
      "id": "seo_strategy",
      "title": "Estratégia SEO completa",
      "description": "5 keywords prioritárias + previsão de tráfego + plano de conteúdo",
      "credit_cost": 10,
      "caps": ["keyword.research", "keyword.volume", "keyword.trends", "serp.organic"]
    },
    {
      "id": "review_plan",
      "title": "Plano de gestão de reviews",
      "description": "Respostas sugeridas + estratégia para aumentar volume de reviews positivas",
      "credit_cost": 3,
      "caps": ["business.reviews.google", "content.sentiment_detailed"]
    },
    {
      "id": "technical_audit",
      "title": "Auditoria técnica do site",
      "description": "Lighthouse completo + tecnologias + correções priorizadas",
      "credit_cost": 8,
      "caps": ["on_page.lighthouse", "domain.technologies", "on_page.instant_audit"]
    },
    {
      "id": "ads_strategy",
      "title": "Estratégia de anúncios",
      "description": "Onde anunciar, previsão de tráfego, CPC estimado, orçamento sugerido",
      "credit_cost": 15,
      "caps": ["ads.traffic_forecast", "serp.ads_advertisers", "keyword.research"]
    }
  ]
}
```

#### `POST /api/chat/analyze`

```typescript
// Request
{
  thread_id: string,          // conversa atual
  deep_dive_id: string,       // qual análise executar
  credits_consumed: number    // quantos créditos vai gastar
}

// Response
{
  analysis: {
    id: string,
    type: "competitor_analysis" | "seo_strategy" | "review_plan" | "technical_audit" | "ads_strategy",
    title: string,
    content: string,          // markdown formatado
    data: object,             // dados brutos (gráficos, tabelas)
    synthesized_at: string,
    cost: {
      credits: number,
      usd: number
    }
  },
  credits_remaining: number
}
```

#### `POST /api/chat/message`

```typescript
// Request
{
  thread_id: string,
  message: string
}

// Response (streaming SSE)
event: message
data: {"content": "Com base na sua análise...", "tier": "c2-deepseek"}

event: done
data: {"message_id": "msg_abc123"}
```

### 3.3 Pipeline de Discovery (6 pipelines paralelos)

```
┌────────────────────────────────────────────────────────────┐
│  POST /api/chat/discover { url: "minhaclinica.com.br" }   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PIPELINE 1: Site Audit         (~2s)                │   │
│  │  on_page.lighthouse → performance score              │   │
│  │  domain.technologies → stack detection               │   │
│  │  domain.whois → age, registrar                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PIPELINE 2: SEO Discovery       (~3s)                │   │
│  │  domain.ranked_keywords → o que já ranqueia          │   │
│  │  keyword.research → volume de keywords do nicho      │   │
│  │  serp.organic → posição real no Google               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PIPELINE 3: GMB & Reputation    (~2s)                │   │
│  │  business.profile.gmb → ficha Google Meu Negócio    │   │
│  │  business.reviews.google → reviews + nota + volume  │   │
│  │  content.sentiment_detailed → análise de sentimento  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PIPELINE 4: Competitor Intel    (~2s)                │   │
│  │  domain.competitors → concorrentes no raio           │   │
│  │  domain.keyword_gap → keywords que eles têm e vc não │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PIPELINE 5: Ads Intelligence    (~1s)                │   │
│  │  serp.ads_advertisers → quem anuncia nas suas kw    │   │
│  │  ads.traffic_forecast → potencial de tráfego pago   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PIPELINE 6: Social Discovery     (~2s)               │   │
│  │  Web scraping → Instagram, Facebook, TikTok, etc    │   │
│  │  (APIs públicas onde disponível)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Todos rodam em PARALELO. Resultado: 3-6s total.           │
└────────────────────────────────────────────────────────────┘
```

---

## 4. MODELO DE CRÉDITOS

| Ação | Créditos | Custo DataForSEO real | Margem |
|---|---|---|---|
| **Discovery** | 0 (grátis) | ~$0.08 | Custo de aquisição |
| **Análise de concorrentes** | 5 | ~$0.03 | ~97% |
| **Estratégia SEO** | 10 | ~$0.10 | ~92% |
| **Plano de reviews** | 3 | ~$0.02 | ~95% |
| **Auditoria técnica** | 8 | ~$0.06 | ~94% |
| **Estratégia de anúncios** | 15 | ~$0.12 | ~94% |
| **Deep-dive completo** | 30 | ~$0.30 | ~92% |

### Planos

| Plano | Preço | Créditos/mês | Público |
|---|---|---|---|
| **Free** | R$0 | 0 (só discovery) | Todo mundo |
| **Starter** | R$47 | 20 | Pequeno negócio, 1 site |
| **Pro** | R$197 | 100 | Negócio estabelecido, múltiplas análises |
| **Escala** | R$497 | Ilimitados | Redes, franquias, múltiplas unidades |

---

## 5. BRAND IQ AUTOMÁTICO (Descoberto, Não Configurado)

### 5.1 O que é detectado automaticamente

| Atributo | Como detectamos | Exemplo |
|---|---|---|
| **Nicho** | keyword.research + GMB category | "clínica odontológica" |
| **Tom** | Reviews sentiment + site content | "profissional, acolhedor" |
| **Audiência** | Keywords (intent) + demographic signals | "pessoas buscando dentista perto de mim" |
| **Intents** | keyword clustering + GMB attributes | "quero mais pacientes", "não apareço no Google" |
| **Concorrentes** | domain.competitors | 3 no raio de 5km |
| **Presença digital** | Site + GMB + social discovery | Site WP, GMB ativo, IG 1.2k, sem TikTok |

### 5.2 Comparação com Jasper IQ

| | Jasper IQ | adsentice Brand IQ |
|---|---|---|
| **Configuração** | Manual (usuário preenche) | Automático (pipeline descobre) |
| **Voz/Tom** | Usuário define | Detectado dos reviews + conteúdo do site |
| **Audiências** | Usuário cria personas | Detectado das keywords (intent) |
| **Knowledge Base** | Usuário faz upload | Detectado do próprio site + GMB + redes |
| **Manutenção** | Usuário atualiza | Sistema re-audita periodicamente (sentinela) |

---

## 6. FLUXO DE CONVERSA (State Machine)

```
                    ┌─────────────┐
                    │  WELCOME    │
                    │  (sem URL)  │
                    └──────┬──────┘
                           │ usuário coloca URL
                           ▼
                    ┌─────────────┐
                    │ DISCOVERING │
                    │ (pipeline)  │
                    └──────┬──────┘
                           │ 3-6 segundos
                           ▼
                    ┌─────────────┐
                    │  DISCOVERED │
                    │ cards+tips  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                 ▼
   ┌──────────┐    ┌─────────────┐    ┌──────────┐
   │ Conversar│    │ Deep-dive   │    │  Sair /  │
   │ (chat)   │    │ (créditos)  │    │  voltar  │
   └────┬─────┘    └──────┬──────┘    └──────────┘
        │                 │
        ▼                 ▼
   ┌──────────┐    ┌─────────────┐
   │ Resposta │    │  ANALYSIS   │
   │ grounded │    │ (executando)│
   └────┬─────┘    └──────┬──────┘
        │                 │
        └─────────┬───────┘
                  ▼
           ┌────────────┐
           │ CONTINUAR  │
           │ (loop)     │
           └────────────┘
```

---

## 7. IMPLEMENTAÇÃO

### 7.1 MVP · Semana 1-2

**Backend:**
- [ ] `POST /api/chat/discover` — Pipeline 1 (Site Audit) + Pipeline 2 (SEO) + Pipeline 3 (GMB)
- [ ] Vault: salvar resultado da descoberta
- [ ] Supabase: schema `chat_threads`, `chat_messages`, `discoveries`

**Frontend:**
- [ ] Tela de boas-vindas (input URL)
- [ ] Tela de discovery (progresso animado)
- [ ] Tela de resultado (cards + tips estáticos)

### 7.2 Semana 3-4

- [ ] Pipeline 4 (Competitors) + Pipeline 5 (Ads) + Pipeline 6 (Social)
- [ ] `POST /api/chat/analyze` — primeiro deep-dive (SEO Strategy)
- [ ] Sistema de créditos (Supabase)
- [ ] `POST /api/chat/message` — chat livre com contexto do negócio

### 7.3 Semana 5-6

- [ ] Brand IQ automático (detecção de nicho, tom, intents)
- [ ] DeepSeek síntese de estratégia (cost-capped)
- [ ] SSE streaming em todos os endpoints
- [ ] UI refinada com animações (Materio + motion)

---

## 8. O QUE NÃO FAZER

| O Jasper Chat faz | O adsentice Chat NÃO vai fazer |
|---|---|
| ❌ Gerar copy de marketing | É commodity. Nosso valor é DIAGNÓSTICO |
| ❌ Editor de conteúdo (Marketing Editor) | Já existe Jasper, Notion, Google Docs |
| ❌ Agentes de criação de imagem | Já existe Midjourney, DALL-E |
| ❌ Workflows low-code (Canvas/Grid) | Nosso workflow é: descobrir → priorizar → agir |
| ❌ Brand voice configurável manualmente | Nós DESCOBRIMOS, não perguntamos |
| ❌ Biblioteca de templates de conteúdo | Nosso "template" é o pipeline de descoberta |

---

## 9. MÉTRICAS DE SUCESSO

| Métrica | Alvo |
|---|---|
| **Tempo de discovery** | <10 segundos |
| **Custo por discovery** | <$0.10 |
| **% de usuários que clicam em deep-dive** | >15% |
| **Tempo até primeiro deep-dive** | <3 minutos |
| **% de conversão Free → Starter** | >5% |
| **Créditos consumidos por cliente pagante/mês** | >80% do plano |

---

*Especificação produzida em 2026-07-11 · Inspirada no Jasper Chat, construída sobre os ativos EVO-API/rsxt/adsentice*
