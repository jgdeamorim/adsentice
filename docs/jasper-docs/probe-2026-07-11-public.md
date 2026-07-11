# Jasper.ai Public Probe — 2026-07-11

> Sem auth, sem browser. Apenas superfícies públicas: llms.txt, robots.txt, docs, MCP OAuth, OpenAPI inline.

---

## 0. Gate Results

### robots.txt
```
✅ ClaudeBot: Allow /
✅ GPTBot: Allow /
✅ PerplexityBot: Allow /
✅ Google-Extended: Allow /
✅ anthropic-ai: Allow /
⚠️  All other bots: Disallow /credits-rate-card
❌ Omgilibot: Disallow /
```

Header: `Content-Signal: ai-train=yes, search=yes, ai-input=yes`
→ **Jasper explicitamente permite AI training, search indexing, e AI input.**

### Sitemap
- `https://www.jasper.ai/sitemap.xml`

---

## 1. llms.txt — 73 document pages

### Guides (19)
| # | Path |
|---|------|
| 1 | `/docs/getting-started-1.md` |
| 2 | `/docs/authentication.md` |
| 3 | `/docs/rate-limits.md` |
| 4 | `/docs/common-use-cases.md` |
| 5 | `/docs/using-commands.md` |
| 6 | `/docs/using-agents.md` |
| 7 | `/docs/using-images.md` |
| 8 | `/docs/using-retrieval-add-ons.md` |
| 9 | `/docs/jasper-mcp-server.md` |
| 10 | `/docs/mcp-client-quickstart-guides.md` |
| 11 | `/docs/claudeai-web.md` |
| 12 | `/docs/claude-desktop.md` |
| 13 | `/docs/chatgpt-web.md` |
| 14 | `/docs/microsoft-copilot-studio.md` |
| 15 | `/docs/openai-agent-builder.md` |
| 16 | `/docs/n8n.md` |
| 17 | `/docs/jaspers-api-postman-collection.md` |
| 18 | `/docs/zapier.md` |
| 19 | `/docs/makecom-jasper.md` |

### API Reference (50 endpoints)
11 domínios: Attachments (1), Tasks (4), Commands (1), Knowledge (6), Voices (5), Style Guides (2), Documents (5), Users (2), Images (10), Image Templates (3), Projects (5), Templates (3), Audiences (2), Usage (1)

### Recipes (4)
- Create product description from internal specs
- Get Templates
- Run a template
- Run One-Shot Blog Post template

---

## 2. Context Items Schema (Jasper Agent System)

### Type Catalog (6 types)

| Type | Value Format | UI Component | Required Fields | Optional |
|------|-------------|-------------|-----------------|----------|
| `INPUT` | `string` | Text input | `id`, `name`, `type`, `question` | `tooltip`, `required` |
| `TEXTAREA` | `string` | Text area | `id`, `name`, `type`, `question` | `tooltip`, `required` |
| `SELECT` | `string` (matches option) | Dropdown/radio | `id`, `name`, `type`, `question`, `options[]` | `tooltip`, `required` |
| `MULTISELECT` | `array of strings` | Multi-select | `id`, `name`, `type`, `question`, `options[]` | `tooltip`, `required` |
| `KNOWLEDGE` | `array` (IDs or objects) | Knowledge picker | `id`, `name`, `type` | `question`, `required` |
| `CUSTOM` | `{name, question, answer}` | Dynamic form | `name`, `question`, `answer` | — |

### KNOWLEDGE Type — Two value formats

**Format A — Simple IDs:**
```json
{ "id": "ctx_knowledge", "value": ["kno_1", "kno_2"] }
```

**Format B — With extraction prompts:**
```json
{ "id": "ctx_knowledge", "value": [
  { "knowledgeId": "kno_1", "knowledgeExtractionPrompt": "Extract only product specs" },
  { "knowledgeId": "kno_2" }
]}
```

### Custom Context Items
```json
{ "name": "Target Reader", "question": "Who is the audience?", "answer": "Marketing managers at B2B SaaS" }
```

