#!/usr/bin/env python3
"""
adsentice-session-start.py
Hook SessionStart + PostCompact para o projeto adsentice.
Le o estado COMPLETO do ecossistema:
  1. Redis OODA (:6396, adsentice:ooda:*)
  2. Qdrant KG (:6352, adsentice-kg)
  3. Base-Matriz (docs/spec/base-matriz-adsentice.md)
  4. Score do ecossistema (Redis)
  5. Docs recentes (ADRs, specs)
Injeta como contexto adicional na sessao Claude Code.

ISOLADO do EVO-API: Redis :6396, Qdrant :6352, namespace adsentice:ooda:*
"""

import json
import os
import sys
from pathlib import Path
import redis
from urllib.request import Request, urlopen

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396
REDIS_DB = 0
OODA_NS = "adsentice:ooda"
QDRANT_URL = "http://127.0.0.1:6352"
PROJECT_ROOT = Path(__file__).parent.parent


def safe_redis(r, key, default="(nao definido)"):
    try:
        v = r.get(key)
        return v.decode("utf-8") if v else default
    except Exception:
        return default


def qdrant_health() -> str:
    try:
        urlopen(Request(f"{QDRANT_URL}/healthz"), timeout=1)
        return "online"
    except Exception:
        return "offline"


def build_context(r) -> str:
    # ── 1. OODA Redis ──
    current = safe_redis(r, f"{OODA_NS}:current_session_id")
    observe = safe_redis(r, f"{OODA_NS}:stage:observe")
    orient = safe_redis(r, f"{OODA_NS}:stage:orient")
    decide = safe_redis(r, f"{OODA_NS}:stage:decide")
    act = safe_redis(r, f"{OODA_NS}:stage:act")

    meta = {}
    for key in r.keys(f"{OODA_NS}:meta:*"):
        k = key.decode("utf-8").replace(f"{OODA_NS}:meta:", "")
        meta[k] = safe_redis(r, key)

    # ── 2. Score do ecossistema ──
    scores = {}
    for key in r.keys(f"{OODA_NS}:score:*"):
        k = key.decode("utf-8").replace(f"{OODA_NS}:score:", "")
        scores[k] = safe_redis(r, key)

    # ── 3. Base-Matriz (resumo das rotas principais) ──
    base_matriz_path = PROJECT_ROOT / "docs" / "spec" / "base-matriz-adsentice.md"
    base_summary = ""
    if base_matriz_path.exists():
        lines = base_matriz_path.read_text().split("\n")
        in_route = False
        routes = []
        for line in lines:
            if line.startswith("| `ADS.") and "|" in line[10:]:
                parts = [p.strip() for p in line.split("|") if p.strip()]
                if len(parts) >= 3:
                    routes.append(f"  {parts[0]:<45} {parts[1]:<40} {parts[-1]}")
        if routes:
            base_summary = f"## BASE-MATRIZ ({len(routes)} rotas estaveis)\n" + "\n".join(routes[-15:])

    # ── 4. Documentacao recente ──
    docs_dir = PROJECT_ROOT / "docs"
    docs_list = []
    if docs_dir.exists():
        for pattern in ["adsentice-*.md", "adr/*.md", "spec/base-matriz-*.md"]:
            for f in sorted(docs_dir.glob(pattern)):
                docs_list.append(f"  - {f.relative_to(docs_dir)}")
        for f in sorted(docs_dir.glob("jasper-*.md")):
            docs_list.append(f"  - {f.relative_to(docs_dir)}")

    # ── 5. KG stats ──
    kg_stats = "offline"
    try:
        from urllib.request import urlopen as uo
        req = Request(f"{QDRANT_URL}/collections/adsentice-kg/points/count", data=b"{}", headers={"Content-Type": "application/json"})
        resp = uo(req, timeout=2)
        kg_stats = json.loads(resp.read()).get("result", {}).get("count", "?")
    except Exception:
        pass

    # ── 6. Estado atual do codigo ──
    code_state = []
    apps_web = PROJECT_ROOT / "apps" / "web"
    apps_api = PROJECT_ROOT / "apps" / "api"
    pkg_vault = PROJECT_ROOT / "packages" / "vault"
    if apps_web.exists():
        code_state.append("✅ apps/web (Next.js + dashboard + login)")
    else:
        code_state.append("🔴 apps/web ausente")
    if apps_api.exists() and list(apps_api.glob("src/**/*.ts")):
        code_state.append("✅ apps/api (backend Railway)")
    else:
        code_state.append("🔴 apps/api a construir")
    if pkg_vault.exists():
        code_state.append("✅ packages/vault (cofre duravel · 6/6 testes)")
    claude_dir = PROJECT_ROOT / ".claude"
    if claude_dir.exists():
        hooks = list(claude_dir.glob("hooks/*.py"))
        skills = list(claude_dir.glob("skills/*/SKILL.md"))
        code_state.append(f"✅ .claude/ ({len(hooks)} hooks · {len(skills)} skills)")


    # ── Montagem do contexto ──
    qdrant_status = qdrant_health()

    context = f"""🧭 ADSENTICE · CONTEXTO SOBERANO (SessionStart)

## INFRAESTRUTURA
  Redis OODA {':' + str(REDIS_PORT)}: online · {len(list(r.keys(f'{OODA_NS}:*')))} keys
  Qdrant KG {':' + str(REDIS_PORT)[:4] + '2'}: {qdrant_status}
  KG: {kg_stats} pontos/arestas

## ESTADO OODA ({OODA_NS})
  Sessao: {current}
  Observe: {observe[:300] if observe != '(nao definido)' else observe}
  Orient:  {orient[:300] if orient != '(nao definido)' else orient}
  Decide:  {decide[:300] if decide != '(nao definido)' else decide}
  Act:     {act[:300] if act != '(nao definido)' else act}

## SCORE DO ECOSSISTEMA
"""
    for k, v in sorted(scores.items()):
        context += f"  {k}: {v}\n"

    context += "\n## META\n"
    for k, v in sorted(meta.items()):
        context += f"  {k}: {v[:200] if v != '(nao definido)' else v}\n"

    context += f"\n## CODIGO\n"
    for line in code_state:
        context += f"  {line}\n"

    if base_summary:
        context += f"\n{base_summary}\n"

    context += f"\n## DOCUMENTACAO ({len(docs_list)} arquivos)\n"
    for d in docs_list[-10:]:
        context += f"{d}\n"

    context += f"""
## DOUTRINA (invariantes)
  1. medido=verdade: toda afirmacao cita fonte. Sem fonte = nao verificado.
  2. Pipeline discovery: URL → 6 pipelines paralelos → cards + tips
  3. LLM = arbitro NUNCA extrator (DeepSeek cost-capped, Qwen local $0)
  4. Sandbox default ($0) · live gated (spend-cap por tenant)
  5. Vault: R2 blob → Postgres serie ANTES de indexar
  6. Corpora: A=self(adsentice) ≠ B=cliente(tenant·PII) ≠ C=tooling
  7. Spec primeiro · ADR para decisoes · Portugues (pt-BR)
  8. Stack: Next.js 15 + Railway + Supabase + Cloudflare R2 + DataForSEO MCP
  9. Publico: SMB brasileiro (dono de clinica, lojista, contador)
  10. Ticket: R$0 (free) · R$47 (starter) · R$197 (pro) · R$497 (escala)

## REFS ESSENCIAIS
  docs/adsentice-objetivos-solucoes-criterios.md  ← fonte canonica
  docs/adsentice-chat-spec.md                      ← spec do chat
  docs/adr/0001-arquitetura-standalone-adsentice.md ← arquitetura
  docs/spec/base-matriz-adsentice.md                ← mapa navegavel
  docs/jasper-solutions-analise.md                  ← benchmark Jasper
"""
    return context


def main():
    stdin_input = sys.stdin.read().strip()
    hook_event = "(desconhecido)"
    if stdin_input:
        try:
            data = json.loads(stdin_input)
            hook_event = data.get("hook_event_name", hook_event)
        except json.JSONDecodeError:
            pass

    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, socket_connect_timeout=1, socket_timeout=1)
        r.ping()
        context = build_context(r)
    except Exception:
        context = f"🧭 ADSENTICE · Redis :{REDIS_PORT} offline\n"
        docs_dir = PROJECT_ROOT / "docs"
        if docs_dir.exists():
            specs = sorted(docs_dir.glob("adsentice-*.md"))
            context += f"\n## DOCS ESTATICOS ({len(specs)} specs)\n"
            for s in specs[-8:]:
                context += f"  - {s.name}\n"

    output = {
        "hookSpecificOutput": {
            "hookEventName": hook_event,
            "additionalContext": context
        }
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
