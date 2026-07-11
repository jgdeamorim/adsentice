// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/openapi.json
// OpenAPI 3.1.0 spec — 3 machine paths: openapi + llms.txt + MCP
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "adsentice Interaction Hub API",
      version: "1.0.0",
      description:
        "Hub inteligente de marketing para negócios locais (SMB Brasil). " +
        "Protocolo AG-UI (MIT) — 24 eventos, 13 padrões de interação. " +
        "Chat é 1 dos 13, não o sistema.",
      contact: {
        name: "adsentice",
        url: "https://adsentice.ai",
      },
      license: {
        name: "AG-UI MIT",
        url: "https://github.com/ag-ui-protocol/ag-ui",
      },
    },
    servers: [
      {
        url: "https://api.adsentice.ai",
        description: "Railway production",
      },
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
    ],
    tags: [
      { name: "Discovery", description: "Discovery pipeline — URL → 5 cards + tips + score" },
      { name: "Chat", description: "Chat livre multi-modelo (DeepSeek + Qwen local)" },
      { name: "Deep Dive", description: "Análises aprofundadas (credit-gated)" },
      { name: "System", description: "Endpoints de sistema" },
    ],

    // ── Paths ────────────────────────────────────────

    paths: {
      "/api/ag-ui/run": {
        post: {
          tags: ["Discovery"],
          summary: "Executar pipeline de discovery",
          description:
            "Submete uma URL de negócio e recebe um stream SSE de eventos AG-UI " +
            "com o diagnóstico completo: site audit, SEO, GMB, reputação, concorrência. " +
            "Output: cards + tips + score + deep-dives disponíveis.",
          operationId: "runDiscovery",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RunAgentInput" },
                example: {
                  threadId: "thread-abc123",
                  runId: "run-xyz789",
                  input: {
                    url: "minhaclinicaestetica.com.br",
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "SSE stream de eventos AG-UI",
              content: {
                "text/event-stream": {
                  schema: { $ref: "#/components/schemas/AguiEventStream" },
                  example: [
                    'event: message\ndata: {"type":"RUN_STARTED","threadId":"thread-1","runId":"run-1"}',
                    'event: message\ndata: {"type":"STEP_STARTED","stepName":"site_audit"}',
                    'event: message\ndata: {"type":"STEP_FINISHED","stepName":"site_audit","detail":"23 páginas · WordPress 6.4"}',
                    'event: message\ndata: {"type":"ACTIVITY_SNAPSHOT","activityType":"discovery-card","content":{"id":"site","title":"Site & Tecnologia","score":78}}',
                    'event: message\ndata: {"type":"RUN_FINISHED","threadId":"thread-1","runId":"run-1","outcome":{"type":"success"}}',
                  ].join("\n"),
                },
              },
            },
            "400": { description: "Input inválido (url ausente)" },
            "500": { description: "Erro no pipeline" },
          },
        },
      },

      "/api/openapi.json": {
        get: {
          tags: ["System"],
          summary: "OpenAPI spec",
          description: "Retorna esta especificação OpenAPI 3.1.0.",
          operationId: "getOpenApiSpec",
          responses: {
            "200": {
              description: "OpenAPI 3.1.0 JSON",
              content: { "application/json": {} },
            },
          },
        },
      },

      "/api/llms.txt": {
        get: {
          tags: ["System"],
          summary: "LLMs.txt — índice machine-readable",
          description: "Índice de todos os endpoints e docs para AI/agentes. Padrão llms.txt.",
          operationId: "getLlmsTxt",
          responses: {
            "200": {
              description: "Plain text index",
              content: { "text/plain": {} },
            },
          },
        },
      },
    },

    // ── Component Schemas ────────────────────────────

    components: {
      schemas: {
        RunAgentInput: {
          type: "object",
          required: ["threadId", "runId", "input"],
          properties: {
            threadId: { type: "string", description: "ID da sessão/thread" },
            runId: { type: "string", description: "ID idempotente da execução" },
            parentRunId: { type: "string", description: "ID do run pai (deep-dive)" },
            input: {
              type: "object",
              required: ["url"],
              properties: {
                url: { type: "string", format: "uri", description: "URL do negócio a analisar" },
                message: { type: "string", description: "Mensagem de chat livre" },
                deep_dive_id: { type: "string", description: "ID do deep-dive a executar" },
              },
            },
            resume: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  interruptId: { type: "string" },
                  status: { type: "string", enum: ["resolved", "cancelled"] },
                  payload: { type: "object" },
                },
              },
            },
          },
        },

        DiscoveryCard: {
          type: "object",
          properties: {
            id: { type: "string", example: "seo" },
            icon: { type: "string", example: "search" },
            title: { type: "string", example: "SEO & Descoberta" },
            score: { type: "integer", minimum: 0, maximum: 100, example: 54 },
            severity: { type: "string", enum: ["critical", "warning", "good", "excellent"] },
            highlights: { type: "array", items: { type: "string" } },
            deepDiveAvailable: { type: "boolean" },
            deepDiveCreditCost: { type: "integer", example: 10 },
          },
        },

        Tip: {
          type: "object",
          properties: {
            priority: { type: "integer", example: 1 },
            urgency: { type: "string", enum: ["high", "medium", "low"] },
            title: { type: "string", example: "Responda 3 reviews negativas deste mês" },
            detail: { type: "string" },
            action: { type: "string", example: "Ver reviews" },
            credit_cost: { type: "integer", example: 0 },
            pipeline: { type: "string", example: "gmb_reputation" },
          },
        },

        ScoreBreakdown: {
          type: "object",
          properties: {
            overall: { type: "integer", example: 62 },
            breakdown: {
              type: "object",
              properties: {
                site: { type: "integer" },
                seo: { type: "integer" },
                gmb: { type: "integer" },
                reputation: { type: "integer" },
                competitors: { type: "integer" },
              },
            },
          },
        },

        AguiEventStream: {
          type: "string",
          format: "text/event-stream",
          description:
            "Stream SSE com eventos AG-UI: RUN_STARTED, STEP_STARTED/FINISHED, " +
            "ACTIVITY_SNAPSHOT (cards, tips, score), RUN_FINISHED",
        },
      },
    },

    // ── External Docs ────────────────────────────────

    externalDocs: {
      description: "AG-UI Protocol Specification",
      url: "https://docs.ag-ui.com",
    },
  }

  return NextResponse.json(spec)
}
