---
id: adsentice-design-antigravity-insights
title: "Ads​entice Design — Insights do Antigravity + Plugin System"
status: living
type: spec
version: "1.0.0"
date: 2026-07-15
sources:
  - antigravity/mapping/38-design-system-complete.md (Aesthetic Enforcement, Brand DNA 6 pilares)
  - antigravity/mapping/36-knowledge-item-system.md (KI Priority Absolute Rule)
  - antigravity/mapping/59-multi-model-routing-cascade-config.md (ModelProvider, PricingType)
  - antigravity/mapping/08-knowledge-rag.md (Dual-layer RAG: Workspace + Knowledge Items)
  - antigravity/mapping/17-telemetry.md (Clearcut telemetry, commonProperties)
---

# Antigravity Insights → Adsentice Design

## 1. O que o Antigravity faz melhor

### 1.1 Aesthetic Enforcement como CONSTRAINT

O Antigravity trata design não como preferência, mas como **constraint de nível de segurança**:

> "Aesthetic Enforcement: Modern design aesthetics. Não é uma preferência — é uma constraint. O agente recusa produzir UI que não atinja o padrão."

**Como adsentice absorve:** Nosso M4 critique já tem `philosophyConsistency` (peso 0.15). Vamos elevar para **FAIL HARD**: se detectar cor hardcoded, componente sem token, ou placeholder genérico → critique.score -= 3 pontos.

```
Regra de Enforcement adsentice:
  ❌ color: #2563EB direto      → FAIL (usar var(--color-primary))
  ❌ font-size: 16px            → FAIL (usar var(--text-base))
  ❌ border-radius: 8px         → FAIL (usar var(--radius))
  ❌ "Lorem ipsum" placeholder  → FAIL (invocar gerador de copy)
  ❌ Sem dark mode tokens       → FAIL (obrigatório)
```

### 1.2 KI Priority Absolute Rule

KIs (Knowledge Items) têm **prioridade absoluta** sobre suposições do agente:

> "O agente não 'decide' usar Zod em vez de Yup porque leu um artigo. A decisão já foi tomada e está registrada no KI."

**Como adsentice absorve:** Nosso REGRA DE OURO já implementa isso — presets da Matriz Warp decidem, Qdrant apenas enriquece. Mas podemos formalizar como **Design Knowledge Items (DKIs)** — versão adsentice:

```
DKI Priority:
  1. Matriz Warp presets        → OVERRIDE (autoridade máxima)
  2. Segment business keywords  → OVERRIDE
  3. Qdrant design-knowledge    → ENRICH (nunca override)
  4. User preference            → ENRICH
```

### 1.3 Brand DNA — 6 Pilares

O Antigravity analisa qualquer site por 6 dimensões:

| Pilar | O que adsentice tem | Gap |
|-------|-------------------|-----|
| Color Systems | ✅ Presets por segmento (Matriz Warp) | Podemos adicionar HSL palette rules |
| Typography | ✅ heading + body por segmento | Adicionar font-weight scale |
| Spacing & Grid | ✅ compact/default/airy | Adicionar regra de grid 8px |
| Visual Language | ⚠️ Parcial (radius, shadow) | Falta: explicit glassmorphism rules |
| Motion | ✅ zero/subtle/moderate/playful | Adicionar spring physics |
| Iconography | 🔴 Ausente | Novo pilar para adsentice |

**Adicionar ao M9 tokens-composer:**
- `--icon-style`: "outline" | "filled" | "dual" | "bold"
- `--icon-size-scale`: relação com tipografia (1.25× text-base para ícones de ação)

### 1.4 Multi-Model Routing com PricingType

O Antigravity tem routing por custo do modelo:

```
STATIC_CREDIT (free) → modelo padrão
API (pago)           → upgrade automático para tarefas complexas  
BYOK (user key)      → usuário fornece API key
```

**Como adsentice absorve:** Nosso AgentRouter já implementa `route(intent)` por complexidade. Adicionar dimensão de custo:

```
critique simples (<100 tokens)  → Qwen $0
critique médio (100-500)        → DeepSeek $0.001  
critique complexo (>500)        → Claude Code (sub-agente)
```

## 2. Plugin System

### Inspiração Antigravity

O Antigravity não tem "plugins" explícitos — mas o **Extension API** (#19) e o **Skill System** (#37) formam um sistema de plugins implícito:

```
Extension → contribui views, comandos, keybindings
Skill     → unidade atômica de capacidade (SKILL.md)
KI        → conhecimento cross-session extraído de conversas
```

### Plugin System adsentice

```
packages/warp/src/plugins.ts

Interface Plugin {
  id: string
  name: string
  description: string
  mode: 'skill' | 'agent' | 'mcp-connector' | 'pipeline'
  capabilities: string[]
  context: { requires: string[]; provides: string[] }
  
  // Lifecycle (Antigravity-style)
  detect(): Promise<boolean>
  activate(): Promise<void>
  deactivate(): Promise<void>
  
  // Pipeline hooks
  onEnrich?(ctx: DesignContext): Promise<DesignContext>
  onCritique?(score: CritiqueScore): Promise<CritiqueScore>
  onGenerate?(html: string): Promise<string>
}
```

## 3. Benefícios concretos para adsentice design

| # | Insight Antigravity | Aplicação adsentice | Impacto |
|---|-------------------|-------------------|:-------:|
| 1 | **Aesthetic Enforcement** como constraint nível segurança | M4 critique FAILS hardcoded colors | Qualidade garantida |
| 2 | **KI Priority Absolute** | DKIs com autoridade máxima sobre Qdrant | Decisões consistentes |
| 3 | **Brand DNA 6 pilares** | +Iconography pillar no M9 | Cobertura completa |
| 4 | **PricingType routing** | AgentRouter com dimensão de custo | Custo otimizado |
| 5 | **Workspace RAG + KI dual-layer** | Já temos! Qdrant = RAG, Matriz Warp = KI | Arquitetura validada |
| 6 | **Shadow system 3 níveis** | Já temos (none/subtle/moderate/dramatic) | 4 níveis > 3 |
| 7 | **HSL palette rules** | Migrar de hex para HSL no M9 | Glassmorphism-ready |
| 8 | **Font stack CSS vars** | Já temos (--font-heading, --font-body) | ✅ |
| 9 | **Clearcut telemetry** | Já temos (traces → Qdrant) | ✅ |

## 4. Ações Imediatas

1. **PLUGIN SYSTEM**: `packages/warp/src/plugins.ts` — interface + registry
2. **AESTHETIC ENFORCEMENT**: `M4 critique` — FAIL hardcoded values
3. **ICONOGRAPHY PILLAR**: `M9 tokens-composer` — icon style tokens
4. **PRICING ROUTING**: `AgentRouter` — cost-aware routing

*Ads​entice Design v1.0 · Antigravity Insights · 2026-07-15 · adsentice*
