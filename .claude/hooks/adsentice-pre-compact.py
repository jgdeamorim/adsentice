#!/usr/bin/env python3
"""
adsentice-pre-compact.py
Hook PreCompact para o projeto adsentice.
Antes do resumo (compact), salva o estado COMPLETO da conversa:
  1. Ultimas mensagens (user + assistant) → Redis :6396
  2. Timestamp do compact → Redis
  3. Session ID + message count → Redis
  4. Atualiza estagio OODA com contexto da sessao → Redis
  5. Persiste score do ecossistema → Redis
  6. INGEST da conversa no Qdrant :6352 (collection adsentice-conversation) → DAG/medido=verdade

ISOLADO do EVO-API: Redis :6396 · Qdrant :6352 · embed :8081
"""

import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import redis

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6396
REDIS_DB = 0
OODA_NS = "adsentice:ooda"


def extract_ooda_update(messages: list) -> dict:
    """
    Tenta extrair atualizacoes de estagio OODA das mensagens do usuario.
    Procura por padroes como: 'vamos focar em X', 'proximo passo e Y', 'objetivo: Z'.
    """
    update = {}
    user_msgs = [m.get("content", "") for m in messages if m.get("role") == "user"]
    all_user = "\n".join(user_msgs[-5:])

    focus_patterns = [
        (r"(?:foco|prioridade|vamos focar)[:\s]+(.+?)(?:\n|$)", "orient"),
        (r"(?:proximo passo|next step|decid[iu])[:\s]+(.+?)(?:\n|$)", "decide"),
        (r"(?:acao|act|fazer agora|implementar)[:\s]+(.+?)(?:\n|$)", "act"),
        (r"(?:objetivo|goal|meta)[:\s]+(.+?)(?:\n|$)", "observe"),
    ]
    for pattern, stage in focus_patterns:
        m = re.search(pattern, all_user, re.IGNORECASE)
        if m:
            update[stage] = m.group(1).strip()[:200]
    return update


def extract_decisions(messages: list) -> list:
    """Extrai mencoes a ADRs, specs, arquivos criados."""
    assistant_msgs = [m.get("content", "") for m in messages if m.get("role") == "assistant"]
    all_assistant = "\n".join(assistant_msgs[-5:])

    decisions = []
    for pattern, label in [
        (r"ADR-\d{4}", "ADR"),
        (r"commit\s+([a-f0-9]{7,})", "commit"),
        (r"(?:criar|criado|salvo)\s+(docs/[^\s]+\.md)", "doc"),
        (r"(?:spec|SPEC)[:\s]+([^\s]+)", "spec"),
    ]:
        for m in re.finditer(pattern, all_assistant, re.IGNORECASE):
            decisions.append(f"{label}: {m.group(0)}")
    return decisions[-8:]


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
                "additionalContext": "⚠️ ADSENTICE · Redis offline · estado NAO persistido."
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

    # ── 1. Salvar metadados do compact ──
    r.setex(f"{OODA_NS}:session:{session_id}:compact_at", 86400 * 30, ts)
    r.setex(f"{OODA_NS}:session:{session_id}:message_count", 86400 * 30, str(len(messages)))

    # ── 2. Salvar ultimas mensagens ──
    if messages:
        last_user = ""
        last_assistant = ""
        for m in reversed(messages):
            if m.get("role") == "user" and not last_user:
                last_user = m.get("content", "")[:400]
            if m.get("role") == "assistant" and not last_assistant:
                last_assistant = m.get("content", "")[:600]
        if last_user:
            r.setex(f"{OODA_NS}:session:{session_id}:last_user_msg", 86400 * 30, last_user)
        if last_assistant:
            r.setex(f"{OODA_NS}:session:{session_id}:last_assistant_msg", 86400 * 30, last_assistant)

    # ── 3. Atualizar estagios OODA com contexto da conversa ──
    ooda_update = extract_ooda_update(messages)
    for stage, value in ooda_update.items():
        r.set(f"{OODA_NS}:stage:{stage}", value)

    # ── 4. Registrar decisoes tomadas na sessao ──
    decisions = extract_decisions(messages)
    if decisions:
        r.setex(f"{OODA_NS}:session:{session_id}:decisions", 86400 * 30, json.dumps(decisions, ensure_ascii=False))

    # ── 5. Atualizar score com base no progresso ──
    if decisions:
        current_score = safe_redis_int(r, f"{OODA_NS}:score:produto")
        new_score = min(current_score + len(decisions), 100)
        r.set(f"{OODA_NS}:score:produto", f"{new_score}/100 · {len(decisions)} decisoes nesta sessao")

    # ── 6. Timestamps globais ──
    r.setex(f"{OODA_NS}:last_compact_at", 86400 * 60, ts)
    r.setex(f"{OODA_NS}:last_compact_session", 86400 * 60, session_id)
    r.set(f"{OODA_NS}:total_compacts", str(safe_redis_int(r, f"{OODA_NS}:total_compacts") + 1))

    # ── 7. INGEST da conversa no Qdrant (GAP 1 · ADR-0002) ──
    ingested = 0
    try:
        ingested = ingest_conversation_to_qdrant(messages, session_id)
    except Exception:
        pass

    stages_updated = list(ooda_update.keys())
    context = (
        f"🧭 ADSENTICE · estado OODA salvo ({OODA_NS})\n"
        f"   compact: {ts}\n"
        f"   mensagens preservadas: {len(messages)}\n"
        f"   ingerido no Qdrant: {ingested} chunks → {CONV_COLLECTION}\n"
        f"   estagios OODA atualizados: {stages_updated if stages_updated else '(nenhum)'}\n"
        f"   decisoes capturadas: {len(decisions)}\n"
        f"   Redis :{REDIS_PORT} · {len(r.keys(f'{OODA_NS}:*'))} keys ativas · Qdrant :6352"
    )

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreCompact",
            "additionalContext": context
        }
    }
    print(json.dumps(output))


