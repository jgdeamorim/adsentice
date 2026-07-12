---
id: adsentice-pain-criteria-v1
title: "Ads​entice Pain Criteria v1.0 — Matriz de Dor Inteligente"
status: living
type: spec
version: "1.0.0"
date: 2026-07-14
---

# Pain Criteria v1.0 — O que é DOR REAL

> **Princípio:** Dor = sinal COMBINADO, não sinal isolado. Um negócio com SEO 55% NÃO está em dor. Um negócio com SEO 25% + rating 3.2 + 0 reviews em 60 dias + sem WhatsApp = DOR GRAVE.

---

## 1. TIERS DE DOR

### TIER 1 · CRÍTICO (30-40 pts cada)
Sinais de negócio QUEBRADO ou INVISÍVEL. 2 sinais Tier 1 = lead URGENTE.

| # | Sinal | Condição | Pts | Por que é dor |
|---|-------|----------|-----|---------------|
| T1.1 | **Website invisível** | Tem site E SEO < 30% | 35 | "Existe mas ninguém acha" — o pior cenário |
| T1.2 | **Reputação tóxica** | Rating ≤ 3.5 E reviews > 5 | 35 | Reviews negativas visíveis com volume suficiente |
| T1.3 | **Negócio estagnado** | 0 reviews nos últimos 60 dias E total reviews > 0 | 30 | Sem atividade recente — possível abandono |
| T1.4 | **Owner ausente** | Reviews negativas (≤2★) sem resposta do dono | 30 | Não engaja com cliente — perde vendas |
| T1.5 | **Sem presença web** | Sem website | 40 | Invisível online — só existe no GMB |

### TIER 2 · ALTO (15-25 pts cada)
Sinais de GAPS significativos mas não quebrados. Combinar 2-3 = lead QUENTE.

| # | Sinal | Condição | Pts | Por que é dor |
|---|-------|----------|-----|---------------|
| T2.1 | **SEO abaixo da média** | Tem site E SEO 30-60% | 20 | Abaixo da média BR (~50%). Melhorável |
| T2.2 | **Reputação medíocre** | Rating 3.5-3.8 E reviews > 10 | 20 | Não é terrível mas afasta clientes |
| T2.3 | **Perfil abandonado** | < 3 fotos no GMB | 20 | Parece largado — cliente desconfia |
| T2.4 | **Sem WhatsApp** | Tem telefone mas NÃO é WhatsApp | 15 | Canal #1 de venda no Brasil ausente |
| T2.5 | **Pressão competitiva** | ≥ 3 concorrentes no raio de 3km | 15 | Mercado disputado — precisa se destacar |
| T2.6 | **Reviews caindo** | Média últimos 60 dias < média geral | 20 | Tendência negativa — vai piorar |

### TIER 3 · MODERADO (5-10 pts cada)
Sinais de OPORTUNIDADE. Sozinhos não qualificam. Combinados com Tier 1/2 = reforço.

| # | Sinal | Condição | Pts | Por que é dor |
|---|-------|----------|-----|---------------|
| T3.1 | **Sem analytics** | Tem site MAS sem GA4/Facebook Pixel | 10 | Não mede tráfego — decisões no escuro |
| T3.2 | **Não anuncia** | Não detectado Google Ads ativo | 8 | Não investe em aquisição paga |
| T3.3 | **CMS desatualizado** | WordPress sem updates > 6 meses | 8 | Risco de segurança |
| T3.4 | **Sem blog/conteúdo** | Site sem blog ou última postagem > 90 dias | 5 | Sem estratégia de conteúdo |
| T3.5 | **Mobile ruim** | Performance mobile < 40 | 10 | 70%+ do tráfego é mobile no BR |

---

## 2. THRESHOLDS DE CLASSIFICAÇÃO

| Score Total | Classificação | Ação |
|------------|--------------|------|
| **0-25** | 🟢 SAUDÁVEL | Não é lead. Monitorar. |
| **26-45** | 🟡 ATENÇÃO | Lead potencial. Nutrir com conteúdo. |
| **46-65** | 🟠 QUENTE | Lead qualificado. Abordar com diagnóstico. |
| **66-100** | 🔴 URGENTE | Múltiplas dores críticas. Contato IMEDIATO. |

---

## 3. REGRAS ANTI-FALSO-POSITIVO

| Regra | Motivo |
|-------|--------|
| **Negócio sem GMB** → ignorar | Não temos dados para avaliar |
| **Negócio com < 3 reviews total** → reduzir peso de rating | Amostra pequena — 1 review ruim distorce |
| **Negócio FECHADO (business_status ≠ OPERATIONAL)** → excluir | Não é lead |
| **Negócio com website mas sem dados de SEO** → usar estimativa GMB | Lighthouse requer URL acessível |
| **Franquia/Rede (> 5 locações)** → classificar como ENTERPRISE | Fora do ICP SMB |
| **Sem telefone E sem website** → +10 pts bônus | Completamente offline — difícil contato |

---

## 4. EXEMPLOS

### Lead URGENTE (score 85)
```
Clínica Dentária XPTO:
  T1.1 Website invisível:     SEO 22%              +35
  T1.2 Reputação tóxica:      Rating 3.2★ (8 rev)  +35
  T1.4 Owner ausente:         2 reviews 1★ sem resp +30
  T2.3 Perfil abandonado:     1 foto no GMB         +20
  T3.1 Sem analytics:         só tem WordPress      +10
  ANTI-FP: Sem telefone e sem website               +10
  ─────────────────────────────────────────────────────
  SCORE: 140 → 🔴 URGENTE
```
Este dentista tem site que ninguém acha, pacientes reclamando e ele não responde, perfil largado. **Qualquer solução de marketing digital melhora a vida dele.**

### NÃO-LEAD (score 15)
```
Restaurante Sabor SP:
  T2.1 SEO abaixo da média:   SEO 48%              +20
  T3.2 Não anuncia:           sem Google Ads        +8
  ─────────────────────────────────────────────────────
  SCORE: 28 → 🟡 ATENÇÃO (não é lead quente)
```
Tem site razoável, SEO médio, boa reputação. **Não precisa de ajuda urgente.**

---

## 5. CALIBRAÇÃO (A/B futuro)

| Teste | Variante A | Variante B | Métrica |
|-------|-----------|-----------|---------|
| Threshold Tier 1 | SEO < 30% | SEO < 40% | Taxa de conversão lead→cliente |
| Peso WhatsApp | 15 pts | 25 pts | % leads com WhatsApp que convertem |
| Reviews 60 dias | 0 reviews = +30 | < 2 reviews = +20 | Correlação com fechamento |
| Bônus anti-falso-positivo | +10 sem telefone | +0 sem telefone | Qualidade do lead (se converte ou não) |

---

*Critérios v1.0 · 2026-07-14 · Recalibração após falso-positivo do Category Ranker v0*