### Task Object Shape
```json
{
  "id": "uuid",
  "name": "Blog Post",
  "description": "...",
  "longDescription": "...",
  "contextItems": [...],
  "version": 9,
  "scope": "PUBLIC",
  "categories": [],
  "updatedAt": "2025-12-18T...",
  "createdAt": "2024-01-25T...",
  "publishedAt": "2024-06-11T..."
}
```

### Discovery Endpoints
- `GET /v1/tasks?size=100&page=1&scope=PUBLIC&includeContextItems=true&includeCategories=true&searchTerm=blog`
- `GET /v1/tasks/{taskId}`

### Execution Endpoints
- `POST /v1/tasks/{taskId}/run` (sync)
- `POST /v1/tasks/{taskId}/run/stream` (SSE streaming, `Accept: text/event-stream`)

### Customization Parameters (IQ layer)
| Parameter | Type | Purpose |
|-----------|------|---------|
| `toneId` | string | Brand voice |
| `audienceId` | string | Target audience persona |
| `styleGuideId` | string | Style guide rules |
| `knowledgeIds` | array | Ground in proprietary info |
| `toLanguage` | string | Target language (EN-US, ES, FR) |
| `version` | number | Pin specific task version |

### SSE Stream Events
```
event: message
data: {"step":{"id":"...","status":"loading|completed","label":"Thinking|Generating","description":"..."}}

event: message
data: {"id":"...","content":"...","role":"JASPER","usage":null,"skillId":"...","contentId":"..."}
```

---

## 3. MCP Server

### Server URL
`https://mcp.jasper.ai`

### Authentication
- **OAuth 2.0** — Full OIDC: dynamic client registration, PKCE (S256), authorization_code + refresh_token grant
- **API Key** — `X-API-KEY` header (for agentic software)

### OAuth Endpoints (discovered via .well-known/openid-configuration)
```
Issuer:                 https://mcp.jasper.ai
Authorize:              https://api.jasper.ai/oauth2/authorize
Token:                  https://api.jasper.ai/oauth2/token
Revoke:                 https://api.jasper.ai/oauth2/revoke
Introspect:             https://api.jasper.ai/oauth2/introspect
Register:               https://api.jasper.ai/oauth2/register
Scopes:                 ["mcp"]
Grant Types:            authorization_code, refresh_token
Challenge Methods:      S256
```

### Tools (7)
| Tool | Description |
|------|-------------|
| `get-jasper-brand-voices` | Retrieve brand voices available to workspace |
| `get-jasper-audiences` | Retrieve audiences available to workspace |
| `search-knowledge-base` | Search knowledge base (semantic) |
| `get-jasper-style-guides` | Retrieve style guide configuration |
| `get-jasper-agents` | List available marketing agents |
| `run-jasper-agent` | Execute a marketing task |
| `generate-content` | Create on-brand content using IQ context |

### Supported Clients (9)
- Claude Web (OAuth)
- Claude Desktop (.DXT + npm)
- ChatGPT Web (MCP connector)
- Microsoft Copilot Studio
- OpenAI Agent Builder
- n8n
- Cursor (`.cursor/mcp.json`)
- VS Code (`.vscode/mcp.json`)
- Windsurf (`~/.codeium/windsurf/mcp_config.json`)

### Local Server
```bash
npx -y @gojasper/mcp-server   # JASPER_API_KEY env var
```
Desktop Extension: `https://storage.googleapis.com/jasper-public-artifacts/dxt/jasper-mcp-server.dxt`

---

## 4. API Architecture

### Base
```
REST:  https://api.jasper.ai
Docs:  https://developers.jasper.ai
MCP:   https://mcp.jasper.ai
Auth:  X-API-KEY header
Plano: Business (sem free tier de API)
```

### API Rate Limits
| Category | RPM | Per Hour |
|----------|-----|----------|
| Content Generation | 105 | 6,300 |
| Read/CRUD | 200 | 12,000 |
| Styles | 60 | 3,600 |
| Images | 30 | 1,800 |

### Versioning Policy
- 6 months advance notice for deprecation
- Non-breaking changes: no notice needed
- Security risks: immediate deprecation allowed
- Future: calendar-based headers