def safe_redis_int(r, key: str) -> int:
    try:
        v = r.get(key)
        if v:
            return int(v.decode("utf-8").split("/")[0])
    except Exception:
        pass
    return 0


# ═══════════════════════════════════════════════════════════════════
# CONVERSATION INGEST (GAP 1 · ADR-0002)
# Ingere o delta da conversa no Qdrant :6352 → DAG pode recuperar
# decisoes passadas → medido=verdade.
# ═══════════════════════════════════════════════════════════════════

EMBED_URL = os.environ.get("EMBED_URL", "http://127.0.0.1:8081/embed")
QDRANT_URL = os.environ.get("QDRANT_URL", "http://127.0.0.1:6352")
CONV_COLLECTION = "adsentice-conversation"
BATCH_SIZE = 6


def embed_text(text: str) -> list[float]:
    """Embed via :8081 (mpnet 768d)."""
    try:
        req = Request(
            EMBED_URL,
            data=json.dumps({"texts": [text]}).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=10)
        return json.loads(resp.read()).get("vectors", [[]])[0]
    except Exception:
        return []


def ingest_conversation_to_qdrant(messages: list, session_id: str):
    """
    Ingere mensagens da conversa no Qdrant :6352.
    Cada mensagem relevante vira 1 ponto com payload {text, role, session_id, ts}.
    """
    if not messages:
        return 0

    embedded = 0
    batch_vecs = []
    batch_points = []

    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "").strip()
        if not content or len(content) < 30:
            continue

        # Embed cada mensagem
        vec = embed_text(content[:800])
        if not vec:
            continue

        point_id = hashlib.sha256(f"{session_id}:{embedded}:{content[:80]}".encode()).hexdigest()[:32]
        payload = {
            "text": content[:600],
            "role": role,
            "session_id": session_id,
            "ts": int(time.time()),
            "tag": "adsentice",
            "source": f"session:{session_id}",
        }

        batch_vecs.append(vec)
        batch_points.append({"id": point_id, "vector": vec, "payload": payload})

        if len(batch_points) >= BATCH_SIZE:
            _qdrant_upsert(batch_points)
            embedded += len(batch_points)
            batch_vecs = []
            batch_points = []

    if batch_points:
        _qdrant_upsert(batch_points)
        embedded += len(batch_points)

    return embedded


def _qdrant_upsert(points: list):
    """Envia batch de pontos para o Qdrant."""
    try:
        body = json.dumps({"points": points}).encode()
        req = Request(
            f"{QDRANT_URL}/collections/{CONV_COLLECTION}/points?wait=true",
            data=body,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        urlopen(req, timeout=15)
    except Exception:
        pass


if __name__ == "__main__":
    main()
