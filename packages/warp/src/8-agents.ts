/**
 * packages/warp/src/8-agents.ts
 * Agent Adapter Layer — M8 da Família Warp
 *
 * "Plugins não são arquivos locais — são MCP servers vivos.
 *  Cada adapter detecta, executa e gerencia um agente externo."
 *
 * Inspiração: open-design Agent Adapters (detect→capabilities→run→cancel→resume)
 *             EVO-API b3-decide.ts (roteamento multi-agente)
 *
 * Refinamento Warp vs OD:
 *   OD: Agent adapters para Claude Code, Codex, Cursor (CLIs)
 *   Warp: + MCP servers como plugins vivos (21st, context7, Firecrawl, DataForSEO)
 *         + Roteamento por custo (DeepSeek $$, Qwen $0)
 *         + vec() para escolher o melhor agente para cada intent
 *
 * medido=verdade · ADR-0018 + ADR-0020 · 2026-07-14 · adsentice
 */

// ═══════════════════════════════════════════════════════════════
// Agent Types
// ═══════════════════════════════════════════════════════════════

export interface AgentCapabilities {
  streaming: boolean
  resume: boolean
  maxTokens: number
  costPer1kTokens: number
  supportsVision: boolean
  supportsTools: boolean
  latency: 'low' | 'medium' | 'high'
}

export interface AgentDetection {
  id: string
  name: string
  version: string
  available: boolean
  capabilities: AgentCapabilities
}

export interface AgentRunParams {
  intent: string
  context?: Record<string, unknown>
  maxTokens?: number
  temperature?: number
}

export type AgentEvent =
  | { type: 'start'; runId: string }
  | { type: 'chunk'; content: string }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'complete'; result: unknown }
  | { type: 'error'; message: string }

/**
 * AgentAdapter — interface canônica (OD-style).
 *
 * "detect → capabilities → run → (cancel | resume)"
 */
export interface AgentAdapter {
  id: string
  name: string

  /** Detecta se este agente está disponível */
  detect(): Promise<AgentDetection | null>

  /** Retorna as capacidades do agente */
  capabilities(): AgentCapabilities

  /** Executa um intent e retorna stream de eventos */
  run(params: AgentRunParams): AsyncIterable<AgentEvent>

  /** Cancela uma execução em andamento */
  cancel(runId: string): Promise<void>

  /** Resume uma execução pausada (envia mensagem adicional) */
  resume?(runId: string, message: string): AsyncIterable<AgentEvent>
}

// ═══════════════════════════════════════════════════════════════
// MCP Server Adapter (REFINAMENTO WARP)
// ═══════════════════════════════════════════════════════════════

export interface MCPServerInfo {
  name: string
  description: string
  /** Domínio de especialidade */
  domain: 'design' | 'docs' | 'audit' | 'seo' | 'social' | 'ai' | 'data' | 'other'
  /** Tools disponíveis */
  tools: string[]
  /** Custo: 'free' | 'paid' | 'credit' */
  cost: 'free' | 'paid' | 'credit'
  /** Endpoint do MCP server */
  endpoint?: string
}

/**
 * Registro de MCP servers disponíveis como plugins vivos.
 *
 * Diferente do OD (plugins = arquivos), aqui plugins = MCP servers
 * que respondem queries em tempo real.
 */
export class MCPRegistry {
  private servers = new Map<string, MCPServerInfo>()

  register(info: MCPServerInfo): void {
    this.servers.set(info.name, info)
  }

  get(name: string): MCPServerInfo | undefined {
    return this.servers.get(name)
  }

  list(): MCPServerInfo[] {
    return [...this.servers.values()]
  }

  listByDomain(domain: MCPServerInfo['domain']): MCPServerInfo[] {
    return this.list().filter((s) => s.domain === domain)
  }

