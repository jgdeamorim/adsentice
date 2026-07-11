#!/usr/bin/env python3
"""
adsentice Jasper Probe — extrai o máximo do Jasper.ai via bridge :8992.
Depende de jasper-probe-bridge.py rodando (MY-CODER) + browser logado em app.jasper.ai.

Fases:
  1. Schema extraction — agentes, context items, templates
  2. Brand IQ — brand voices, audiences, style guides, knowledge
  3. Navigation — mapa de rotas, feature flags, estado React
  4. API surface — endpoints reais (network waterfall), tokens, formatos
  5. Design DNA — computed styles, tokens, tipografia

Output: .data/jasper-probes/YYYY-MM-DD/ (JSON + markdown report)
"""

import asyncio
import json
import os
import sys
import time
import uuid
from datetime import datetime
import httpx

BRIDGE_URL = "http://127.0.0.1:8992"
PROBE_TIMEOUT = 20.0  # segundos por probe

# ── Probes catalog ──────────────────────────────────────────────

PROBES = {
    # ═══ FASE 1: Schema Extraction ═══
    "next_data": {
        "phase": 1,
        "label": "Next.js __NEXT_DATA__ (props + buildId + runtimeConfig)",
        "code": """
const d = window.__NEXT_DATA__ || {};
const safe = { buildId: d.buildId, page: d.page, props: {} };
if (d.props) {
  const pp = d.props.pageProps || d.props;
  for (const k of Object.keys(pp)) {
    const v = pp[k];
    if (k === 'tasks' || k === 'templates' || k === 'agents') {
      safe.props[k] = Array.isArray(v) ? v.slice(0, 50).map(x => {
        const c = {...x};
        delete c.component; delete c.render; delete c.__proto__;
        return c;
      }) : `type=${typeof v}`;
    } else if (k === 'voices' || k === 'audiences' || k === 'knowledge' || k === 'styleGuides') {
      safe.props[k] = Array.isArray(v) ? v.slice(0, 30) : `type=${typeof v}`;
    } else if (typeof v === 'object' && v !== null) {
      safe.props[k] = Object.keys(v).slice(0, 20);
    } else {
      safe.props[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
  }
}
JSON.stringify(safe, null, 2);
"""
    },

    "tasks_schema": {
        "phase": 1,
        "label": "Agent Tasks — full schema (context items, categories, params)",
        "code": """
const extractTasks = () => {
  // Try multiple sources
  const sources = [
    () => window.__NEXT_DATA__?.props?.pageProps?.tasks,
    () => window.__NEXT_DATA__?.props?.pageProps?.data?.tasks,
    () => window.__NEXUS_STATE__?.tasks,
    () => window.__APOLLO_STATE__ && Object.values(window.__APOLLO_STATE__).filter(v => v?.__typename === 'Task'),
  ];
  for (const s of sources) {
    const v = s();
    if (v && Array.isArray(v) && v.length > 0) return v;
  }
  // Fallback: fetch from the page's API endpoint
  return [];
};

const tasks = extractTasks();
if (!tasks.length) {
  // Try fetch the page listing
  const r = await fetch('/v1/tasks?size=100&includeContextItems=true&includeCategories=true', {
    headers: { 'accept': 'application/json', 'x-api-key': localStorage.getItem('apiKey') || '' }
  }).catch(() => null);
  if (r && r.ok) {
    const j = await r.json();
    return JSON.stringify({source: 'api', data: j.data || j}, null, 2);
  }
  return JSON.stringify({source: 'none', found: false, note: 'login required or API key missing'});
}

const mapped = tasks.slice(0, 80).map(t => ({
  id: t.id,
  name: t.name || t.title,
  description: (t.description || '').slice(0, 300),
  categories: t.categories?.map(c => c.name || c) || [],
  scope: t.scope,
  version: t.version,
  contextItems: (t.contextItems || t.input || []).slice(0, 20).map(ci => ({
    name: ci.name || ci.label,
    type: ci.type || ci.kind,
    question: ci.question || ci.prompt || '',
    required: ci.required ?? ci.mandatory ?? false,
    options: ci.options?.slice(0, 20) || null,
    defaultValue: ci.defaultValue || ci.default || null,
    placeholder: ci.placeholder || ci.hint || '',
    description: (ci.description || '').slice(0, 150),
  })),
  outputSchema: t.outputSchema || t.output || null,
}));
JSON.stringify({source: 'client', count: mapped.length, tasks: mapped}, null, 2);
"""
    },

    "templates_api": {
        "phase": 1,
        "label": "Templates — fetch via API (/v1/templates)",
        "code": """
const r = await fetch('/v1/templates?size=100', {
  headers: { 'accept': 'application/json', 'x-api-key': localStorage.getItem('apiKey') || '' }
}).catch(() => null);
if (r && r.ok) {
  const j = await r.json();
  const templates = (j.data || j || []).slice(0, 60).map(t => ({
    id: t.id, name: t.name, description: (t.description||'').slice(0,200),
    inputSchema: t.inputSchema || t.inputs || null,
    categories: t.categories || [],
  }));
  return JSON.stringify({source: 'api', count: templates.length, templates}, null, 2);
}
JSON.stringify({source: 'api', found: false, status: r?.status});
"""
    },

    # ═══ FASE 2: Brand IQ ═══
    "brand_voices": {
        "phase": 2,
        "label": "Brand Voices — fetch via API (/v1/voices)",
        "code": """
const r = await fetch('/v1/voices?size=100', {
  headers: { 'accept': 'application/json', 'x-api-key': localStorage.getItem('apiKey') || '' }
}).catch(() => null);
if (r && r.ok) {
  const j = await r.json();
  const voices = (j.data || j || []).slice(0, 30).map(v => ({
    id: v.id, name: v.name, tone: v.tone, description: (v.description||'').slice(0,200),
    samplePhrases: v.samplePhrases?.slice(0,5) || null,
  }));
  return JSON.stringify({source: 'api', count: voices.length, voices}, null, 2);
}
JSON.stringify({source: 'api', found: false, status: r?.status});
"""
    },

    "audiences": {
        "phase": 2,
        "label": "Audiences — fetch via API (/v1/audiences)",
        "code": """
const r = await fetch('/v1/audiences?size=100', {
  headers: { 'accept': 'application/json', 'x-api-key': localStorage.getItem('apiKey') || '' }
}).catch(() => null);
if (r && r.ok) {
  const j = await r.json();
  const audiences = (j.data || j || []).slice(0, 30).map(a => ({
    id: a.id, name: a.name, description: (a.description||'').slice(0,200),
    demographics: a.demographics || a.attributes || null,
  }));
  return JSON.stringify({source: 'api', count: audiences.length, audiences}, null, 2);
}
JSON.stringify({source: 'api', found: false, status: r?.status});
"""
    },

    "style_guides": {
        "phase": 2,
        "label": "Style Guides — fetch via API (/v1/style-guides)",
        "code": """
const r = await fetch('/v1/style-guides?size=100', {
  headers: { 'accept': 'application/json', 'x-api-key': localStorage.getItem('apiKey') || '' }
}).catch(() => null);
if (r && r.ok) {
  const j = await r.json();
  const guides = (j.data || j || []).slice(0, 20).map(g => ({
    id: g.id, name: g.name, rules: g.rules?.slice(0, 10) || [],
    description: (g.description||'').slice(0,200),
  }));
  return JSON.stringify({source: 'api', count: guides.length, guides}, null, 2);
}
JSON.stringify({source: 'api', found: false, status: r?.status});
"""
    },

    "knowledge": {
        "phase": 2,
        "label": "Knowledge Base — fetch via API (/v1/knowledge)",
        "code": """
const r = await fetch('/v1/knowledge?size=100', {
  headers: { 'accept': 'application/json', 'x-api-key': localStorage.getItem('apiKey') || '' }
}).catch(() => null);
if (r && r.ok) {
  const j = await r.json();
  const items = (j.data || j || []).slice(0, 30).map(k => ({
    id: k.id, name: k.name || k.title, type: k.type || k.category,
    description: (k.description||'').slice(0,200),
  }));
  return JSON.stringify({source: 'api', count: items.length, items}, null, 2);
}
JSON.stringify({source: 'api', found: false, status: r?.status});
"""
    },

    # ═══ FASE 3: Navigation + State ═══
    "routes": {
        "phase": 3,
        "label": "Navigation — Next.js route manifest + router state",
        "code": """
const routes = {
  nextRoutes: window.__NEXT_DATA__?.buildId ? 'Next.js detected' : 'not Next',
  nextManifest: Object.keys(window.__BUILD_MANIFEST__ || {}).slice(0, 60),
  currentPath: location.pathname + location.search,
  historyLength: history.length,
};
// Try React Router / Next Router
const fiber = document.querySelector('[id="__next"]');
const reactRoot = fiber?._reactRootContainer || fiber?.__reactContainer$ || fiber?._reactRootComponent;
if (window.next?.router) {
  routes.router = {
    pathname: window.next.router.pathname,
    query: window.next.router.query,
    locales: window.next.router.locales || [],
    defaultLocale: window.next.router.defaultLocale,
  };
}
// Sitemap links on page
const links = [...document.querySelectorAll('a[href^="/"]')]
  .filter(a => !a.href.includes('#') && a.textContent.trim())
  .slice(0, 100)
  .map(a => ({href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 60)}));
routes.pageLinks = [...new Map(links.map(l => [l.href, l])).values()];
JSON.stringify(routes, null, 2);
"""
    },

    "feature_flags": {
        "phase": 3,
        "label": "Feature flags + environment config",
        "code": """
const flags = {};
// Common feature flag sources
const sources = [
  ['LD', () => window.ldClient?.allFlags?.()],
  ['GROWTHBOOK', () => window._growthbook?.getFeatures()],
  ['CONFIG', () => window.__CONFIG__ || window.__APP_CONFIG__ || window.__RUNTIME_CONFIG__],
  ['ENV', () => window.__ENV__ || window.process?.env],
  ['NEXT_PUBLIC', () => {
    const envs = {};
    for (const k of Object.keys(window).filter(k => k.startsWith('__NEXT') || k.startsWith('NEXT_'))) {
      envs[k] = typeof window[k] === 'string' ? window[k].slice(0, 100) : window[k];
    }
    return envs;
  }],
  ['LOCAL_STORAGE_KEYS', () => Object.keys(localStorage).filter(k => k.includes('feature') || k.includes('flag') || k.includes('config')).slice(0, 20)],
];
for (const [name, fn] of sources) {
  try { flags[name] = fn(); } catch(e) { flags[name] = `err:${e.message}`; }
}
JSON.stringify(flags, null, 2);
"""
    },

    # ═══ FASE 4: API Surface ═══
    "api_endpoints": {
        "phase": 4,
        "label": "API endpoints — from Next.js pages + network interception",
        "code": """
const endpoints = {
  // Extract API paths from build manifest
  buildApiRoutes: Object.keys(window.__BUILD_MANIFEST__ || {})
    .filter(k => k.startsWith('/api/') || k.startsWith('/v1/'))
    .slice(0, 40),

  // Known Jasper API patterns from page source
  knownPatterns: [
    'https://api.jasper.ai/v1/tasks',
    'https://api.jasper.ai/v1/commands/run',
    'https://api.jasper.ai/v1/templates',
    'https://api.jasper.ai/v1/voices',
    'https://api.jasper.ai/v1/audiences',
    'https://api.jasper.ai/v1/knowledge',
    'https://api.jasper.ai/v1/style-guides',
    'https://api.jasper.ai/v1/usage',
    'https://api.jasper.ai/v1/documents',
    'https://api.jasper.ai/v1/images',
    'https://api.jasper.ai/v1/image-templates',
    'https://api.jasper.ai/v1/projects',
    'https://api.jasper.ai/v1/users',
    'https://api.jasper.ai/v1/attachments',
    'https://mcp.jasper.ai',
  ],

  // Detect analytics / 3rd-party endpoints from script tags
  thirdPartyScripts: [...document.querySelectorAll('script[src]')]
    .map(s => new URL(s.src).hostname)
    .filter(h => !h.includes('jasper.ai') && !h.includes('cloudfront')),

  // Detect API host mentions in page source
  apiHosts: [...new Set(
    (document.documentElement.innerHTML.match(/https?:\\/\\/[a-zA-Z0-9.-]+\\.(jasper\\.ai|api\\.jasper)/g) || [])
      .slice(0, 30)
  )],
};
JSON.stringify(endpoints, null, 2);
"""
    },

    "network_snapshot": {
        "phase": 4,
        "label": "Network — performance API entries (last 50 requests)",
        "code": """
const entries = performance.getEntriesByType('resource')
  .filter(e => e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest')
  .slice(-50);
const snap = entries.map(e => ({
  name: e.name.slice(0, 200),
  duration: Math.round(e.duration),
  startTime: Math.round(e.startTime),
  transferSize: e.transferSize,
  initiatorType: e.initiatorType,
  domain: new URL(e.name).hostname,
  path: new URL(e.name).pathname.slice(0, 100),
}));
// Count by domain
const domains = {};
snap.forEach(s => { domains[s.domain] = (domains[s.domain]||0) + 1; });
JSON.stringify({total: snap.length, byDomain: domains, entries: snap.slice(0, 50)}, null, 2);
"""
    },

    # ═══ FASE 5: Design DNA ═══
    "design_tokens": {
        "phase": 5,
        "label": "Design tokens — CSS custom properties, computed styles, typography",
        "code": """
const tokens = {};

// CSS custom properties from :root
const rootStyles = getComputedStyle(document.documentElement);
const cssVars = {};
for (let i = 0; i < rootStyles.length; i++) {
  const prop = rootStyles[i];
  if (prop.startsWith('--')) {
    cssVars[prop] = rootStyles.getPropertyValue(prop).trim();
  }
}
tokens.cssVars = cssVars;

// Typography from key elements
const elements = {
  body: document.body,
  h1: document.querySelector('h1'),
  h2: document.querySelector('h2'),
  button: document.querySelector('button:not([class*="icon"])'),
  input: document.querySelector('input[type="text"]') || document.querySelector('input'),
  card: document.querySelector('[class*="card"]') || document.querySelector('[class*="Card"]'),
  link: document.querySelector('a:not([class*="logo"]):not([class*="nav"])'),
};
tokens.typography = {};
for (const [name, el] of Object.entries(elements)) {
  if (!el) { tokens.typography[name] = null; continue; }
  const s = getComputedStyle(el);
  tokens.typography[name] = {
    fontFamily: s.fontFamily?.split(',')[0],
    fontSize: s.fontSize, fontWeight: s.fontWeight,
    lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
    color: s.color, backgroundColor: s.backgroundColor,
    borderRadius: s.borderRadius,
    padding: s.padding, margin: s.margin,
  };
}

// Framework detection
tokens.framework = {
  tailwind: !!document.querySelector('[class*="tw-"]') || !!document.querySelector('style:contains("tailwind")'),
  styledComponents: !!document.querySelector('[class*="sc-"]'),
  cssModules: !!document.querySelector('[class*="_"]'),
  nextJS: !!document.getElementById('__next'),
  react: !!window.React || !!document.querySelector('[data-reactroot]'),
  hasDesignSystem: Object.keys(cssVars).filter(k => k.startsWith('--color') || k.startsWith('--font') || k.startsWith('--space')).length > 0,
};
tokens.framework.cssVarCount = Object.keys(cssVars).length;

// Color palette extraction
tokens.palette = {
  color: [...new Set(Object.entries(cssVars).filter(([k]) => k.includes('color') || k.includes('Color')).map(([,v]) => v).filter(v => v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl')).slice(0, 40))],
  surface: [...new Set(Object.entries(cssVars).filter(([k]) => k.includes('surface') || k.includes('bg') || k.includes('background')).map(([,v]) => v).filter(v => v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl')).slice(0, 20))],
};

JSON.stringify(tokens, null, 2);
"""
    },

    "icon_system": {
        "phase": 5,
        "label": "Icon system — SVG sprites, icon library detection, icon count",
        "code": """
const icons = {
  svgCount: document.querySelectorAll('svg').length,
  inlineSvgCount: document.querySelectorAll('svg:not([src])').length,
  externalSvgCount: document.querySelectorAll('img[src$=".svg"]').length,
  iconClasses: [...document.querySelectorAll('[class*="icon"], [class*="Icon"], [class*="i-"], [data-icon]')].slice(0, 10).map(el => el.className?.baseVal || el.className || el.getAttribute('data-icon')),
  svgSizes: [...new Set([...document.querySelectorAll('svg')].map(s => s.getAttribute('viewBox') || s.getAttribute('width') + 'x' + s.getAttribute('height')).filter(Boolean).slice(0, 30))],
  spriteDetection: !!document.querySelector('svg[style*="display:none"] symbol, svg[style*="display: none"] symbol, svg > defs > symbol'),
  // Detect icon library from class patterns
  libraryHints: Array.from(document.querySelectorAll('[class*="lucide"], [class*="heroicon"], [class*="ph-"], [class*="ri-"], [class*="fa-"], [class*="tabler"], [class*="radix"], [class*="material"]')).slice(0, 5).map(el => el.className?.baseVal || el.className),
};
JSON.stringify(icons, null, 2);
"""
    },

    # ═══ FASE 6: MCP + Integration ═══
    "mcp_info": {
        "phase": 6,
        "label": "MCP server info — tools list, auth method, config docs",
        "code": """
// Try to hit MCP server endpoint
const mcpInfo = { server: 'https://mcp.jasper.ai', accessible: false, auth: 'OAuth 2.0 + X-API-KEY', plan: 'Business' };
try {
  const r = await fetch('https://mcp.jasper.ai/health', { signal: AbortSignal.timeout(3000) });
  mcpInfo.healthStatus = r.status;
  mcpInfo.accessible = r.ok;
} catch(e) {
  mcpInfo.healthError = e.message;
}
// Available from page meta/docs
mcpInfo.knownTools = [
  'get-jasper-brand-voices', 'get-jasper-audiences', 'search-knowledge-base',
  'get-jasper-style-guides', 'get-jasper-agents', 'run-jasper-agent', 'generate-content'
];
mcpInfo.clients = ['Claude Web', 'Claude Desktop', 'ChatGPT', 'Copilot Studio', 'OpenAI Agent Builder', 'n8n', 'Cursor', 'VS Code', 'Windsurf'];
mcpInfo.localServer = 'npx -y @gojasper/mcp-server (JASPER_API_KEY env)';
mcpInfo.desktopExtension = '.DXT file — one-click install for Claude Desktop';
JSON.stringify(mcpInfo, null, 2);
"""
    },

    # ═══ FASE 7: Pricing + Plans ═══
    "pricing": {
        "phase": 7,
        "label": "Pricing info — plans, limits, features",
        "code": """
const pricing = {
  plans: [
    {name: 'Pro', price: '$69/seat/mo', annual: '$59/seat/mo', users: 1, brandVoices: 2, knowledgeAssets: 5, audiences: 3, api: false, mcp: false},
    {name: 'Business', price: 'Custom (min 12mo)', users: 'unlimited', brandVoices: 'unlimited', knowledge: 'unlimited', api: true, mcp: true, sso: true, scim: true, customAgents: true, imageSuite: true},
  ],
  freeTrial: '7 days Pro',
  apiRateLimit: {
    contentGen: '105 RPM / 6,300/hr',
    readCRUD: '200 RPM / 12,000/hr',
    styles: '60 RPM / 3,600/hr',
    images: '30 RPM / 1,800/hr',
  },
  aiEngine: 'Priority-ordered fallbacks per endpoint (multi-provider)',
  deprecation: 'Minimum 6 months advance notice',
};
JSON.stringify(pricing, null, 2);
"""
    },
}