### AI Engine
Multi-provider fallback per endpoint ("priority-ordered fallbacks per endpoint, per use case").
Jasper NÃO expõe qual modelo está usando — ele faz routing automático.

---

## 5. Marketing Site (jasper.ai)

### Stack
- **Webflow** (CMS + hosting)
- **HubSpot** (CRM/marketing)
- **Schema.org JSON-LD** structured data
- No CSS custom properties extractable without browser
- No Tailwind or component library detected from HTML alone

### Key Pages (from sitemap + nav)
```
/ (home)
/agents (100+ marketing agents)
/agents/research
/solutions/by-role/ (PM, BM, CM, PR, PFM)
/solutions/by-industry/ (FS, HC, Tech, Retail, Media, ProfSvcs)
/solutions/seo-aeo-geo (carro-chefe)
/solutions/personalization
/solutions/campaigns
/pricing (Pro $69/seat, Business custom)
/resources (blog, guides, webinars)
```

---

## 6. Gaps & Next Steps

### O que conseguimos SEM browser
- [x] llms.txt completo (73 páginas mapeadas)
- [x] robots.txt + permissões AI
- [x] Schema completo dos Context Items (6 tipos)
- [x] MCP server tools + auth (OAuth OIDC completo)
- [x] API rate limits + versioning
- [x] Discoberta de OpenAPI inline (50 endpoints, cada um com spec própria)

### O que PRECISA de browser (bridge :8992)
- [ ] `__NEXT_DATA__` do app.jasper.ai (agent list + schemas reais)
- [ ] CSS custom properties + design tokens computados
- [ ] Network waterfall (endpoints reais consumidos pelo frontend)
- [ ] Feature flags + ambiente config
- [ ] Brand voices, audiences, knowledge reais do workspace
- [ ] Template input schemas reais
- [ ] React component tree + icon system

### Para rodar com browser
```bash
# Terminal 1
python3 /media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/MY-CODER/tools/jasper-probe-bridge.py

# Browser: app.jasper.ai → F12 → Console
fetch('http://127.0.0.1:8992/client.js').then(r=>r.text()).then(eval)

# Terminal 2
python3 tools/adsentice_jasper_probe.py
```

---

## 7. Valor para adsentice

### O que já podemos modelar AGORA (sem browser)

1. **Pipeline Input Schema** — Os 6 Context Item types do Jasper são o blueprint para o `input` dos nossos 6 pipelines:
   ```typescript
   // adsentice pipeline input = Jasper Context Items adaptado
   type PipelineInput = {
     type: 'URL' | 'TEXT' | 'SELECT' | 'MULTISELECT' | 'BUSINESS_PROFILE' | 'CUSTOM'
     name: string
     question: string
     required: boolean
     options?: string[]
     defaultValue?: string
   }
   ```

2. **Discovery → Configure → Execute** — O workflow de 3 passos do Jasper é EXATAMENTE o que nosso `/chat/discover` precisa:
   - Discover: `GET /v1/tasks` → nosso `adsentice_kg_edges` + `adsentice_search`
   - Configure: Context Items + IQ params → nosso Brand IQ automático
   - Execute: `POST /v1/tasks/{id}/run[/stream]` → nosso `POST /api/chat/discover`

3. **IQ Layer** — Os 6 parâmetros do Jasper IQ mapeiam diretamente para nosso Brand IQ:
   - `toneId` → Brand Voice (descoberto do GMB/site)
   - `audienceId` → Audience Persona (descoberto do GMB/site)
   - `styleGuideId` → Style Rules (derivadas)
   - `knowledgeIds` → Vault documents (R2 + Qdrant)
   - `toLanguage` → pt-BR default
   - `version` → pipeline version pinning

4. **SSE Streaming** — O formato de eventos SSE do Jasper (step status + content chunks) é o padrão para nossa API de streaming.

5. **MCP Pattern** — OAuth 2.0 + API Key dual auth, 7 tools, 9 clients suportados. Nosso MCP server deve seguir o mesmo padrão.

6. **Rate Limiting** — 105-200 RPM por categoria. Nosso cost-gate deve ser modelado similarmente.

---

*Probe executado 2026-07-11 · adsentice Jasper Probe v1.0 · sem auth, sem browser*