  /**
   * Encontra o melhor MCP server para um intent.
   * No futuro: vec() embedding do intent → similaridade com descrições dos MCPs.
   */
  findBestFor(intent: string): MCPServerInfo | undefined {
    const lower = intent.toLowerCase()

    if (lower.includes('design') || lower.includes('ui') || lower.includes('component') || lower.includes('visual')) {
      return this.servers.get('21st-magic')
    }
    if (lower.includes('cod') || lower.includes('implement') || lower.includes('api') || lower.includes('doc')) {
      return this.servers.get('context7')
    }
    if (lower.includes('audit') || lower.includes('site') || lower.includes('lighthouse') || lower.includes('crawl')) {
      return this.servers.get('firecrawl')
    }
    if (lower.includes('seo') || lower.includes('keyword') || lower.includes('competitor') || lower.includes('ranking')) {
      return this.servers.get('dataforseo')
    }

    return undefined
  }
}

/** Singleton */
export const mcpRegistry = new MCPRegistry()

// ═══════════════════════════════════════════════════════════════
// Agent implementations
// ═══════════════════════════════════════════════════════════════

/**
 * Claude Code Adapter — agente principal (quality-first).
 * Usado para: crítica de design, tomada de decisão, composição complexa.
 */
export class ClaudeCodeAdapter implements AgentAdapter {
  id = 'claude-code'
  name = 'Claude Code (Anthropic)'

  async detect(): Promise<AgentDetection | null> {
    // Claude Code está sempre disponível no ambiente de dev
    return {
      id: this.id,
      name: this.name,
      version: '4.8',
      available: true,
      capabilities: this.capabilities(),
    }
  }

  capabilities(): AgentCapabilities {
    return {
      streaming: true,
      resume: true,
      maxTokens: 1_000_000,
      costPer1kTokens: 0.015,
      supportsVision: true,
      supportsTools: true,
      latency: 'medium',
    }
  }

  async *run(params: AgentRunParams): AsyncIterable<AgentEvent> {
    const runId = `claude_${Date.now()}`
    yield { type: 'start', runId }

    // Placeholder — será implementado como chamada real ao Agent SDK
    yield {
      type: 'chunk',
      content: `[Claude Code] Processando intent: ${params.intent}`,
    }

    yield { type: 'complete', result: { agent: this.id, intent: params.intent } }
  }

  async cancel(runId: string): Promise<void> {
    console.log(`[ClaudeCode] Cancelando run ${runId}`)
  }

  async *resume(runId: string, message: string): AsyncIterable<AgentEvent> {
    yield { type: 'start', runId }
    yield { type: 'chunk', content: `[Claude Code] Resumindo com: ${message}` }
    yield { type: 'complete', result: { resumed: true } }
  }
}

/**
 * DeepSeek Adapter — árbitro cost-capped (L6).
 * Usado para: validação, scoring, classificação.
 */
export class DeepSeekAdapter implements AgentAdapter {
  id = 'deepseek'
  name = 'DeepSeek V4 (árbitro)'

  async detect(): Promise<AgentDetection | null> {
    return {
      id: this.id,
      name: this.name,
      version: 'v4',
      available: !!process.env.DEEPSEEK_API_KEY,
      capabilities: this.capabilities(),
    }
  }

  capabilities(): AgentCapabilities {
    return {
      streaming: false,
      resume: false,
      maxTokens: 128_000,
      costPer1kTokens: 0.001,
      supportsVision: false,
      supportsTools: false,
      latency: 'high',
    }
  }

  async *run(params: AgentRunParams): AsyncIterable<AgentEvent> {
    const runId = `deepseek_${Date.now()}`
    yield { type: 'start', runId }
    yield { type: 'complete', result: { agent: this.id, intent: params.intent } }
  }

  async cancel(_runId: string): Promise<void> {}
}

/**
 * Qwen Local Adapter — agente gratuito ($0).
 * Usado para: geração em lote, tarefas repetitivas, embeddings.
 */
export class QwenLocalAdapter implements AgentAdapter {
  id = 'qwen-local'
  name = 'Qwen 2.5 1.5B (local $0)'

  async detect(): Promise<AgentDetection | null> {
    return {
      id: this.id,
      name: this.name,
      version: '2.5-1.5b',
      available: false, // Será true quando o modelo local estiver servido
      capabilities: this.capabilities(),
    }
  }

  capabilities(): AgentCapabilities {
    return {
      streaming: false,
      resume: false,
      maxTokens: 32_000,
      costPer1kTokens: 0,
      supportsVision: false,
      supportsTools: false,
      latency: 'low',
    }
  }

