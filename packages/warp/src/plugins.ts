/**
 * packages/warp/src/plugins.ts
 * Plugin System — extensões vivas para o Design Pipeline
 *
 * "Plugins are not local UI addons; they are reusable agent workflows." (OD)
 * "Aesthetic Enforcement is a constraint, not a preference." (Antigravity)
 *
 * Ciclo de vida:
 *   detect → activate → pipeline hooks (onEnrich/onCritique/onGenerate) → deactivate
 *
 * Tipos de plugin:
 *   skill          — unidade atômica de capacidade (SKILL.md style)
 *   agent          — agente externo via MCP/API
 *   mcp-connector  — ponte para MCP server (21st, context7, Firecrawl...)
 *   pipeline       — etapa adicional no pipeline
 *
 * medido=verdade · 2026-07-15 · adsentice
 */

import type { CritiqueScore } from './4-composer'
import type { SegmentId, PlanTier } from './tokens-composer'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  mode: 'skill' | 'agent' | 'mcp-connector' | 'pipeline'
  capabilities: string[]
  context: {
    requires: string[]
    provides: string[]
  }
}

export interface DesignContext {
  segment: SegmentId
  plan: PlanTier
  businessName?: string
  palette: { primary: string; secondary: string; accent: string }
  typography: { heading: string; body: string }
  designInspiration: string[]
  suggestedComponents: string[]
  landingPattern: string
  critiqueScore?: CritiqueScore
  previewHtml?: string
}

export interface Plugin {
  manifest: PluginManifest
  detect(): Promise<boolean>
  activate(): Promise<void>
  deactivate(): Promise<void>
  onEnrich?(ctx: DesignContext): Promise<DesignContext>
  onCritique?(score: CritiqueScore, ctx: DesignContext): Promise<{ score: CritiqueScore; enforced: boolean }>
  onGenerate?(ctx: DesignContext, html: string): Promise<string>
}

// ═══════════════════════════════════════════════════════════════
// Plugin Registry
// ═══════════════════════════════════════════════════════════════