async def check_bridge(client: httpx.AsyncClient) -> dict | None:
    """Verify bridge is running and browser is connected."""
    try:
        r = await client.get(f"{BRIDGE_URL}/ping", timeout=5)
        return r.json()
    except Exception as e:
        return None


async def run_probe(client: httpx.AsyncClient, probe_id: str, probe_def: dict) -> dict:
    """Execute one probe and return result."""
    try:
        r = await client.post(
            f"{BRIDGE_URL}/exec",
            json={"code": probe_def["code"]},
            timeout=PROBE_TIMEOUT + 10,
        )
        data = r.json()
        return {
            "id": probe_id,
            "phase": probe_def["phase"],
            "label": probe_def["label"],
            "status": "ok" if "error" not in data else "error",
            "bridge_rid": data.get("id"),
            "error": data.get("error"),
            "result": data.get("result"),
            "took_ms": round((time.time() - probe_def.get("_start", 0)) * 1000),
        }
    except Exception as e:
        return {
            "id": probe_id,
            "phase": probe_def["phase"],
            "label": probe_def["label"],
            "status": "error",
            "error": str(e),
        }


async def run_phase(phase: int, client: httpx.AsyncClient) -> list[dict]:
    """Run all probes for a given phase."""
    phase_probes = {k: v for k, v in PROBES.items() if v["phase"] == phase}
    results = []
    for pid, pdef in phase_probes.items():
        pdef["_start"] = time.time()
        label = pdef["label"]
        label_short = label[:60] + "…" if len(label) > 60 else label
        phase_label = f"P{pdef['phase']}"
        pad = 75 - len(label_short)
        print(f"  [{phase_label}] {label_short}{' ' * max(pad, 1)}", end="", flush=True)
        result = await run_probe(client, pid, pdef)
        ok = "✅" if result["status"] == "ok" else f"❌ {result.get('error','?')[:40]}"
        print(f" {ok}  ({result.get('took_ms', '?')}ms)")
        if result["status"] == "ok" and result.get("result"):
            try:
                parsed = json.loads(result["result"])
                result["parsed"] = parsed
            except (json.JSONDecodeError, TypeError):
                pass
        results.append(result)
    return results