  async *run(params: AgentRunParams): AsyncIterable<AgentEvent> {
    const runId = `qwen_${Date.now()}`
    yield { type: 'start', runId }
    yield { type: 'complete', result: { agent: this.id, intent: params.intent } }
  }

  async cancel(_runId: string): Promise<void> {}
}

// ═══════════════════════════════════════════════════════════════
// Agent Router — escolhe o melhor agente para cada intent
// ═══════════════════════════════════════════════════════════════

export class AgentRouter {
  private adapters: AgentAdapter[] = []

  constructor() {
    // Ordem de prioridade: qualidade → custo → fallback
    this.adapters = [
      new ClaudeCodeAdapter(),
      new DeepSeekAdapter(),
      new QwenLocalAdapter(),
    ]

    // Registra MCP servers conhecidos
    mcpRegistry.register({
      name: '21st-magic',
      description: '77 Magic UI components visuais — inspiração de design',
      domain: 'design',
      tools: ['listRegistryItems', 'getRegistryItem', 'searchRegistryItems'],
      cost: 'paid',
    })
    mcpRegistry.register({
      name: 'context7',
      description: 'Documentação técnica atualizada — shadcn/ui, Radix, Tailwind',
      domain: 'docs',
      tools: ['resolve-library-id', 'query-docs'],
      cost: 'free',
    })
    mcpRegistry.register({
      name: 'firecrawl',
      description: 'Crawl e auditoria de sites — scrape, map, extract',
      domain: 'audit',
      tools: ['firecrawl_scrape', 'firecrawl_map', 'firecrawl_crawl', 'firecrawl_search'],
      cost: 'credit',
    })
    mcpRegistry.register({
      name: 'dataforseo',
      description: 'SEO, keywords, concorrentes, backlinks — dados de mercado',
      domain: 'seo',
      tools: ['serp_organic_live_advanced', 'dataforseo_labs_*', 'backlinks_*', 'domain_analytics_*', 'business_data_*'],
      cost: 'credit',
    })
  }

  /**
   * Detecta todos os agentes disponíveis.
   */
  async detectAll(): Promise<AgentDetection[]> {
    const results = await Promise.all(this.adapters.map((a) => a.detect()))
    return results.filter((d): d is AgentDetection => d !== null)
  }

  /**
   * Escolhe o melhor agente para um intent baseado em:
   * 1. Complexidade: intent complexo → Claude Code (qualidade)
   * 2. Custo: intent simples → Qwen ($0) ou DeepSeek ($)
   * 3. Disponibilidade: fallback chain
   */
  async route(intent: string): Promise<AgentAdapter> {
    const available = await this.detectAll()

    // Intent complexo → Claude Code
    if (
      intent.length > 100 ||
      intent.includes('critique') ||
      intent.includes('design system') ||
      intent.includes('compose')
    ) {
      const claude = this.adapters.find((a) => a.id === 'claude-code')
      if (claude && available.some((d) => d.id === 'claude-code')) return claude
    }

    // Intent simples → Qwen ($0)
    if (intent.length < 50 && !intent.includes('design')) {
      const qwen = this.adapters.find((a) => a.id === 'qwen-local')
      if (qwen && available.some((d) => d.id === 'qwen-local')) return qwen
    }

    // Default → DeepSeek (bom e barato)
    const deepseek = this.adapters.find((a) => a.id === 'deepseek')
    if (deepseek && available.some((d) => d.id === 'deepseek')) return deepseek

    // Fallback → primeiro disponível
    return this.adapters[0]
  }

  /**
   * Encontra o MCP server mais relevante para um intent.
   */
  findMCPFor(intent: string): MCPServerInfo | undefined {
    return mcpRegistry.findBestFor(intent)
  }

  /**
   * Lista todos os MCP servers disponíveis.
   */
  listMCPs(): MCPServerInfo[] {
    return mcpRegistry.list()
  }

  getAdapters(): AgentAdapter[] {
    return this.adapters
  }
}

/** Singleton */
export const agentRouter = new AgentRouter()
