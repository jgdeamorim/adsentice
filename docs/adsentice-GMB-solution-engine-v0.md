# adsentice · Motor de Solução (Google Meu Negócio → Score → Melhoria → Proposta) v0

> Aterrado no MEDIDO (não inventado): os campos REAIS que o DataForSEO retorna do Google Meu Negócio
> (`/v3/business_data/google/my_business_info/live` = 66 campos) + reviews + Q&A + busca por região.
> Este é o "cérebro de negócio" do adsentice: o que capturamos, como pontuamos, qual dor achamos, qual proposta enviamos.

---

## 1. O que o Google Meu Negócio nos dá (MEDIDO · 66 campos · o gap era só o translator)

**Boa notícia:** quase tudo que o founder listou EXISTE no raw do DataForSEO. Nossa canonical GMB antiga expunha só
10 campos — pro adsentice precisamos do **translator RICO** (expor os campos abaixo).

| você pediu | campo REAL no `my_business_info` | temos? |
|---|---|---|
| info do negócio | `title` · `original_title` · `category` · `category_ids` · `description` · `snippet` | ✅ |
| endereço | `address` · `address_info` (city/zip/lat/lng) | ✅ |
| telefone | `phone` | ✅ |
| **website / landing** | `url` · `domain` · `contact_url` | ✅ |
| delivery / serviços | `attributes` (delivery, takeout, serviços, acessibilidade, pagamento…) | ✅ (em attributes) |
| agendamento / catálogo | `book_online_url` · `price_level` | ✅ parcial |
| **fotos** | `total_photos` · `main_image` · `logo` | ✅ |
| **reviews** ⭐ | via `business.reviews.google`: `rating` · `rating_distribution` · reviews[] (texto·nota·data·autor·**owner_answer**) | ✅ |
| reputação temas | `place_topics` (o que as pessoas mencionam) | ✅ |
| reivindicação | `is_claimed` (ficha reivindicada ou órfã) | ✅ |
| horário | `work_time` | ✅ |
| concorrentes na ficha | `people_also_search[]` (title·rating) | ✅ |
| **whatsapp** | ⚠️ não é campo direto — pode estar em `attributes`/`phone` (validar) | parcial |
| **redes sociais** | ⚠️ não é campo direto do GMB — cruzar com `serp.organic`/scrape do `url` | gap |
| catálogo de produtos | ⚠️ parcial (`book_online_url`) — o resto vem do website | gap |

**Lead discovery por REGIÃO** (`business_listings/search`): retorna fichas por `categories`+`location` →
`title·category·address·rating·rating_votes·place_id·cid·lat·lng·is_claimed`. **`is_claimed=false` = lead QUENTE**
(negócio que nem reivindicou a ficha). Esse é o Objetivo 1 (captação por região).

---

## 2. As 7 dimensões de SCORE (cada uma de sinais REAIS → uma DOR → uma proposta)

O score do lead é a média ponderada de 7 dimensões. Cada dimensão tem sinal medido, gap detectável, e a solução que vende.

| # | dimensão | sinal REAL (campo) | gap = DOR (lead quente) | solução/proposta |
|---|----------|--------------------|--------------------------|-------------------|
| 1 | **Ficha/Presença** | `is_claimed` · `category` · `description` · `work_time` · `phone` | não reivindicada · sem descrição · horário vazio · sem categoria | **Setup GMB grátis** (tip) → gestão de ficha (pago) |
| 2 | **Visual/Fotos** | `total_photos` · `main_image` · `logo` | poucas/zero fotos · sem logo | **Pacote de fotos + logo** · mockup grátis |
| 3 | **Reputação** ⭐ | `rating` · `rating_distribution` · `reviews_count` · recência · **taxa de `owner_answer`** | nota baixa · poucas reviews · não responde reviews | **Gestão de reputação** (responder + campanha de reviews) |
| 4 | **Website/Digital** | tem `url`/`domain`? + `on_page.instant_audit` + `on_page.lighthouse` (se tem site) | sem site · site quebrado/lento | **Redesign / landing** (mockup grátis → build pago) |
| 5 | **Engajamento** | `business.qa` respondidas? · `book_online_url`? · `attributes` ricos? | Q&A ignorado · sem agendamento online · atributos vazios | **Automação de atendimento** (whatsapp/agendamento) |
| 6 | **Descoberta/Ranking** | `serp.maps`/`serp.local_finder` posição · `place_topics` · `people_also_search` | fora do top do mapa · concorrentes à frente | **SEO local + GEO** (`serp.ai_mode`+`ai.llm.responses`) |
| 7 | **Anúncios/ROI** | `serp.ads_advertisers` (anuncia?) · tem funil? | sem tráfego pago · sem funil/retenção | **Funil + campanha + follow-up/retenção** (o ROI) |