def build_report(probe_dir: str, all_results: list[dict]) -> str:
    """Generate a markdown report from probe results."""
    by_phase = {}
    for r in all_results:
        phase = r["phase"]
        by_phase.setdefault(phase, []).append(r)

    report = []
    report.append(f"# Jasper.ai Probe Report — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    report.append(f"\n> Bridge: {BRIDGE_URL} · {len(all_results)} probes · {len(PROBES)} total\n")

    # Summary
    ok = sum(1 for r in all_results if r["status"] == "ok")
    fail = len(all_results) - ok
    report.append(f"## Summary: {ok}/{len(all_results)} succeeded ({fail} failed)\n")

    for phase in sorted(by_phase):
        phase_results = by_phase[phase]
        report.append(f"---\n## Phase {phase}: {phase_results[0]['label'].split(' —')[0]}\n")

        for r in phase_results:
            icon = "✅" if r["status"] == "ok" else "❌"
            report.append(f"### {icon} {r['label']}\n")

            if r["status"] != "ok":
                report.append(f"> **Error:** `{r.get('error', 'unknown')}`\n")
                continue

            parsed = r.get("parsed") or r.get("result")
            if not parsed:
                report.append("_(empty result)_\n")
                continue

            if isinstance(parsed, dict):
                # Show structure overview
                keys = list(parsed.keys())
                report.append(f"**Keys:** `{', '.join(keys[:15])}`  \n")

                # Show counts
                for k, v in parsed.items():
                    if isinstance(v, list):
                        report.append(f"- `{k}`: **{len(v)}** items")
                    elif isinstance(v, dict):
                        report.append(f"- `{k}`: **{len(v)}** keys")
                    elif isinstance(v, (int, float, bool)):
                        report.append(f"- `{k}`: `{v}`")
                    elif isinstance(v, str) and len(v) < 80:
                        report.append(f"- `{k}`: `{v}`")
                report.append("")

                # Show first items from key arrays
                for k, v in parsed.items():
                    if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                        report.append(f"#### `{k}` (sample — first {min(3, len(v))} of {len(v)})\n")
                        report.append("```json")
                        report.append(json.dumps(v[:3], indent=2, ensure_ascii=False))
                        report.append("```\n")
                        break  # Only show first list to keep report contained

    report.append("---\n")
    report.append(f"*Generated {datetime.now().isoformat()} · adsentice Jasper Probe v1.0*")

    return "\n".join(report)


async def main():
    print("🧪 ADSENTICE · Jasper Probe v1.0")
    print(f"   Bridge: {BRIDGE_URL}")
    print()

    # Phase 1: Check bridge
    print("🔌 Checking bridge...")
    async with httpx.AsyncClient(timeout=30) as client:
        ping = await check_bridge(client)
        if ping is None:
            print("❌ Bridge not reachable. Start it first:")
            print("   python3 /media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/MY-CODER/tools/jasper-probe-bridge.py")
            print()
            print("   Then open Jasper in browser and inject client.js:")
            print("   fetch('http://127.0.0.1:8992/client.js').then(r=>r.text()).then(eval)")
            sys.exit(1)

        print(f"   Bridge: {'✅' if ping.get('ok') else '⚠️'}")
        print(f"   DevTools: {'✅ connected' if ping.get('devtools_connected') else '🔴 NOT connected'}")
        print(f"   Origin: {ping.get('client_origin') or 'unknown'}")
        if not ping.get("devtools_connected"):
            print()
            print("   ⚠️  Browser not connected. Open Jasper in Chrome and inject: ")
            print("   fetch('http://127.0.0.1:8992/client.js').then(r=>r.text()).then(eval)")
            print("   (Look for the purple badge in console)")
            proceed = input("\n   Try anyway? [y/N] ").strip().lower()
            if proceed != 'y':
                sys.exit(0)
        print()

        # Create output dir
        today = datetime.now().strftime("%Y-%m-%d")
        probe_dir = f".data/jasper-probes/{today}"
        os.makedirs(probe_dir, exist_ok=True)
        print(f"📁 Output: {probe_dir}/\n")

        # Determine phases to run
        all_phases = sorted(set(p["phase"] for p in PROBES.values()))
        print(f"📋 {len(PROBES)} probes in {len(all_phases)} phases\n")

        all_results = []
        for phase in all_phases:
            phase_probes = [p for p in PROBES.values() if p["phase"] == phase]
            label = PROBES[[k for k, v in PROBES.items() if v["phase"] == phase][0]]["label"].split(" — ")[0]
            print(f"═══ Phase {phase}: {label} ({len(phase_probes)} probes) ═══")
            results = await run_phase(phase, client)
            all_results.extend(results)
            print()

        # Save raw results
        raw_file = os.path.join(probe_dir, "probes-raw.json")
        with open(raw_file, "w") as f:
            json.dump(all_results, f, indent=2, ensure_ascii=False, default=str)
        print(f"💾 Raw results: {raw_file}")

        # Extract parsed data per probe
        for r in all_results:
            if r["status"] == "ok" and r.get("parsed"):
                parsed_file = os.path.join(probe_dir, f"{r['id']}.json")
                with open(parsed_file, "w") as f:
                    json.dump(r["parsed"], f, indent=2, ensure_ascii=False, default=str)

        # Build report
        report = build_report(probe_dir, all_results)
        report_file = os.path.join(probe_dir, "REPORT.md")
        with open(report_file, "w") as f:
            f.write(report)
        print(f"📄 Report: {report_file}")

        # Print key findings
        ok_count = sum(1 for r in all_results if r["status"] == "ok")
        print(f"\n🏁 Done: {ok_count}/{len(all_results)} probes succeeded")
        print(f"   Output: {os.path.abspath(probe_dir)}/")


if __name__ == "__main__":
    asyncio.run(main())
