/**
 * packages/warp/src/5-registry.ts
 * Registry Protocol (Zod) — M5 da Família Warp
 *
 * "Todo componente registrado passa por validação Zod.
 *  Componente inválido é rejeitado com mensagem clara."
 *
 * Inspiração: open-design registry protocol (Zod schemas)
 *             agentskills.io spec (SKILL.md validation)
 *
 * Refinamento Warp: busca semântica vec() > triggers determinísticos
 *   OD: triggers: ["magazine deck"] → busca exata
 *   Warp: vec(description + intent + triggers) → similaridade semântica
 *
 * medido=verdade · ADR-0018 + ADR-0020 · 2026-07-14 · adsentice
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// Zod Schemas (open-design registry protocol style)
// ═══════════════════════════════════════════════════════════════

export const PropDefSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'enum', 'object', 'array', 'ReactNode']),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  description: z.string().optional(),
})

export const A11ySchema = z.object({
  role: z.string().min(1),
  ariaLabel: z.string().min(1),
  keyboardNav: z.boolean(),
  contrastRatio: z.number().min(3.0).max(21.0),
})

export const SourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['component', 'pattern', 'guideline', 'template', 'adsentice-original']),
  url: z.string().url(),
  quality: z.enum(['P0', 'P1', 'P2']),
})

export const DesignSystemSchema = z.object({
  requires: z.boolean(),
  sections: z.array(z.string()),
})

export const UsageStatsSchema = z.object({
  timesUsed: z.number().int().min(0),
  lastUsedAt: z.string(),
  avgRenderMs: z.number().min(0),
})

export const WarpComponentSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, 'ID deve ser lowercase alphanumeric com . _ -'),
  type: z.enum(['atom', 'molecule', 'organism', 'template', 'page']),
  name: z.string().min(1).max(120),
  description: z.string().min(10, 'Descrição precisa ter pelo menos 10 caracteres').max(600),
  intent: z.string().min(10, 'Intent precisa ter pelo menos 10 caracteres').max(400),
  category: z.enum(['action', 'navigation', 'data-display', 'feedback', 'form', 'layout']),
  triggers: z.array(z.string()).min(3, 'Mínimo 3 triggers para busca determinística'),
  mode: z.enum(['dashboard', 'landing', 'prototype', 'template', 'design-system']),
  edges: z.array(z.string()),
  designSystem: DesignSystemSchema,
  a11y: A11ySchema,
  source: SourceSchema,
  mutationId: z.number().int().positive(),
  version: z.number().int().positive(),
  tags: z.array(z.string()),
  surfaces: z.array(z.string()),
  segments: z.array(z.string()),
  usageStats: UsageStatsSchema.optional(),
  embedding: z.array(z.number()).optional(),
})

// ═══════════════════════════════════════════════════════════════
// Registry Entry (open-design style)
// ═══════════════════════════════════════════════════════════════

export const RegistryEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
  version: z.string(),
  publisher: z.object({
    id: z.string(),
    name: z.string(),
    verified: z.boolean(),
  }).optional(),
  capabilities: z.array(z.string()).optional(),
  metrics: z.object({
    downloads: z.number().int().min(0),
    installs: z.number().int().min(0),
    stars: z.number().int().min(0),
  }).optional(),
  dist: z.object({
    type: z.enum(['github-release', 'local']),
    archive: z.string(),
    integrity: z.string(),
  }).optional(),
})

// ═══════════════════════════════════════════════════════════════
// Plugin System (OD-style: Skill + Context + Assets + Capabilities)
// ═══════════════════════════════════════════════════════════════

export const PluginSchema = z.object({
  /** Identificador único do plugin */
  id: z.string().min(1),
  /** Nome legível */
  name: z.string().min(1).max(120),
  /** Versão semântica */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Descrição do que o plugin faz */
  description: z.string().min(10),
  /** Skill associada (SKILL.md path ou inline) */
  skill: z.union([z.string(), z.record(z.unknown())]),
  /** Contexto necessário para execução */
  context: z.object({
    requires: z.array(z.string()).default([]), // ex: ["design-knowledge", "brand-iq"]
    provides: z.array(z.string()).default([]), // ex: ["tokens.css", "layout-tree"]
  }),
  /** Assets estáticos (templates, imagens, fonts) */
  assets: z.array(z.string()).default([]),
  /** MCP capabilities requeridas */
  capabilities: z.array(z.string()).default([]),
  /** Modo do plugin */
  mode: z.enum(['skill', 'agent', 'mcp-connector', 'pipeline']).default('skill'),
})

export type Plugin = z.infer<typeof PluginSchema>

// ═══════════════════════════════════════════════════════════════
// Validation helpers
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Valida um WarpComponent contra o schema Zod.
 * Retorna { valid, errors, warnings }.
 */
export function validateComponent(component: unknown): ValidationResult {
  const result = WarpComponentSchema.safeParse(component)

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      warnings: [],
    }
  }

  const warnings: string[] = []
  const c = result.data

  // Warnings (não bloqueiam, mas sinalizam qualidade)
  if (c.triggers.length < 5) {
    warnings.push(`Poucos triggers (${c.triggers.length}). Recomendado ≥5 para busca determinística.`)
  }
  if (c.tags.length < 2) {
    warnings.push(`Poucas tags (${c.tags.length}). Recomendado ≥2 para filtro.`)
  }
  if (c.edges.length === 0 && c.type !== 'atom') {
    warnings.push(`Componente ${c.type} sem edges. Verifique se realmente não tem dependências.`)
  }
  if (c.a11y.contrastRatio < 4.5) {
    warnings.push(`Contraste ${c.a11y.contrastRatio}:1 abaixo de 4.5:1 (WCAG AA).`)
  }
  if (c.surfaces.length === 0) {
    warnings.push('Nenhuma superfície Warp associada. O componente nunca será usado.')
  }

  return { valid: true, errors: [], warnings }
}

/**
 * Valida um Plugin contra o schema Zod.
 */
export function validatePlugin(plugin: unknown): ValidationResult {
  const result = PluginSchema.safeParse(plugin)

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      warnings: [],
    }
  }

  return { valid: true, errors: [], warnings: [] }
}

// ═══════════════════════════════════════════════════════════════
// Plugin Registry
// ═══════════════════════════════════════════════════════════════

/**
 * Registry de plugins conectáveis.
 * Plugins são MCP servers, agentes externos, ou pipelines internos.
 */
export class PluginRegistry {
  private plugins = new Map<string, Plugin>()

  register(plugin: Plugin): ValidationResult {
    const validation = validatePlugin(plugin)
    if (!validation.valid) return validation

    this.plugins.set(plugin.id, plugin)
    return validation
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id)
  }

  list(): Plugin[] {
    return [...this.plugins.values()]
  }

  listByCapability(capability: string): Plugin[] {
    return this.list().filter((p) => p.capabilities.includes(capability))
  }

  listByMode(mode: Plugin['mode']): Plugin[] {
    return this.list().filter((p) => p.mode === mode)
  }

  unregister(id: string): boolean {
    return this.plugins.delete(id)
  }
}

/** Singleton */
export const pluginRegistry = new PluginRegistry()

// ═══════════════════════════════════════════════════════════════
// Type exports
// ═══════════════════════════════════════════════════════════════

export type WarpComponentValidated = z.infer<typeof WarpComponentSchema>
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>
export type PropDef = z.infer<typeof PropDefSchema>
