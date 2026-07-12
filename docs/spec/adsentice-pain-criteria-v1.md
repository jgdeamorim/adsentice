---
id: adsentice-pain-criteria-v1
title: "Ads​entice Pain Criteria v1.2 — Schwartz Awareness Levels + ESC Lead Scoring"
status: living
type: spec
version: "1.2.0"
date: 2026-07-12
updated: 2026-07-12T20:00:00-03:00
supersedes: "v1.1 (thresholds numéricos LEAD≥40/QUENTE≥55/URGENTE≥70)"
sources:
  - vendor/marketingskills (Corey Haines — marketing-psychology SKILL.md)
  - vendor/advertising-skills (Kim Barrett — schwartz-awareness-mapper SKILL.md)
  - vendor/esc-skills (gui.marketing — lead-scoring-architecture SKILL.md)
  - vendor/esc-skills (gui.marketing — icp-ideal-customer-profile SKILL.md)
---

# Pain Criteria v1.2 — Schwartz Awareness + Lead Scoring Composto

> **Princípio v1.2:** Thresholds numéricos arbitrários (LEAD≥40) foram substituídos por **5 níveis de consciência de Schwartz** e um **score composto** (Fit × 0.40 + Engagement × 0.35 + Intent × 0.25) inspirado no framework de lead scoring do ESC gui.marketing. O lead não recebe mais uma nota — recebe um **nível de consciência** que determina COMO abordá-lo.

---

## 1. Mudanças da v1.1 → v1.2

