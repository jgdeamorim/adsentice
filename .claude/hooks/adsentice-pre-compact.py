#!/usr/bin/env python3
"""
adsentice-pre-compact.py
Hook PreCompact para o projeto adsentice.
Antes do resumo (compact), salva o estado atual da conversa no Redis adsentice (:6396)
+

 preserva o contexto OODA para a próxima sessão.

ISOLADO do EVO-API: Redis :6396, namespace adsentice:ooda:*
"""

import json
import sys
import redis
from datetime import datetime, timezone

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396
REDIS_DB = 0
OODA_NS = "adsentice:ooda"

def main():
    try:
        stdin_data = sys.stdin.read().strip()
    except Exception:
        stdin_data = ""

    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, socket_connect_timeout=1, socket_timeout=1)
        r.ping()
    except Exception:
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreCompact",
                "additionalContext": "⚠️ adsentice Redis offline · estado OODA NÃO persistido neste compact."
            }
        }
        print(json.dumps(output))
        return

    ts = datetime.now(timezone.utc).isoformat()

    try:
        data = json.loads(stdin_data) if stdin_data else {}
    except json.JSONDecodeError:
        data = {}

    messages = data.get("messages", [])
    session_id = data.get("session_id", "unknown")

    r.setex(f"{OODA_NS}:session:{session_id}:compact_at", 86400 * 7, ts)
    r.setex(f"{OODA_NS}:session:{session_id}:message_count", 86400 * 7, str(len(messages)))

    if messages:
        last_user = ""
        last_assistant = ""
        for m in reversed(messages):
            if m.get("role") == "user" and not last_user:
                last_user = m.get("content", "")[:300]
            if m.get("role") == "assistant" and not last_assistant:
                last_assistant = m.get("content", "")[:500]
        if last_user:
            r.setex(f"{OODA_NS}:session:{session_id}:last_user_msg", 86400 * 7, last_user)
        if last_assistant:
            r.setex(f"{OODA_NS}:session:{session_id}:last_assistant_msg", 86400 * 7, last_assistant)

    r.setex(f"{OODA_NS}:last_compact_at", 86400 * 30, ts)
    r.setex(f"{OODA_NS}:last_compact_session", 86400 * 30, session_id)

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreCompact",
            "additionalContext": f"🧭 ADSENTICE · estado OODA salvo ({OODA_NS}) · compact {ts} · {len(messages)} mensagens preservadas."
        }
    }
    print(json.dumps(output))

if __name__ == "__main__":
    main()
