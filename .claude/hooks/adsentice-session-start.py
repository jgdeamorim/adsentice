#!/usr/bin/env python3
"""
adsentice-session-start.py · LEAN (~1k tokens)
Hook SessionStart + PostCompact. Injeta SÓ o essencial:
  - BOA score + veredito
  - OODA act (próximo passo)
  - Handoff mais recente (ponteiro)
  - Como puxar o resto (MCP tools + Redis + docs)

O catálogo completo (docs, doutrinas, base-matriz, scores, código)
está no CLAUDE.md + MCP servers + Qdrant. Puxar sob demanda, não empurrar.

ISOLADO do EVO-API: Redis :6396 · namespace adsentice:*
"""

import json, os, sys, time
import redis

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396


def safe_redis(r, key, default="—"):
    try:
        # decode_responses=True → r.get() já retorna str (NUNCA .decode() aqui —
        # bug histórico: str.decode() → AttributeError → todas as chaves viravam "—")
        v = r.get(key)
        return v if v else default
    except Exception:
        return default


def latest_handoff(r) -> str:
    """Retorna o handoff mais recente do Redis ou filesystem."""
    v = safe_redis(r, "adsentice:handoff:next_number")
    num = int(v) - 1 if v.isdigit() else None
    import glob
    files = sorted(glob.glob("docs/handoff/active/HANDOFF-*.md"))
    if files:
        return os.path.basename(files[-1])
    return f"(v{num})" if num else "(nenhum)"


def build_context(r) -> str:
    boa = safe_redis(r, "adsentice:boa:score")
    verdict = safe_redis(r, "adsentice:boa:verdict")
    act = safe_redis(r, "adsentice:ooda:stage:act")
    decide = safe_redis(r, "adsentice:ooda:stage:decide")
    session = safe_redis(r, "adsentice:ooda:current_session_id")
    handoff = latest_handoff(r)

    return f"""🧭 ADSENTICE · BOA {boa} {verdict}
act:  {act[:200]}
handoff: {handoff}

🔍 Puxar sob demanda (não está no contexto):
  MCP: adsentice_status · adsentice_kg_stats · adsentice_conversation_status
  Redis: GET adsentice:ooda:stage:observe/orient/decide · adsentice:ooda:meta:*
  Docs: CLAUDE.md · docs/spec/base-matriz-adsentice.md · docs/adr/
"""


def main():
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, socket_connect_timeout=1, socket_timeout=1, decode_responses=True)
        r.ping()
        context = build_context(r)
    except Exception:
        context = "🧭 ADSENTICE · Redis offline · ler CLAUDE.md"

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": context,
        }
    }))


if __name__ == "__main__":
    main()
