/**
 * packages/warp/src/3-destiller.ts
 * Destilador de Referências — M3 da Família Warp
 *
 * "Ingere anatomia de componentes de referência (shadcn/ui, Radix, WCAG),
 *  destila em WarpComponent, registra no Qdrant."
 *
 * Inspiração: EVO-API materio_ingest.rs (310 linhas) — pipeline de destilação
 *             open-design design-systems/ (88 referências anatômicas)
 *
 * medido=verdade · ADR-0018 · 2026-07-14 · adsentice
 */

import type { WarpComponent, ReferenceSource, DestilledComponent } from './types'
import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// Componentes shadcn/ui — definições canônicas
// ═══════════════════════════════════════════════════════════════

/**
 * Cada entrada descreve a ANATOMIA de um componente:
 * - O que é, para que serve (description + intent)
 * - Quais props/variants tem
 * - Quais tokens consome
 * - Acessibilidade (WCAG)
 * - Em quais superfícies Warp aparece
 * - Em quais segmentos é relevante
 */

const SHADCN_COMPONENTS: Omit<WarpComponent, 'embedding' | 'inputs' | 'usageStats'>[] = [
  {
    id: 'button',
    type: 'atom',
    name: 'Button',
    description: 'Elemento de UI clicável. Dispara ações, navega, submete formulários.',
    intent: 'acionar ação primária, confirmar, submeter, navegar, deletar',
    category: 'action',
    triggers: [
      'botão', 'button', 'click', 'ação', 'confirmar', 'enviar', 'submit',
      'deletar', 'cancelar', 'cta', 'call to action', 'comprar', 'assinar',
    ],
    mode: 'design-system',
    edges: [],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius', 'shadow', 'animation'],
    },
    a11y: {
      role: 'button',
      ariaLabel: 'Botão de ação',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'shadcn/ui',
      type: 'component',
      url: 'https://ui.shadcn.com/docs/components/button',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'shadcn', 'action'],
    surfaces: ['S1', 'S4', 'S6', 'S9', 'S10', 'S11', 'S14'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'card',
    type: 'molecule',
    name: 'Card',
    description: 'Container flexível para agrupar conteúdo relacionado. Header, conteúdo, footer opcionais.',
    intent: 'exibir informação agrupada, destacar conteúdo, organizar dashboard',
    category: 'data-display',
    triggers: [
      'card', 'cartão', 'container', 'bloco', 'painel', 'card de métrica',
      'kpi card', 'stat card', 'resumo', 'destaque',
    ],
    mode: 'dashboard',
    edges: [],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius', 'shadow'],
    },
    a11y: {
      role: 'region',
      ariaLabel: 'Cartão de conteúdo',
      keyboardNav: false,
      contrastRatio: 4.5,
    },
    source: {
      name: 'shadcn/ui',
      type: 'component',
      url: 'https://ui.shadcn.com/docs/components/card',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'shadcn', 'layout', 'dashboard'],
    surfaces: ['S3', 'S9', 'S10', 'S11', 'S15', 'S16', 'S17', 'S18'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'dialog',
    type: 'molecule',
    name: 'Dialog (Modal)',
    description: 'Janela modal para confirmações, formulários ou informações críticas. Overlay com foco aprisionado. Esc fecha.',
    intent: 'confirmar ação destrutiva, exibir formulário em modal, mostrar detalhes sem sair da página',
    category: 'feedback',
    triggers: [
      'modal', 'dialog', 'popup', 'confirmação', 'alerta', 'janela',
      'confirmar exclusão', 'detalhes', 'termos',
    ],
    mode: 'dashboard',
    edges: ['button'],
    designSystem: {
      requires: true,
      sections: ['color', 'spacing', 'radius', 'shadow', 'animation', 'z-index'],
    },
    a11y: {
      role: 'dialog',
      ariaLabel: 'Janela de diálogo',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'Radix UI (shadcn/ui wrapper)',
      type: 'component',
      url: 'https://www.radix-ui.com/primitives/docs/components/dialog',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'radix', 'feedback', 'modal'],
    surfaces: ['S3', 'S9', 'S14', 'S18'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'dropdown-menu',
    type: 'molecule',
    name: 'Dropdown Menu',
    description: 'Menu suspenso com lista de ações. Ativado por clique no trigger. Navegação por teclado (↑↓ Enter).',
    intent: 'exibir menu de ações, opções de navegação, ações contextuais, menu de usuário',
    category: 'navigation',
    triggers: [
      'menu', 'dropdown', 'suspenso', 'opções', 'ações', 'context menu',
      'menu de usuário', 'configurações', 'perfil',
    ],
    mode: 'dashboard',
    edges: ['button'],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius', 'shadow', 'z-index'],
    },
    a11y: {
      role: 'menu',
      ariaLabel: 'Menu de opções',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'Radix UI (shadcn/ui wrapper)',
      type: 'component',
      url: 'https://www.radix-ui.com/primitives/docs/components/dropdown-menu',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'radix', 'navigation', 'menu'],
    surfaces: ['S3', 'S9', 'S15', 'S16'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'form',
    type: 'organism',
    name: 'Form',
    description: 'Formulário com validação. react-hook-form + zod. Campos, labels, erros, submit. Acessível por teclado.',
    intent: 'coletar dados do usuário, validar entrada, submeter formulário, cadastro, login',
    category: 'form',
    triggers: [
      'formulário', 'form', 'cadastro', 'login', 'input', 'campos',
      'validação', 'dados', 'registro', 'contato',
    ],
    mode: 'dashboard',
    edges: ['input', 'label', 'button'],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius'],
    },
    a11y: {
      role: 'form',
      ariaLabel: 'Formulário',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'shadcn/ui + react-hook-form + zod',
      type: 'pattern',
      url: 'https://ui.shadcn.com/docs/components/form',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'shadcn', 'form', 'validation'],
    surfaces: ['S4', 'S6', 'S14'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'input',
    type: 'atom',
    name: 'Input',
    description: 'Campo de entrada de texto. Single-line. Suporta type=text, email, password, number. Label obrigatório.',
    intent: 'coletar texto do usuário, entrada de dados, busca, filtro',
    category: 'form',
    triggers: [
      'input', 'campo', 'texto', 'entrada', 'escrever', 'digitar',
      'busca', 'pesquisa', 'email', 'senha', 'telefone',
    ],
    mode: 'design-system',
    edges: ['label'],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius'],
    },
    a11y: {
      role: 'textbox',
      ariaLabel: 'Campo de texto',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'Base UI (shadcn/ui v4)',
      type: 'component',
      url: 'https://ui.shadcn.com/docs/components/input',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'base-ui', 'form'],
    surfaces: ['S3', 'S4', 'S6', 'S9', 'S14'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'label',
    type: 'atom',
    name: 'Label',
    description: 'Rótulo de campo de formulário. Sempre associado a um input via htmlFor. Essencial para a11y.',
    intent: 'rotular campo de formulário, descrever o que o input espera',
    category: 'form',
    triggers: ['label', 'rótulo', 'etiqueta', 'nome do campo', 'descrição do campo'],
    mode: 'design-system',
    edges: [],
    designSystem: {
      requires: true,
      sections: ['typography', 'color'],
    },
    a11y: {
      role: 'label',
      ariaLabel: 'Rótulo do campo',
      keyboardNav: false,
      contrastRatio: 4.5,
    },
    source: {
      name: 'Radix UI (shadcn/ui wrapper)',
      type: 'component',
      url: 'https://www.radix-ui.com/primitives/docs/components/label',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'radix', 'form', 'a11y'],
    surfaces: ['S3', 'S4', 'S6', 'S9', 'S14'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'select',
    type: 'molecule',
    name: 'Select',
    description: 'Dropdown de seleção única. Lista de opções com busca integrada. Navegação por teclado.',
    intent: 'selecionar uma opção entre várias, escolher categoria, filtrar por tipo',
    category: 'form',
    triggers: ['select', 'seleção', 'dropdown', 'escolher', 'opção', 'categoria', 'filtro', 'combo'],
    mode: 'dashboard',
    edges: ['label'],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius', 'z-index'],
    },
    a11y: {
      role: 'combobox',
      ariaLabel: 'Seleção de opção',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'Radix UI (shadcn/ui wrapper)',
      type: 'component',
      url: 'https://www.radix-ui.com/primitives/docs/components/select',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'radix', 'form', 'filter'],
    surfaces: ['S3', 'S9', 'S15', 'S16'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'sheet',
    type: 'organism',
    name: 'Sheet (Painel Lateral)',
    description: 'Painel que desliza da borda da tela. Usado para navegação mobile, filtros, detalhes. Esc fecha. Swipe fecha no mobile.',
    intent: 'exibir painel lateral, navegação mobile, filtros avançados, detalhes do item, carrinho',
    category: 'navigation',
    triggers: ['sheet', 'painel', 'lateral', 'drawer', 'slide', 'filtro lateral', 'menu mobile', 'detalhes'],
    mode: 'dashboard',
    edges: ['button'],
    designSystem: {
      requires: true,
      sections: ['color', 'spacing', 'radius', 'shadow', 'animation', 'z-index'],
    },
    a11y: {
      role: 'dialog',
      ariaLabel: 'Painel lateral',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'Radix UI (shadcn/ui wrapper)',
      type: 'component',
      url: 'https://www.radix-ui.com/primitives/docs/components/dialog',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'radix', 'navigation', 'mobile'],
    surfaces: ['S3', 'S9', 'S16'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'table',
    type: 'organism',
    name: 'Table',
    description: 'Tabela de dados com cabeçalho, ordenação, seleção de linhas. Responsiva com scroll horizontal em mobile.',
    intent: 'exibir dados tabulares, listar leads, mostrar ranking, comparar métricas',
    category: 'data-display',
    triggers: [
      'tabela', 'table', 'lista', 'dados', 'grid', 'planilha',
      'ranking', 'leads', 'métricas', 'comparação',
    ],
    mode: 'dashboard',
    edges: ['button', 'select'],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius'],
    },
    a11y: {
      role: 'table',
      ariaLabel: 'Tabela de dados',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'shadcn/ui',
      type: 'component',
      url: 'https://ui.shadcn.com/docs/components/table',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'shadcn', 'data', 'leads'],
    surfaces: ['S3', 'S9', 'S10', 'S15', 'S16'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
  {
    id: 'tabs',
    type: 'molecule',
    name: 'Tabs',
    description: 'Abas para alternar entre conteúdos relacionados. Navegação por teclado (←→). Indicador visual de aba ativa.',
    intent: 'organizar conteúdo em abas, alternar entre visões, navegar entre seções relacionadas',
    category: 'navigation',
    triggers: ['tabs', 'abas', 'tab', 'painel', 'seções', 'alternar', 'navegação por abas'],
    mode: 'dashboard',
    edges: [],
    designSystem: {
      requires: true,
      sections: ['color', 'typography', 'spacing', 'radius'],
    },
    a11y: {
      role: 'tablist',
      ariaLabel: 'Navegação por abas',
      keyboardNav: true,
      contrastRatio: 4.5,
    },
    source: {
      name: 'Radix UI (shadcn/ui wrapper)',
      type: 'component',
      url: 'https://www.radix-ui.com/primitives/docs/components/tabs',
      quality: 'P0',
    },
    mutationId: 1,
    version: 1,
    tags: ['warp', 'radix', 'navigation'],
    surfaces: ['S3', 'S9', 'S10', 'S14'],
    segments: ['saude', 'beleza', 'servicos', 'alimentacao', 'comercio', 'educacao', 'hospitalidade'],
  },
]

// ═══════════════════════════════════════════════════════════════
// Destiller
// ═══════════════════════════════════════════════════════════════

export class Destiller {
  private readonly DEFAULT_PROPS = z.object({})

  /**
   * Retorna os 11 componentes shadcn/ui pré-destilados.
   * Cada um tem anatomia completa: description, intent, triggers, a11y, tokens.
   */
  getShadcnComponents(): WarpComponent[] {
    return SHADCN_COMPONENTS.map((c) => ({
      ...c,
      inputs: this.DEFAULT_PROPS,
      embedding: undefined,
      usageStats: {
        timesUsed: 0,
        lastUsedAt: '',
        avgRenderMs: 0,
      },
    }))
  }

  /**
   * Destila um ReferenceSource genérico em DestilledComponent.
   * Pipeline: analyze → distill → validate → return
   */
  async process(_reference: ReferenceSource): Promise<DestilledComponent> {
    // Placeholder — será implementado quando o LLM pipeline estiver ativo
    // Por enquanto, usamos as definições canônicas em SHADCN_COMPONENTS
    throw new Error(
      'Destiller.process() requer LLM pipeline (L6). Use getShadcnComponents() para definições canônicas.',
    )
  }
}

/** Singleton */
export const destiller = new Destiller()
