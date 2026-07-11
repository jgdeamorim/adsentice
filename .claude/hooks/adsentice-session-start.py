#!/usr/bin/env python3
"""
adsentice-session-start.py
Hook SessionStart + PostCompact para o projeto adsentice.
Lê o estado OODA do Redis adsentice (:6396) e injeta como contexto na sessão Claude Code.

ISOLADO do EVO-API: Redis :6396 (adsentice), namespace adsentice:ooda:*
Embed compartilhado: :8081 (stateless, read-only)
"""

import json
import sys
import redis
from pathlib import Path

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396
REDIS_DB = 0
OODA_NS = "adsentice:ooda"

def safe_redis(r, key, default="(não definido)"):
    try:
        v = r.get(key)
        return v.decode("utf-8") if v else default
    except Exception:
        return default

def build_context(r):
    meta = {}
    for key in r.keys(f"{OODA_NS}:meta:*"):
        k = key.decode("utf-8").replace(f"{OODA_NS}:meta:", "")
        meta[k] = safe_redis(r, key)

    current = safe_redis(r, f"{OODA_NS}:current_session_id")
    observe = safe_redis(r, f"{OODA_NS}:stage:observe")
    orient = safe_redis(r, f"{OODA_NS}:stage:orient")
    decide = safe_redis(r, f"{OODA_NS}:stage:decide")
    act = safe_redis(r, f"{OODA_NS}:stage:act")

    docs_path = Path(__file__).parent.parent.parent / "docs"
    specs = sorted(docs_path.glob("adsentice-*.md")) if docs_path.exists() else []
    adrs = sorted((docs_path / "adr").glob("*.md")) if (docs_path / "adr").exists() else []

    context = f"""🧭 ADSENTICE · CONTEXTO SOBERANO (SessionStart)

## ESTADO OODA ({OODA_NS})
- Sessão atual: {current}
- Observe: {observe[:250] if observe != '(não definido)' else observe}
- Orient:  {orient[:250] if orient != '(não definido)' else orient}
- Decide:  {decide[:250] if decide != '(não definido)' else decide}
- Act:     {act[:250] if act != '(não definido)' else act}

## META
"""
    for k, v in sorted(meta.items()):
        context += f"- {k}: {v[:200] if v != '(não definido)' else v}\n"

    context += f"\n## DOCUMENTAÇÃO ({len(specs)} specs · {len(adrs)} ADRs)\n"
    for s in specs[-6:]:
        context += f"- {s.name}\n"
    if adrs:
        for a in adrs[-4:]:
            context += f"- {a.name}\n"

    context += f"""
## DOUTRINA (invariantes)
- medido=verdade: toda afirmação cita fonte. Sem fonte = não verificado.
- pipeline discovery: URL → 6 pipelines paralelos → cards + tips
- LLM = árbitro NUNCA extrator (DeepSeek cost-capped, Qwen local $0)
- Sandbox default ($0) · live gated (spend-cap por tenant)
- Vault: R2 blob → Postgres série ANTES de indexar
- Corpora: A=self(adsentice) ≠ B=cliente(tenant·PII) ≠ C=tooling
- Portas: Redis :6396 · Qdrant :6352 · Embed :8081 (compart.)
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
        context = f"🧭 ADSENTICE · Redis adsentice (:6396) offline · fallback: docs/ estáticos\n"
        docs_path = Path(__file__).parent.parent.parent / "docs"
        if docs_path.exists():
            specs = sorted(docs_path.glob("adsentice-*.md"))
            for s in specs[-6:]:
                context += f"- {s.name}\n"

    output = {
        "hookSpecificOutput": {
            "hookEventName": hook_event,
            "additionalContext": context
        }
    }
    print(json.dumps(output))

if __name__ == "__main__":
    main()
