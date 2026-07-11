# Análise dos Repositórios gojasper — Valor para adsentice

> 2026-07-11 · Re-análise após probe público
> Fonte: https://github.com/gojasper (10 repos, 4 originais + 5 forks + 1 org)

---

## 1. VISÃO GERAL

O GitHub do Jasper NÃO é o código do produto (API, MCP, agentes são proprietários).
É uma **vitrine de P&D** com 3 camadas de valor:

| Camada | Repos | Valor |
|--------|-------|-------|
| **Protocolo (ouro)** | `ag-ui` fork | Padrão de interoperabilidade agente↔UI |
| **Pesquisa (prata)** | LBM, flash-diffusion, nano-t2i | Técnicas de IA reutilizáveis |
| **Tooling (bronze)** | style-rank, primitives, lexical | Ferramentas de avaliação e UI |

---

## 2. OURO: `ag-ui` (fork do Agent-User Interaction Protocol)

### O que é
Fork do protocolo AG-UI — a camada de apresentação que padroniza como agentes conversam com frontends. MIT license.

### Por que o Jasper forkou
Jasper é o principal contribuidor corporativo do AG-UI. O fork deles contém:
- **Integração com Jasper IQ** — brand voices, audiences, style guides como ferramentas frontend
- **Generative UI** adaptado para cards de marketing (não só forms)
- **Renderers de agente** para os 100+ agentes Jasper

### O que extrair
- **Event catalog completo** (24 eventos em 6 categorias) → nossa spec de eventos
- **State management** (snapshot + JSON Patch delta) → Brand IQ como shared state
- **Interrupts** (human-in-the-loop) → nosso credit gate
- **Frontend tool calls** → nossos 6 pipelines como tools
- **Generative UI** (draft) → cards + tips como UI components, não texto

### Ação
Implementar AG-UI nativamente no adsentice Interaction Hub. Já temos:
- `adsentice_kg_*` = backend tools (MCP)
- 6 pipelines = sub-agents com scoped state
- Cards + tips + score = generative UI output

---

## 3. PRATA: Pesquisa de IA (LBM + flash-diffusion + nano-t2i)

### 3.1 LBM (846★, ICCV 2025 Highlight)
**Latent Bridge Matching for Fast Image-to-Image Translation**

Técnica de tradução imagem→imagem com matching no espaço latente.

**Valor para adsentice:** Médio. NÃO é sobre geração de imagem de marketing — é pesquisa pura de visão computacional. MAS o conceito de "latent bridge" (ponte latente) é uma metáfora arquitetural poderosa:

```
Espaço A (dados brutos)  ──bridge──►  Espaço B (insights)

DataForSEO raw JSON     ──LLM──►     Cards + tips
GMB profile data        ──embed──►   Brand IQ
Site crawl              ──pipeline──►Score de mercado
```

Cada pipeline do adsentice é uma "ponte latente" entre dados brutos e insights acionáveis. Esse padrão deve ser documentado na nossa arquitetura.

### 3.2 flash-diffusion (662★, AAAI 2025 Oral)
**Aceleração de modelos de difusão condicionais**

Pesquisa sobre como acelerar geração de imagem. 

**Valor para adsentice:** Baixo (imagem). MAS a técnica de "flash" (aceleração) é relevante: nosso pipeline discovery precisa ser rápido (<10s). Estratégias de paralelismo e cache do flash-diffusion podem informar otimização dos nossos pipelines.

### 3.3 nano-t2i (22★)
**Código mínimo de treino text-to-image**

**Valor para adsentice:** Baixo. Código educacional.

---

## 4. BRONZE: Tooling (style-rank + primitives + lexical)

### 4.1 style-rank (14★)
**Benchmarking framework para modelos de estilo generativo**

Framework unificado para avaliar qualidade de estilo em outputs generativos.

**Valor para adsentice: ALTO.** Este é o repo mais subestimado. O framework avalia:
- Consistência de estilo
- Fidelidade ao prompt
- Qualidade perceptual

**Aplicação direta:** Podemos adaptar o style-rank para avaliar:
- **Qualidade dos cards** (output dos pipelines): clareza, acionabilidade, precisão
- **Brand voice consistency**: o output segue a voz da marca?
- **Tip quality**: as recomendações são realmente úteis?

É essencialmente um **eval harness para conteúdo de marketing** — exatamente o que precisamos para validar a qualidade do output dos pipelines ANTES de entregar pro usuário.

### 4.2 primitives (fork Radix)
**Componentes UI headless (Radix Primitives)**

Jasper fork do Radix para sua UI. 

**Valor para adsentice:** Médio. Nós já usamos Materio (MUI-based), mas o Radix é mais leve e composable. Se migrarmos para uma UI mais customizada no futuro, os componentes Radix (Dialog, Select, Tabs, Accordion) são a base. O fork do Jasper pode conter customizações relevantes para UI de marketing.

### 4.3 lexical (fork facebook/lexical)
**Editor de texto rico extensível**

**Valor para adsentice:** Baixo-médio. Relevante se tivermos um editor de texto no chat (composer rico com sugestões AI). Mas não é prioridade MVP.

---

## 5. O QUE NÃO ESTÁ NO GITHUB (mas inferimos)

| Componente | Onde está | Como acessar |
|-----------|-----------|-------------|
| MCP server | npm `@gojasper/mcp-server` | `npx -y @gojasper/mcp-server` (precisa API key) |
| API backend | `api.jasper.ai` | REST (precisa Business plan) |
| Agent definitions | app.jasper.ai | Browser + bridge :8992 |
| Brand IQ models | Jasper app | Proprietário |
| Pipeline engine | Jasper app | Proprietário |

---

## 6. PLANO DE EXTRAÇÃO (3 FASES)

### Fase 1: Imediato (sem browser, já feito ✅)
- [x] llms.txt + docs + OpenAPI inline
- [x] Context Items schema (6 tipos)
- [x] MCP OAuth OIDC completo
- [x] AG-UI event catalog (24 eventos)
- [x] Interrupts + shared state patterns

### Fase 2: Bridge (precisa browser + login Jasper)
- [ ] `__NEXT_DATA__` com agent definitions reais
- [ ] CSS custom properties + design tokens
- [ ] Network waterfall (endpoints reais)
- [ ] Feature flags + ambiente config
- [ ] `python3 tools/adsentice_jasper_probe.py`

### Fase 3: Deep-dive (precisa API key Jasper Business)
- [ ] MCP tools com schemas de input reais
- [ ] Brand voices + audiences + knowledge examples
- [ ] Template input schemas completos
- [ ] Testar `npx -y @gojasper/mcp-server`

---

## 7. CONCLUSÃO

Os repos gojasper **não são de jogar fora**. São 3 camadas:

1. **`ag-ui` fork = ouro** — o protocolo que devemos implementar nativamente. Não é "só chat", são 13+ padrões de interação que já mapeamos para o adsentice.

2. **`style-rank` = bronze subestimado** — framework de avaliação de qualidade que podemos adaptar para validar output dos pipelines. É o nosso eval harness.

3. **LBM + flash-diffusion = prata conceitual** — padrões arquiteturais ("latent bridge", "flash" parallelism) que inspiram nosso design de pipelines, mesmo sendo pesquisa de imagem.

O repos que NÃO agregam (nano-t2i, lexical, y-quill, og-image, .github) são forks de dependências ou código educacional — sem valor direto.
