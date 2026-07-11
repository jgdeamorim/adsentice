// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/llms.txt
// Machine-readable index for AI/agents (padrão llms.txt)
// Jasper reference: https://developers.jasper.ai/llms.txt
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const txt = [
    "# adsentice · Interaction Hub",
    "# Hub inteligente de marketing para negócios locais (SMB Brasil)",
    "# Protocolo: AG-UI (MIT) · MCP · A2A",
    "",
    "## API Endpoints",
    "- POST /api/ag-ui/run: Discovery pipeline — URL → 5 cards + tips + score (SSE AG-UI events)",
    "- GET /api/openapi.json: OpenAPI 3.1.0 specification",
    "- GET /api/llms.txt: Este índice (machine-readable)",
    "",
    "## MCP Servers",
    "- adsentice-redis: Redis OODA operations (get, set, delete, list)",
    "- adsentice-qdrant: Semantic search on adsentice corpus",
    "- adsentice-kg: Knowledge Graph navigation (34 edges, 5 relations)",
    "- adsentice-conversation: Cross-KG conversation history search",
    "- dataforseo: 9 modules, ~30 tools (SERP, Keywords, OnPage, etc.)",
    "- firecrawl: Web scraping and site mapping (keyless free tier)",
    "- context7: Documentation lookup for libraries/frameworks",
    "",
    "## Docs (Markdown)",
    "- docs/adsentice-chat-spec.md: Interaction Hub specification (AG-UI v1.0.0)",
    "- docs/adsentice-objetivos-solucoes-criterios.md: Objectives, solutions, criteria",
    "- docs/spec/base-matriz-adsentice.md: Navigable ecosystem map (7 dimensions)",
    "- docs/adr/0001-arquitetura-standalone-adsentice.md: Architecture ADR",
    "- docs/jasper-docs/README.md: Jasper.ai canonical reference",
    "- CLAUDE.md: Project context and canonical recovery order",
    "",
    "## Stack",
    "- Frontend: Next.js 15 + TypeScript + Materio (MUI)",
    "- Backend: Railway (Node.js)",
    "- Database: Supabase (Postgres + Auth)",
    "- Storage: Cloudflare R2",
    "- AI: DataForSEO MCP · DeepSeek V4 (arbitrator) · Qwen 2.5 1.5B (local) · mpnet 768d (embed)",
    "- Infra: Docker Compose (Redis :6396 + Qdrant :6352) + embed-server-rs :8081",
    "",
    "## Pricing",
    "- Free: R$0 (discovery gratuito)",
    "- Starter: R$47/mês",
    "- Pro: R$197/mês",
    "- Escala: R$497/mês",
    "",
    "## Contact",
    "- GitHub: https://github.com/jgdeamorim/adsentice",
    "- OpenAPI: /api/openapi.json",
    "- AG-UI Protocol: https://docs.ag-ui.com",
  ].join("\n")

  return new NextResponse(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
