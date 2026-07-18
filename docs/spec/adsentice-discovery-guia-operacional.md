# Discovery — Guia Operacional (Passo a Passo)

> **medido=verdade** · atualizado 2026-07-18 (v090) · fonte: código em produção + selos v088-v090

## O que cada etapa faz (e NÃO faz)

### Pre-flight ($0.01380/município · limit=5)

**Faz:** conta EXATA de listings (total_count), qualidade do mercado (rating médio, % claimed, % com website), custo real do L0 completo (total_count ÷ 100 × $0.048) por município.

**NÃO faz:** NÃO salva place_ids no banco. NÃO enriquece leads. NÃO pode ser usado para L2/L3 depois.

**Quando usar:** para decidir SE e ONDE investir. O pre-flight de BH+Betim custou $0.0276 e revelou que Betim (PIB R$127K, só 40% claimed, 2★) é prioridade máxima.

### L0 · Search ($0.048/página · 100 leads/pág)

**Faz:** busca listings NOVOS no Google Meu Negócio via DataForSEO. Retorna 11 campos (title, category, address, rating, place_id, lat/lng, is_claimed). **Persiste os place_ids no banco.**

**NÃO faz:** NÃO preenche phone, website, fotos (esses vêm do L1). NÃO preenche city/district (usa Nominatim fallback).

**Pode rodar SEM L1?** Sim. Os 11 campos básicos são salvos. Mas sem L1 você perde contato (phone/website).

**Custo MG:** BH 190 páginas ($9.12) + Betim 33 páginas ($1.58) = $10.70 para 22.300 listings.

### L1 · GMB Profile ($0.0054/POST batch · flat rate)

**Faz:** enriquece o LEAD com 27 campos do Google Business Profile (phone, website, fotos, descrição, horários, city, district, categorias). 1 POST processa até 100 place_ids em batch.

**NÃO faz:** NÃO audita o website (L2). NÃO extrai redes sociais (L3).

**⚠️ RESTRIÇÃO:** L1 só funciona JUNTO com L0. **NÃO funciona em modo re-enrich** (♻️ L0 off). Motivo: a API `my_business_info` recebe keywords de busca, não place_ids.

**Custo MG:** $0.0108 para 2 POSTs (50+50 leads). Para enriquecer TODOS os 22.300: ~$1.20.

### L2 · Website + SEO ($0.010125/lead com website)

**Faz:** audita o website do lead (onpage score, meta tags, word count, links, CMS, analytics, domain rank). **Cache Redis 30 dias** ($0 na re-execução).

**NÃO faz:** NÃO funciona sem website (óbvio — ~60% dos leads têm). NÃO extrai redes sociais (L3). NÃO faz Lighthouse (endpoint separado: $0.00425).

**Pode rodar DEPOIS do L0+L1?** Sim — via **re-enrich** (♻️ L0 off). O re-enrich opera sobre place_ids já no banco, $0 de search.

**Custo MG (top 50):** ~$0.61 (30 leads com website). **Custo MG (todos os 13.400 sites de BH):** ~$135.

### L3 · Social & Contatos ($0.0005/lead · 20× mais barato com cache L2)

**Faz:** crawla o website atrás de redes sociais (Instagram, Facebook, etc.), emails e WhatsApp.

**NÃO faz:** NÃO audita SEO (isso é L2).

**⚠️ DEPENDÊNCIA:** se você NÃO rodou L2 antes, o L3 paga $0.01 extra pelo tech (domain_technologies) que o cache L2 já teria. Sempre rode L2 antes de L3.

### L4 · IBGE Context ($0 · sempre)

**Faz:** enriquece com população, PIB per capita, densidade demográfica e renda média do município.

**Pode desmarcar?** Sim. Mas é $0 e os dados alimentam o scoring (ADR-0024). Recomendado SEMPRE.

---

## Matriz de modos (o que funciona vs o que NÃO funciona)

| Modo | L0 | L1 | L2 | L3 | L4 | Funciona? |
|---|---|---|---|---|---|---|
| Pre-flight | limit=5 | — | — | — | — | ✅ metadata apenas |
| L0 puro | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ 11 campos |
| L0+L1 | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ 38 campos |
| L0+L1+L4 | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ + IBGE $0 |
| L0+L1+L2+L4 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ top 50 |
| L0+L1+L2+L3+L4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ pipeline completo |
| Re-enrich L2 | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ $0 search |
| Re-enrich L2+L3 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ $0 search |
| Re-enrich L1 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ arquitetura não suporta |
| Só L1 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ sem L0 não tem keywords |
| Só L4 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ sem listings |

---

## Fluxo recomendado (por objetivo)

### "Quero prospectar uma cidade NOVA" (ex: MG)
```
1. Pre-flight (10 categorias, 2 municípios) → $0.0276
   └─ Análise: Betim > BH. Prioridade: Betim primeiro.
2. L0+L1+L4 (top 50, Betim) → ~$1.59
   └─ 50 melhores leads com perfil GMB completo + IBGE
3. Re-enrich L2 (♻️, top 50) → ~$0.30
   └─ Auditoria de website nos mesmos 50 leads
4. Se conversão >5%: expandir para todos os 3.209 de Betim
```

### "Quero enriquecer leads que JÁ CAPTUREI" (ex: Vitória)
```
1. Re-enrich L2+L3+L4 (♻️, top 50, Psychologist) → ~$0.53
   └─ 19 leads L2 persistidos, WordPress detectado
2. Re-enrich L3 (♻️, top 50) → ~$0.015
   └─ Redes sociais + WhatsApp + emails
```

### "Quero só AUDITORIA de website nos meus leads"
```
1. Re-enrich L2 (♻️, top 50, Dentist, Vitória) → $0.51
   └─ 50 sites auditados, zero search, zero L1
```

---

## Anti-padrões (o que NÃO fazer)

1. ❌ **Executar L0 sem antes decidir**: 22.300 listings de uma vez sem saber se o mercado vale o investimento. O pre-flight ($0.03) evita isso.

2. ❌ **L3 sem L2**: paga $0.0105/lead em vez de $0.0005. O cache L2 barateia 20×.

3. ❌ **Re-enrich sem antes ter L0 na cidade**: o re-enrich opera sobre place_ids JÁ no banco. Se você só fez pre-flight, não tem nada para enriquecer.

4. ❌ **L0+L1 completo (todos os leads) em mercado desconhecido**: 22K leads × $0.0054 = $120 de L1 sem saber se a cidade converte. Comece com top 50.

5. ❌ **Re-enrich sem pre-flight no popup**: o popup do re-enrich agora mostra a VERDADE da base (quantos leads, quantos já-L2). Sempre confira antes de confirmar.

---

## Doutrina (regras invioláveis)

1. **medido=verdade**: o popup mostra custos exatos (não estimativas "60% histórico"). Se está escrito "$0.3038 histórico", é estimativa — espere o preflight da base.
2. **Pre-flight é ferramenta de decisão, não pré-requisito**: você pode fazer pre-flight hoje e L0 daqui a 1 mês.
3. **L2/L3 são INDEPENDENTES do L0**: uma vez que o lead tem place_id no banco, o re-enrich funciona.
4. **L4 é $0 e SEMPRE recomendado**: se for pagar qualquer outra camada, o contexto IBGE é grátis e valioso.
5. **Série temporal**: discovery_listings tem 1 row por place_id POR search. Toda leitura deve dedupar (migration 016).