---

## 3. O fluxo do adsentice (do lead à proposta · Objetivo 1)

```
① CAPTAÇÃO POR REGIÃO
   business_listings/search(categories, location) → N fichas · filtra is_claimed=false + rating baixo = leads quentes
        │
② ENRIQUECER cada lead
   my_business_info(place_id) → 66 campos · reviews.google → reputação · qa → engajamento
   + (se tem url) on_page.instant_audit/lighthouse · serp.maps/local_finder posição · serp.ads_advertisers
        │
③ SCORE (as 7 dimensões) → score 0-100 + pontos de melhoria priorizados (a DOR ordenada)
        │
④ PROPOSTA automática (o funil adsentice):
   · PLANO GRÁTIS: diagnóstico + 3 tips + 1 mockup (redesign da ficha OU da landing)
   · PLANOS PAGOS: redesign · conteúdo validado sobre a dor da persona · funil · follow-up · retenção
        │
⑤ ENVIO (whatsapp/email) → CTA → cliente vira receita
```

**O que torna a proposta VALIDADA (não chute):** cada ponto de melhoria cita o sinal real ("você tem 2 fotos e nota
3.8 com 40% de reviews sem resposta" → dado, não opinião). É o `medido=verdade` virando argumento de venda.

---

## 4. Os gaps concretos a construir (honesto · o que falta pro motor rodar)

1. **Translator GMB RICO** — expor os 66 campos (hoje só 10). É a base de tudo. Sem `url`/`total_photos`/`attributes`/
   `place_topics`/`rating_distribution` não dá pra pontuar 5 das 7 dimensões.
2. **`business_listings.search` translator** — está `translator_pending`. É o Objetivo 1 (captação por região). Prioridade.
3. **Motor de SCORE** — as 7 dimensões como pesos data-driven (Manifest · não hardcode). O "manager-first" gerencia ISTO.
4. **whatsapp/redes sociais** — não vêm do GMB direto; cruzar com scrape do `url` + `serp.organic`. Gap menor.
5. **Gerador de proposta** — o brain/vec() sintetiza os pontos de melhoria → texto de proposta + escolhe o mockup.
6. **Gerador de UI/mockup** — o ponto DIFÍCIL (a dashboard adsentice + os mockups de redesign). É a última fatia.

---

## 5. Onde isto encaixa no BLUEPRINT da plataforma (manager-first primeiro)

O founder cravou: **"a base backend de gerenciamento semântico não está sólida — manager-first sólido ANTES do norte."**
Concordo. A sequência:

- **Passo 1 · o MANAGER sólido** (o Registry/Control Plane do blueprint · managed-first): as **Capabilities** (GMB rico,
  reviews, listings, audit, serp), as **7 dimensões de score** e as **soluções** como entidades declarativas (Manifest),
  geridas numa Control Plane. É a fundação que faltou (o que quebrou o EVO-API foi gerir isto por um KG monolítico).
- **Passo 2 · o motor de captação+score** (Data/AI Plane): o fluxo §3 rodando managed (Supabase pgvector + Railway).
- **Passo 3 · a proposta automática** (o vec() semântico · o moat).
- **Passo 4 · a dashboard + UI/mockup do adsentice** (o ponto difícil · geração de UI · por último).

**Regra que carrega do EVO-API:** semântico ⊥ físico · Manifest declarativo · nada hardcode · score/health vem de Eval
real. A soberania (rsxt) fica pra DEPOIS do dinheiro (driver atrás da interface).

---

## 6. A pergunta que fecha esta fatia

Pra começar o **manager-first sólido**, a 1ª entidade a modelar é a **Capability** (GMB rico + as 7 dimensões de score).
Confirma que o **vertical é este** (captação de leads locais por região via GMB → score → proposta) e eu detalho o
**metamodelo do manager** (as entidades + o Manifest da Capability + a Control Plane) como o próximo documento.