| v1.1 (obsoleto) | v1.2 (atual) | Motivo |
|---|---|---|
| Thresholds arbitrários: LEAD≥40, QUENTE≥55, URGENTE≥70 | 5 níveis Schwartz com messaging rules | Sem teoria por trás dos números |
| Score = soma simples de pontos | Score = Fit×0.40 + Engagement×0.35 + Intent×0.25 | Fit ≠ Engagement ≠ Intent — pesos diferentes |
| 20 sinais em 3 tiers (pontos fixos) | 20 sinais reorganizados em Fit (10) + Engagement (7) + Intent (3) | Cada sinal contribui para uma dimensão diferente |
| Classificação: SAUDÁVEL/ATENÇÃO/QUENTE/URGENTE | Classificação: Unaware/Problem Aware/Solution Aware/Product Aware/Most Aware | Baseado em 50+ anos de direct response (Eugene Schwartz) |
| Sem decay | Decay de engagement: -5pts/dia sem interação após 30 dias | Scoring sem decay gera leads fantasmas em <90 dias (ESC) |
| Sem calibração | Processo de calibração mensal documentado | Model rot sem recalibração (ESC anti-pattern #3) |

---

## 2. Os 5 Níveis de Consciência (Eugene Schwartz)

> **Fonte:** Kim Barrett `schwartz-awareness-mapper` SKILL.md + Eugene Schwartz "Breakthrough Advertising" (1966)

| Nível | O que o lead sabe | Score Composto | Ação Recomendada | Messaging Rule |
|-------|-------------------|:-------------:|------------------|----------------|
| **1. Unaware** | Não sabe que tem problema | 0-29 | Educar com conteúdo gratuito. NÃO vender. | "Você sabia que 70% dos seus clientes não te encontram no Google?" |
| **2. Problem Aware** | Sabe que tem dor mas não conhece solução | 30-49 | Agitar a dor. Mostrar que EXISTE solução. | "Sua clínica está invisível. Mas isso tem solução." |
| **3. Solution Aware** | Sabe que existem soluções mas não conhece a adsentice | 50-69 | Comparação. Por que adsentice é diferente. | "Agências tradicionais custam R$2.000/mês. O Sentinela custa R$197." |
| **4. Product Aware** | Conhece a adsentice mas não decidiu | 70-84 | Prova social + Garantia + Oferta. | "237 clínicas em SP já usam. Resultado em 7 dias ou devolvemos." |
| **5. Most Aware** | Já decidiu, só precisa fechar | 85-100 | Call to action direto. Urgência. | "Comece agora. Primeiro mês por R$47." |

### Regras de Messaging por Nível

```
Unaware → NUNCA mencionar produto. Só educar.
Problem Aware → NUNCA pular para features. Primeiro validar a dor.
Solution Aware → NUNCA fazer pitch genérico. Comparar com alternativas.
Product Aware → NUNCA vender features. Vender prova + garantia.
Most Aware → NUNCA atrasar. CTA direto, sem friction.
```

---

## 3. Score Composto (Fit × 0.40 + Engagement × 0.35 + Intent × 0.25)

> **Fonte:** ESC `guimkt-lead-scoring-architecture` SKILL.md §2.4 — adaptado para dados GMB (não temos CRM)

### 3.1 Fit Score — O lead é o ICP? (10 sinais, peso 0.40)

Avalia quão próximo o negócio está do Perfil de Cliente Ideal por categoria.

| # | Sinal | Condição | Pts |
|---|-------|----------|:---:|
| **F1** | Categoria certa | Categoria está no ICP adsentice (57 categorias SMB) | 15 |
| **F2** | Porte do negócio | Reviews ≥ 10 (negócio estabelecido, não "de garagem") | 10 |
| **F3** | Tem site | Website detectado no GMB | 10 |
| **F4** | Tem telefone | Telefone no GMB (canal de contato existe) | 5 |
| **F5** | Região atendida | Cidade está nos 22 estados mapeados | 5 |
| **F6** | Tem horário comercial | Horário preenchido no GMB (negócio ativo) | 5 |
| **F7** | Tem descrição | Descrição do negócio preenchida | 5 |
| **F8** | Tem serviços/produtos | Lista de serviços no GMB | 5 |
| **F9** | Email corporativo | Email no GMB (não genérico @gmail) | 5 |
| **F10** | CNPJ ativo | Place ID existe + negócio não marcado como fechado | 5 |

**Fit máximo: 70 pts**

### 3.2 Engagement Score — O lead se importa com presença digital? (7 sinais, peso 0.35)

Mede o nível de atividade e cuidado com canais digitais.

| # | Sinal | Condição | Pts |
|---|-------|----------|:---:|
| **E1** | Rating bom | Rating ≥ 4.0★ (lead se importa com reputação) | 15 |
| **E2** | Reviews recentes | Reviews nos últimos 60 dias (GMB ativo) | 15 |
| **E3** | Fotos atualizadas | ≥ 10 fotos no GMB | 10 |
| **E4** | Responde reviews | Owner responde reviews (engajamento com cliente) | 10 |
| **E5** | WhatsApp business | Telefone é WhatsApp (canal #1 Brasil) | 10 |
| **E6** | Posts no GMB | Publicações recentes no perfil | 5 |
| **E7** | Q&A ativo | Sessão de perguntas e respostas com atividade | 5 |

**Engagement máximo: 70 pts**

### 3.3 Intent Score — O lead está em momento de compra? (3 sinais, peso 0.25)

Sinais que indicam urgência ou intenção de contratar.

| # | Sinal | Condição | Pts |
|---|-------|----------|:---:|
| **I1** | Não reivindicado | `is_claimed` = false (NÃO controla o próprio GMB — urgente!) | 25 |
| **I2** | Rating baixo | Rating ≤ 3.5★ com ≥ 5 reviews (reputação doendo) | 20 |
| **I3** | Perfil abandonado | < 3 fotos OU 0 reviews nos últimos 90 dias | 15 |

**Intent máximo: 60 pts**

### 3.4 Fórmula do Score Composto

```
Fit Score       (0-70)  → normalizado para 0-100
Engagement Score (0-70) → normalizado para 0-100
Intent Score    (0-60)  → normalizado para 0-100

Score Composto = (Fit_norm × 0.40) + (Engagement_norm × 0.35) + (Intent_norm × 0.25)

Classificação:
  0-29  → Unaware        (não sabe que tem problema — educar)
  30-49 → Problem Aware   (sabe da dor, não conhece solução — agitar)
  50-69 → Solution Aware  (sabe que existe solução — comparar)
  70-84 → Product Aware   (considera adsentice — provar)
  85-100 → Most Aware     (pronto para fechar — agir)
```

---

## 4. Sinais de Website (Tier 3 — Enriquecimento Lighthouse)

> **Status:** Simulado até v0.3. Requer `on_page_lighthouse` por lead ($0.0001/lead).
> **Fonte dos sinais:** Corey Haines `seo-audit` SKILL.md + `analytics` SKILL.md

| # | Sinal | Condição | Dimensão | Pts |
|---|-------|----------|----------|:---:|
| **W1** | Sem HTTPS | HTTP apenas | Intent | 20 |
| **W2** | Core Web Vitals ruins | LCP > 4s OU CLS > 0.25 | Engagement | 10 |
| **W3** | Mobile ruim | Performance mobile < 40 | Engagement | 10 |
| **W4** | Sem meta tags | Title OU description ausente | Engagement | 8 |
| **W5** | Sem GA4 + Pixel + GTM | Nenhum tracking detectado | Engagement | 10 |
| **W6** | CMS desatualizado | WordPress sem updates > 6 meses | Engagement | 5 |
| **W7** | Sem blog | Último post > 90 dias | Fit | 5 |
| **W8** | Sem schema markup | JSON-LD ausente (LocalBusiness) | Engagement | 5 |

**Website máximo: +73 pts** (distribuídos nas 3 dimensões)

---

## 5. Regras Anti-Falso-Positivo (mantidas da v1.1)

| # | Regra | Motivo |
|---|-------|--------|
| **R1** | Sem GMB → ignorar | Não temos dados para avaliar |
| **R2** | < 3 reviews total → reduzir peso do rating em 50% | Amostra pequena — 1 review ruim distorce |
| **R3** | Fechado (business_status ≠ OPERATIONAL) → excluir | Não é lead |
| **R4** | Franquia/Rede (> 5 locações) → classificar ENTERPRISE | Fora do ICP SMB |
| **R5** | Sem telefone E sem website → +10 pts no Intent | Completamente offline — difícil contato, mas dor máxima |
| **R6** | Tem website mas sem dados de SEO → usar estimativa GMB | Lighthouse requer URL acessível |

---

## 6. Decay de Engagement

> **Fonte:** ESC `guimkt-lead-scoring-architecture` §5.1

```
Decay só se aplica ao Engagement Score.

Regra:
- Após 30 dias sem nova interação detectada → -5 pts/dia até mínimo de 5
- Novo sinal de engagement (review, foto, post) → reset do decay
- Fit Score e Intent Score NÃO sofrem decay (são estruturais)

Exemplo:
  Lead com Engagement 45 pts, 45 dias sem interação:
  Dia 31-45: 15 dias de decay × -5 = -75 pts
  Engagement cai para 5 (mínimo)
  Score composto cai de Solution Aware (55) para Problem Aware (38)
  → Lead "esfria" e volta para nurture
```

---

## 7. Calibração Mensal (Obrigatória)

> **Fonte:** ESC `guimkt-lead-scoring-architecture` §5.2

```
Frequência: 1º dia útil de cada mês

Checklist:
□ Taxa de conversão real: quantos leads de cada nível avançaram no pipeline?
□ % de Problem Aware que viraram Solution Aware (target: 10-20%)
□ % de Solution Aware que viraram Product Aware (target: 5-10%)
□ % de falsos positivos (lead classificado como quente que não converteu)
□ Recalcular pesos do score composto se necessário
□ Ajustar thresholds dos níveis Schwartz se necessário
□ Atualizar decay rate baseado no ciclo de vendas real
□ Documentar mudanças no changelog desta spec
```

---

## 8. Exemplos com o Novo Modelo

### Exemplo A — Clínica Urgente (Most Aware, score 87)

```
Clínica Dentária Sorriso SP:
  FIT (40%):
    F1 Categoria certa (dentista)                    +15
    F2 Porte (23 reviews)                            +10
    F3 Tem site                                       +10
    F4 Tem telefone                                    +5
    F5 Região SP (mapeada)                             +5
    F8 Tem serviços listados                           +5
    Fit: 50/70 → norm 71

  ENGAGEMENT (35%):
    E1 Rating 4.2★                                   +15
    E2 Reviews recentes (3 nos últimos 60d)           +10
    E3 Fotos (15 fotos)                               +10
    E5 WhatsApp business                              +10
    Engagement: 45/70 → norm 64

  INTENT (25%):
    I1 NÃO reivindicado (!)                           +25
    Intent: 25/60 → norm 42

  SCORE = (71×0.40) + (64×0.35) + (42×0.25)
        = 28.4 + 22.4 + 10.5
        = 61.3 → Solution Aware

  + R5 bônus (sem telefone E sem website): N/A (tem ambos)
  FINAL: 61 → Solution Aware
```

> **Nota:** Este lead tem fit bom e engagement médio, mas NÃO reivindicou o GMB — isso é um sinal de intent forte (não controla o próprio perfil = urgente). O score composto captura isso melhor que a soma simples da v1.1.

### Exemplo B — Negócio Saudável (Problem Aware, score 32)

```
Restaurante Sabor SP:
  FIT (40%):
    F1 Categoria certa (restaurante)                  +15
    F2 Porte (45 reviews)                             +10
    F3 Tem site                                       +10
    F4 Tem telefone                                    +5
    F5 Região SP                                       +5
    Fit: 45/70 → norm 64

  ENGAGEMENT (35%):
    E1 Rating 4.5★                                   +15
    E2 Reviews recentes (8 nos 60d)                   +15
    E3 Fotos (22 fotos)                               +10
    E4 Responde reviews                               +10
    E5 WhatsApp business                              +10
    Engagement: 60/70 → norm 86

  INTENT (25%):
    (nenhum sinal — lead saudável)
    Intent: 0/60 → norm 0

  SCORE = (64×0.40) + (86×0.35) + (0×0.25)
        = 25.6 + 30.1 + 0
        = 55.7 → Solution Aware

  FINAL: 56 → Solution Aware
```

> **Nota v1.2:** Este lead é SAUDÁVEL — rating alto, engajado, tudo certo. Na v1.1 seria classificado como "QUENTE" (score 55+) erroneamente. Na v1.2, o Intent Score ZERO puxa o composto para baixo, corretamente. Ele é Solution Aware (sabe que existem soluções) mas está satisfeito — não é lead urgente.

---

## 9. Mapeamento para o Pipeline de Vendas

| Nível Schwartz | Estágio Pipeline | Ação Comercial |
|---------------|-----------------|----------------|
| Unaware | Stage 0 — Suspeito | Conteúdo educativo gratuito. Raio-X automático. |
| Problem Aware | Stage 1-2 — Lead | Nutrir com dados de mercado. "Sua categoria em [cidade] tem X concorrentes." |
| Solution Aware | Stage 3-4 — MQL | Diagnóstico comparativo. "Agência custa X, Sentinela custa Y." |
| Product Aware | Stage 5-6 — SQL | Prova social + case + trial. "Dr. Silva em Campinas aumentou 30% os agendamentos." |
| Most Aware | Stage 7 — Fechamento | Proposta + urgência. "Primeiro mês R$47. Cancele quando quiser." |

---

## 10. Integração com o Discovery Engine

| v1.1 (atual) | v1.2 (proposto) |
|---|---|
| Filtros binários (AND lógico) | Score composto como métrica de ordenação |
| `websiteOnly` = filtra quem TEM site | Detecta AUSÊNCIA de site como sinal F3 (-10pts Fit) |
| `requireWhatsApp` = filtra quem TEM | Detecta AUSÊNCIA de WhatsApp como sinal E5 (-10pts Engagement) |
| `requireClaimed` = filtra quem É reivindicado | Detecta NÃO reivindicado como I1 (+25pts Intent) |
| Sem decay temporal | Decay de engagement aplicado na busca |
| Resultados ordenados por nome | Resultados ordenados por Score Composto (maior primeiro) |

---

## 11. Changelog

| Versão | Data | Mudanças |
|--------|------|----------|
| v1.0 | 2026-07-11 | Versão inicial: 20 sinais, 3 tiers, thresholds numéricos |
| v1.1 | 2026-07-11 | Ajuste de thresholds pós Category Ranker v0 falso-positivo |
| **v1.2** | **2026-07-12** | **Schwartz awareness levels substituem thresholds. Score composto Fit×0.40+Engagement×0.35+Intent×0.25. 8 sinais Website (Corey). Decay. Calibração mensal. 3 fontes ingeridas (Kim Barrett + Corey Haines + ESC gui.marketing).** |

---

*Pain Criteria v1.2 · 2026-07-12 · Schwartz + ESC Lead Scoring · 20 sinais base + 8 website (lighthouse) · 5 níveis de consciência · Score composto com pesos*
