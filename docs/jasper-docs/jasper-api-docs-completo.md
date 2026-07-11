# Jasper API Documentation — Cópia Completa

> Fonte: https://developers.jasper.ai/docs/
> Data: 2026-07-11
> Propósito: Referência para o adsentice

---

## Índice

### Overview
- [Getting Started](#1-getting-started)
- [Authentication](#2-authentication)
- [Rate Limits](#3-rate-limits)
- [Versioning](#4-versioning)
- [Common Use Cases](#5-common-use-cases)

### API Usage Guides
- [Using Commands](#6-using-commands)
- [Using Agents](#7-using-agents)
- [Using Images](#8-using-images)
- [Using Retrieval Add-Ons](#9-using-retrieval-add-ons)

### MCP Server & Quickstarts
- [Jasper MCP Server](#10-jasper-mcp-server)

### Tools & Integrations
- [Postman, Zapier, Make.com](#11-tools--integrations)

### API Reference

### Recipes

---

## 1. Getting Started

This guide describes how to get started generating meaningful content with the Jasper API.

> ℹ️ Before you start
>
> Access to Jasper's API is currently only available for customers on the Jasper Business plan. If you'd like to signup for the Business plan, please go here and request a demo to contact Jasper: https://www.jasper.ai/api

This guide walks through how to get started generating your first few piece of content with the Jasper API.

---

### Step 1: Generate an API Key

The Jasper API uses API Keys to authenticate requests. Management of API Tokens are scoped to users with the Admin or Developer role.

You can generate a token after navigating to the API Tokens page:

- Go to the settings section in the Jasper application
- Click on the API Tokens page in the left hand navigation

Or visit the API Tokens page directly: https://app.jasper.ai/settings/dev-tools/tokens

### Step 2: Run your first Command

The `/commands` endpoint provides a flexible way to generate content by passing in a `command` (prompt) and `context` (background information) for Jasper to work from. You can think of the `command` input as what remains constant for a given job, and the `context` input as a dynamic variable to further improve the output.

In this example, we will use the commands endpoint to create a product description:

Example output:
```json
{
    "requestId": "4cfeeb0c-7dd3-4118-876a-f1da9acd2545",
    "resource": "content",
    "data": [
        {
            "id": "txt_54bdfbd7a0064953ae42f1f6f68069de",
            "text": "Discover the perfect 8-string electric guitar..."
        }
    ]
}
```

### Next Steps

- Common Use Cases
- Using Agents
- Jasper MCP Server

---

## 2. Authentication

The Jasper API uses API Keys to authenticate requests. Management of API Tokens is scoped to users with the **Admin** or **Developer** role for a given workspace.

Admins and Developers can generate API tokens in their workspace via the [settings/dev-tools/tokens](https://app.jasper.ai/settings/dev-tools/tokens) page.

Once your API token is generated, pass it in the `X-API-KEY` HTTP header:

```curl
curl --request GET \
     --url https://api.jasper.ai/v1/templates \
     --header 'X-API-Key: YOUR_JASPER_API_KEY' \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```

> ℹ️ Your API Key is a secret. Do not share it or expose it in client-side applications. Requests must be routed via your own backend server over HTTPS.

---

## 3. Rate Limits

Rate limits are on a per-workspace basis:

**Content Generation Endpoints (105 RPM / 6,300 per hour):**
- POST `/commands`
- POST `/templates/:id/run`
- POST `/keep-writing`
- POST `/tasks/:id/run`
- POST `/tasks/:id/run/stream`
- POST `/knowledge/search`

**Read/CRUD Endpoints (200 RPM / 12,000 per hour):**
- GET `/tasks`, GET `/tasks/:id`, GET `/templates`, GET `/templates/:id`
- POST/GET/PATCH/DELETE `/knowledge`, `/knowledge/:id`
- POST/GET/PATCH/DELETE `/tones`, `/tones/:id`
- GET `/usage`
- GET `/styles` (60 RPM / 3,600 per hour)

**Image Endpoints (30 RPM / 1,800 per hour):**
- POST `/image/cleanup`, `/image/decompose`, `/image/packshot-compositing`
- POST `/image/remove-background`, `/image/remove-text`, `/image/replace-background`
- POST `/image/uncrop`, `/image/upscale`

> ℹ️ AI Engine Fallbacks: Jasper's AI Engine configures a priority-order of fallbacks on a per-endpoint, per-use case basis to circumvent third-party model provider downtime.

---

## 4. Versioning

- **Minimum 6 months advance notice** for endpoint deprecation
- **Migration guidance** provided for deprecated endpoints
- **Non-breaking changes** (new endpoints, new read-only/optional fields, deprecation markers) do not require advance notice
- **Exceptions:** Security risks may require immediate deprecation
- **Backwards-incompatible changes:** Will use calendar-based headers in the future

---

## 5. Common Use Cases

### 1. Bulk Content Creation & Workflow Automation
Most commonly: internal system data → Jasper API → generated content. Examples:
- Product descriptions at scale from internal specs
- Rewriting site copy to inject SEO keywords
- Using external data (RSS feeds, tweets) to create blog headlines/outlines

### 2. Integrating Jasper with Team Tools
- External SaaS: Airtable, Monday.com, Salesforce
- Google Sheets: Script extension for bulk content
- Internal CMS/tools

### 3. Bringing Jasper to Your Users
- **Template-based Forms:** Dynamically construct UI from template `inputSchema`
- **Text Editor Enhancement:** Pre-packaged AI dropdowns
- **Chrome Extension:** Reference UX pattern

### 4. In-App AI Generated Content
- Blog post summaries, product review summaries, news article summaries
- Recommendation: Flag content as AI generated when no human review

---

## 6. Using Commands

The [Commands endpoint](https://developers.jasper.ai/reference/command-3) provides flexible, open-ended prompting.

**Use cases:**
- **Summarizing content** — "Summarize this content into 5 concise bullet points"
- **Rephrasing content** — "Rephrase the Input using a helpful, informative tone"
- **Rewrite/Remix** — "Rewrite this content using different words"
- **Improving content** — "Improve the Input to make it more interesting, creative, and engaging"

---

## 7. Using Agents

The `/tasks` endpoint exposes marketing tasks that Jasper Agents perform. Each Agent task is optimized for a specific marketing job-to-be-done with structured inputs called Context Items.

### Workflow

1. **Discover** — GET `/v1/tasks` (list all available Agent tasks)
2. **Configure** — Use Context Items from response to build request body
3. **Execute** — POST `/v1/tasks/{id}/run` (synchronous) or `/run/stream` (SSE streaming)

### Query Parameters for GET /tasks

| Parameter | Type | Default | Description |
|---|---|---|---|
| `size` | number | 100 | Number of tasks per page (1-100) |
| `page` | number | 1 | Page number (1-indexed) |
| `scope` | string | - | `PUBLIC` or `WORKSPACE` |
| `searchTerm` | string | - | Partial case-insensitive matching |
| `includeContextItems` | boolean | false | Include context items for each task |
| `includeCategories` | boolean | false | Include categories for each task |

### Context Item Types

| Type | Value Format | UI Component |
|---|---|---|
| `INPUT` | `string` | Text input |
| `TEXTAREA` | `string` | Text area |
| `SELECT` | `string` (must match option) | Dropdown/radio |
| `MULTISELECT` | `array of strings` | Multi-select |
| `KNOWLEDGE` | `array` (knowledge IDs or objects with extraction prompt) | Knowledge picker |

### Custom Context Items

```json
{
    "name": "Target Reader",
    "question": "Who is the primary audience?",
    "answer": "Marketing managers at B2B SaaS companies"
}
```

### Customization Parameters

**Jasper IQ:**
- `toneId` — Apply brand voice
- `audienceId` — Target audience persona
- `styleGuideId` — Apply style guide rules
- `knowledgeIds` — Ground in proprietary information

**Localization:**
- `toLanguage` — Generate in specific language (e.g., "EN-US", "ES", "FR")

**Versioning:**
- `version` — Run specific version of Agent task

### Streaming (SSE)

Endpoint: `POST /v1/tasks/{id}/run/stream`

Events include:
- `step` — Status updates (loading/completed) with label and description
- Content chunks — Progressive text generation with content ID

---

## 8. Using Images

Image API access available for Business plan customers.

### Endpoints

1. **Remove Background** — Isolate subject with transparent background
2. **Replace Background** — Place subject in described scene
3. **Cleanup** — Remove unwanted objects/blemishes
4. **Remove Text** — Strip watermarks, captions, overlays
5. **Upscale** — Enhance resolution with AI detail generation
6. **Uncrop** — Expand image beyond original boundaries
7. **Packshot Compositing** — Studio-quality product shots
8. **Decompose Image** — Separate into layers (foreground, background, shadows)
9. **Generate Alt Text** — WCAG-compliant descriptive alt text
10. **Analyze** — Object detection, color palette, content insights

---

## 9. Using Retrieval Add-Ons

Augment API generations with external data using the `retrievalAddOn` field.

### Web Search (`webSearch`)
- Jasper crafts query from request inputs
- Uses top 3 search results as context
- Customizable: `siteBlockList`, `searchQuery`, `maxResults`

### Web Scraping (`webScraper`)
- Scrapes, cleans, and reformats web page data
- Auto-detects URLs in request inputs
- Customizable: `urls` (explicit list to extract from)

Compatible with `/v1/command` and `/v1/templates/{id}/run`.

---

## 10. Jasper MCP Server

Connect AI Agents (Claude, ChatGPT, Copilot Studio, OpenAI Agent Builder, n8n) to Jasper for on-brand content creation.

### Remote Server
URL: `https://mcp.jasper.ai` (streamable HTTP, OAuth 2.0)

### Available Tools (7)

| Tool | Description |
|---|---|
| `get-jasper-brand-voices` | Retrieve brand voices available to workspace |
| `get-jasper-audiences` | Retrieve audiences available to workspace |
| `search-knowledge-base` | Search Knowledge Base (semantic, not keyword) |
| `get-jasper-style-guides` | Retrieve style guide configuration |
| `get-jasper-agents` | List available marketing agents |
| `run-jasper-agent` | Execute a marketing task |
| `generate-content` | Create on-brand content using IQ context |

### Local Server

**Desktop Extension (.DXT):** One-click install for Claude Desktop
**NPM:** `npx -y @gojasper/mcp-server` with `JASPER_API_KEY` env var

### MCP Quickstart Clients
- Claude (Web) — Settings → Connectors → `https://mcp.jasper.ai`
- Claude (Desktop) — `.DXT` file or `claude_desktop_config.json`
- ChatGPT — MCP connector configuration
- Microsoft Copilot Studio
- OpenAI Agent Builder — API Key header method
- n8n — Workflow automation

---

## 11. Tools & Integrations

- **Postman:** Jasper Postman Collection for API development
- **Zapier:** `zapier.com/apps/jasper/integrations`
- **Make.com:** `make.com/en/integrations/jasper-ai`

---

## API Reference Summary

Base URL: `https://api.jasper.ai`
Auth: `X-API-KEY` header

### Attachments
| Method | Path | Description |
|---|---|---|
| POST | `/v1/attachments` | Create temporary attachment (FILE, TEXT, or URL) |

### Agent Tasks
| Method | Path | Description |
|---|---|---|
| GET | `/v1/tasks` | List all agent tasks |
| GET | `/v1/tasks/{id}` | Get task by ID |
| POST | `/v1/tasks/{id}/run` | Run task (synchronous) |
| POST | `/v1/tasks/{id}/run/stream` | Run task (SSE streaming) |

### Commands
| Method | Path | Description |
|---|---|---|
| POST | `/v1/commands/run` | Execute command for content generation |

### Knowledge
| Method | Path | Description |
|---|---|---|
| POST | `/v1/knowledge` | Create knowledge item |
| GET | `/v1/knowledge` | List (sorted by recent) |
| GET | `/v1/knowledge/{id}` | Get by ID |
| PATCH | `/v1/knowledge/{id}` | Update by ID |
| DELETE | `/v1/knowledge/{id}` | Delete by ID |
| POST | `/v1/knowledge/search` | Semantic search (natural language) |

### Voices (Tones)
| Method | Path | Description |
|---|---|---|
| POST | `/v1/voices` | Create voice |
| GET | `/v1/voices` | List all |
| GET | `/v1/voices/{id}` | Get by ID |
| PATCH | `/v1/voices/{id}` | Update by ID |
| DELETE | `/v1/voices/{id}` | Delete by ID |

### Style Guides
| Method | Path | Description |
|---|---|---|
| GET | `/v1/style-guides` | List all |
| GET | `/v1/style-guides/{id}` | Get by ID |

### Documents
| Method | Path | Description |
|---|---|---|
| GET | `/v1/documents` | List all |
| POST | `/v1/documents` | Create |
| GET | `/v1/documents/{id}` | Get by ID |
| PATCH | `/v1/documents/{id}` | Update |
| DELETE | `/v1/documents/{id}` | Delete |

### Users
| Method | Path | Description |
|---|---|---|
| GET | `/v1/users` | List all |
| GET | `/v1/users/{id}` | Get by ID |

### Images
| Method | Path | Description |
|---|---|---|
| POST | `/v1/images/remove-background` | Remove background |
| POST | `/v1/images/replace-background` | Replace with prompt-described scene |
| POST | `/v1/images/cleanup` | Remove unwanted elements via mask |
| POST | `/v1/images/remove-text` | Remove overlaid text |
| POST | `/v1/images/upscale` | Upscale to specified dimensions |
| POST | `/v1/images/uncrop` | Extend image in specified directions |
| POST | `/v1/images/packshot-compositing` | Product shot compositing |
| POST | `/v1/images/decompose` | Separate into layers |
| POST | `/v1/images/alt-text` | Generate descriptive alt text |
| POST | `/v1/images/analyze` | Answer question about image |

### Image Templates
| Method | Path | Description |
|---|---|---|
| POST | `/v1/image-templates` | Create template |
| GET | `/v1/image-templates/{id}` | Get metadata + layers |
| POST | `/v1/image-templates/{id}/render` | Render with dynamic updates |

### Projects
| Method | Path | Description |
|---|---|---|
| POST | `/v1/projects` | Create |
| GET | `/v1/projects` | List all |
| GET | `/v1/projects/{id}` | Get by ID |
| PATCH | `/v1/projects/{id}` | Update |
| DELETE | `/v1/projects/{id}` | Delete |

### Templates
| Method | Path | Description |
|---|---|---|
| GET | `/v1/templates` | List all (default + custom) |
| GET | `/v1/templates/{id}` | Get by ID |
| POST | `/v1/templates/{id}/run` | Run template |

### Audiences
| Method | Path | Description |
|---|---|---|
| GET | `/v1/audiences` | List all |
| GET | `/v1/audiences/{id}` | Get by ID |

### Usage
| Method | Path | Description |
|---|---|---|
| GET | `/v1/usage` | API usage stats (content generation only) |

---

## Recipes (4)

1. **Create product description from internal specs** — `/v1/templates/{id}/run` with guitar specs
2. **GET Templates** — Retrieve available templates
3. **Run a template** — Execute template with inputs
4. **Run One-Shot Blog Post template** — Blog post generation

---

## Análise para adsentice

### O que o Jasper expõe via API que é relevante

| Recurso Jasper | Equivalente adsentice |
|---|---|
| **Knowledge** (CRUD + search) | Vault + rsxt-v0 semantic search |
| **Voices** (brand tone) | Brand IQ automático (descoberta, não configurado) |
| **Agents** (100+ marketing tasks) | 8 eixos Stage 3 + 5 soluções |
| **Commands** (open-ended prompt) | `/brain/ask` (DeepSeek + grounded) |
| **Images** (10 endpoints) | Não é nosso foco |
| **MCP Server** (7 tools) | Nosso `/mcp` + OpenAPI 3.1 (73 caps) |

### O que o Jasper NÃO tem via API

- ❌ Search volume / keyword data
- ❌ SERP analysis
- ❌ Competitor intelligence
- ❌ GMB / business profile
- ❌ Reviews data
- ❌ Backlinks analysis
- ❌ On-page SEO audit
- ❌ Ad intelligence / traffic forecast
- ❌ Market data de qualquer tipo

**A API do Jasper é exclusivamente para GERAÇÃO de conteúdo on-brand.** Não tem 1 endpoint de dados de mercado. Nosso diferencial permanece intacto.

---

---

## 12. Claude (Web) Quickstart

### Prerequisites
**Jasper:** Business plan account (API access required)
**Claude:** Pro, Max, Team, or Enterprise plan

### Connection Steps
1. Go to Claude.ai → Settings → Connectors
2. Select "Add custom connector" or "Add external MCP server"
3. Input URL: `https://mcp.jasper.ai`
4. Complete Jasper OAuth consent and client registration flow
5. Toggle connection on after setup
6. In any chat, click Tools icon and confirm Jasper tools are enabled

### Custom Instructions
```text
For any marketing-related content requests, always leverage Jasper tools. If the Jasper tools are not connected, ask the user to connect them before proceeding.
```

### Example Prompts
| Task | Prompt Example |
|------|---------------|
| Access IQ Information | "What Jasper brand voices and audiences do I have access to?" |
| Generate on-brand content | "Write a LinkedIn post announcing our new CTO using a relevant brand voice from Jasper" |
| Create targeted messaging | "Draft an email campaign targeting our Jasper audience about our Q1 product update" |
| Search your knowledge base | "Find information in my Jasper knowledge base about new product releases and then create a sales one-pager" |
| Multi-audience content | "Create social media posts about our summer sale - one for our Gen Z and one for our business professionals audience in Jasper" |

---

## 13. Claude (Desktop) Quickstart

### Prerequisites
1. Jasper Business Plan with API Access
2. Claude Desktop application + Claude Pro account
3. Your Jasper API Key

### Method 1: Desktop Extension (.DXT)
1. Download `jasper-mcp-server.dxt` from Jasper
2. Double-click the file to auto-install in Claude Desktop
3. Enter your Jasper API Key when prompted
4. Click "Enable" to enable the extension

### Method 2: NPM
```json
{
  "mcpServers": {
    "jasper": {
      "command": "npx",
      "args": ["-y", "@gojasper/mcp-server"],
      "env": {
        "JASPER_API_KEY": "<your-jasper-api-key>"
      }
    }
  }
}
```
Supported clients: Claude Desktop, Cursor, VS Code, Windsurf.

---

## 14. Postman Collection

Jasper maintains a public Postman Collection at:
`https://www.postman.com/jasper-nation/workspace/jasper-public-api/overview`

### Setup
1. Export the collection from Jasper's Postman workspace
2. Import into your Postman workspace
3. Replace `{{JASPER_API_KEY}}` variable with your API key
4. Start sending authenticated requests

---

## 15. Zapier Integration

Jasper's Zapier integration enables no-code automated workflows with Google Sheets, Slack, Salesforce, WordPress, etc.

### Prerequisites
1. Jasper API key
2. Zapier account

### Actions Available
- Blog creation
- Product description writing
- Content summarization
- Run any template (by ID)
- Run a free-form command

### Setup Flow
1. Create a Zap with a trigger (e.g., spreadsheet status change)
2. Select Jasper Connector as the Action
3. Connect Jasper account with API key
4. Build out Zaps to automate content workflows

---

## 16. Make.com Integration

Similar to Zapier: no-code automation connecting Jasper with external apps via Make.com scenarios. Supports running templates and commands as automation steps.

---

*Documento compilado em 2026-07-11 de https://developers.jasper.ai/docs/*
*Total: 16 seções cobrindo toda a documentação pública da API Jasper*