export class PluginRegistry {
  private plugins = new Map<string, Plugin>()
  private active = new Set<string>()

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin ${plugin.manifest.id} already registered`)
    }
    this.plugins.set(plugin.manifest.id, plugin)
  }

  async activate(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id)
    if (!plugin) return false
    if (this.active.has(id)) return true

    const detected = await plugin.detect()
    if (!detected) return false

    await plugin.activate()
    this.active.add(id)
    return true
  }

  async deactivate(id: string): Promise<void> {
    const plugin = this.plugins.get(id)
    if (!plugin || !this.active.has(id)) return
    await plugin.deactivate()
    this.active.delete(id)
  }

  async activateAll(): Promise<string[]> {
    const activated: string[] = []
    for (const id of this.plugins.keys()) {
      const ok = await this.activate(id)
      if (ok) activated.push(id)
    }
    return activated
  }

  get(id: string): Plugin | undefined { return this.plugins.get(id) }
  list(): Plugin[] { return [...this.plugins.values()] }
  listActive(): Plugin[] { return this.list().filter(p => this.active.has(p.manifest.id)) }
  listByMode(mode: PluginManifest['mode']): Plugin[] { return this.list().filter(p => p.manifest.mode === mode) }
}

export const pluginRegistry = new PluginRegistry()

// ═══════════════════════════════════════════════════════════════
// AESTHETIC ENFORCEMENT PLUGIN (Antigravity insight)
// ═══════════════════════════════════════════════════════════════

/**
 * Aesthetic Enforcement — constraint de nível de segurança.
 *
 * Inspiração: Antigravity Design System §1.2
 * "Nenhum valor hardcoded. Nenhum placeholder. Nenhum flat design.
 *  Nenhum dark mode ausente. Nenhuma animação estática."
 *
 * Este plugin VALIDA o output do pipeline e REJEITA
 * qualquer violação dos princípios estéticos.
 */
export const aestheticEnforcementPlugin: Plugin = {
  manifest: {
    id: 'aesthetic-enforcement',
    name: 'Aesthetic Enforcement',
    version: '1.0.0',
    description: 'Rejeita composições que violam princípios estéticos (cores hardcoded, sem tokens, sem dark mode, sem animação)',
    mode: 'pipeline',
    capabilities: ['enforce-tokens', 'detect-hardcoded-colors', 'validate-dark-mode', 'check-animations'],
    context: { requires: ['design-context', 'preview-html'], provides: ['enforcement-report'] },
  },

  async detect() { return true }, // always active
  async activate() {},
  async deactivate() {},

  /**
   * Critique hook — penaliza violações estéticas.
   * Se detectar hardcoded colors → -3 points em philosophyConsistency.
   * Se detectar falta de dark mode → -2 points.
   * Se detectar falta de animações → -1 point.
   */
  async onCritique(score: CritiqueScore, ctx: DesignContext): Promise<{ score: CritiqueScore; enforced: boolean }> {
    let penalty = 0
    const violations: string[] = []

    // Check 1: Hardcoded colors no HTML (sem var())
    if (ctx.previewHtml) {
      const hardcodedColors = ctx.previewHtml.match(/#[0-9a-fA-F]{3,6}(?!\s*\))/g) || []
      const tokenColors = (ctx.previewHtml.match(/var\(--color-/g) || []).length
      if (hardcodedColors.length > tokenColors * 2) {
        penalty += 3
        violations.push(`${hardcodedColors.length} hardcoded colors vs ${tokenColors} token references`)
      }

      // Check 2: Dark mode tokens
      if (!ctx.previewHtml.includes('prefers-color-scheme: dark') && !ctx.previewHtml.includes('.dark')) {
        penalty += 2
        violations.push('Dark mode not configured')
      }

      // Check 3: Animation/transition
      if (!ctx.previewHtml.includes('transition') && !ctx.previewHtml.includes('animation')) {
        penalty += 1
        violations.push('No CSS animations/transitions found')
      }

      // Check 4: Placeholder text
      if (ctx.previewHtml.includes('Lorem ipsum') || ctx.previewHtml.includes('placeholder text')) {
        penalty += 2
        violations.push('Generic placeholder text detected')
      }
    }

    if (penalty > 0) {
      score.philosophyConsistency = Math.max(0, score.philosophyConsistency - penalty)
      score.composite = Math.round((
        score.visualHierarchy * 0.20 +
        score.detailExecution * 0.15 +
        score.functionality * 0.25 +
        score.innovation * 0.10 +
        Math.max(0, score.philosophyConsistency) * 0.15 +
        score.marketFit * 0.15
      ) * 10) / 10
      score.passed = score.composite >= 7.0
      score.feedback.push(`⚡ AESTHETIC ENFORCEMENT: ${violations.join('; ')}. Penalty: -${penalty}`)
      return { score, enforced: true }
    }

    return { score, enforced: false }
  },

  async onGenerate(ctx: DesignContext, html: string): Promise<string> {
    // Inject dark mode support if missing
    if (!html.includes('prefers-color-scheme: dark') && !html.includes('.dark')) {
      const darkModeCSS = `
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a2e;
    --color-fg: #e2e8f0;
    --color-card: #16213e;
    --color-muted: #1a1a2e;
    --color-muted-fg: #64748b;
    --color-border: #334155;
  }
}`
      html = html.replace('</style>', `${darkModeCSS}\n</style>`)
    }
    return html
  },
}

// Register built-in plugins
pluginRegistry.register(aestheticEnforcementPlugin)

// ═══════════════════════════════════════════════════════════════
// MCP CONNECTOR PLUGINS
// ═══════════════════════════════════════════════════════════════

export const mcpConnectorPlugins: Plugin[] = [
  {
    manifest: {
      id: 'mcp-21st-magic',
      name: '21st Magic UI Connector',
      version: '1.0.0',
      description: 'Conecta ao MCP 21st-magic para inspiração visual de componentes',
      mode: 'mcp-connector',
      capabilities: ['listRegistryItems', 'getRegistryItem', 'searchRegistryItems'],
      context: { requires: ['mcp-21st-magic'], provides: ['visual-inspiration'] },
    },
    async detect() { return true }, // MCP sempre disponível
    async activate() {},
    async deactivate() {},
    async onEnrich(ctx: DesignContext): Promise<DesignContext> {
      // Componentes 21st já estão no Qdrant como design-knowledge
      // O enriquecimento acontece via Qdrant search com filtro kind=component
      return ctx
    },
  },
  {
    manifest: {
      id: 'mcp-context7',
      name: 'Context7 Docs Connector',
      version: '1.0.0',
      description: 'Conecta ao MCP context7 para documentação técnica atualizada',
      mode: 'mcp-connector',
      capabilities: ['resolve-library-id', 'query-docs'],
      context: { requires: ['mcp-context7'], provides: ['technical-docs'] },
    },
    async detect() { return true },
    async activate() {},
    async deactivate() {},
  },
]

// Register MCP connectors
for (const p of mcpConnectorPlugins) {
  if (!pluginRegistry.get(p.manifest.id)) {
    pluginRegistry.register(p)
  }
}
